"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Copy, Download, RefreshCw, X } from "lucide-react";

interface Panel {
  enlace: string | null; enlace_asistencia: string | null; qr: string | null; activo: boolean; hasta: string | null;
  asistentes: { participante_id: number; nombres: string; apellidos: string; dni: string;
    estado: string; inscripcion_estado: string; fecha_hora_registro: string | null; metodo: string | null }[];
}
export default function SesionAsistencia({ sesionId, fecha, onClose }: { sesionId: number; fecha: string; onClose: () => void }) {
  const [data, setData] = useState<Panel | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [now, setNow] = useState(() => Date.now());
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/sesiones/${sesionId}/asistencia`, { signal, cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result); setError(""); setNow(Date.now());
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "No se pudo actualizar la tabla"); }
  }, [sesionId]);
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void load(controller.signal), 0);
    const timer = setInterval(() => { if (!document.hidden) void load(controller.signal); }, 5000);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [load]);
  async function action(accion: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`/api/sesiones/${sesionId}/asistencia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, minutos: minutes }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result); setNow(Date.now());
      setNotice(accion === "activar" ? "QR habilitado. Los participantes ya pueden registrar su asistencia." : accion === "cerrar" ? "Registro de asistencia cerrado." : "Enlace de sesión preparado.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo completar la acción"); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(data!.enlace!); setNotice("Enlace de sesión copiado."); }
    catch { setError("No se pudo copiar. Selecciona y copia el enlace que aparece abajo."); }
  }
  const active = data?.activo && data.hasta && new Date(data.hasta).getTime() > now;
  const present = data?.asistentes.filter(p => p.estado === "Presente").length ?? 0;
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attendance-title">
    <div className="mx-auto my-6 max-w-5xl rounded-2xl bg-white p-5 shadow-xl sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 id="attendance-title" className="section-title">Compartir sesión y asistencia</h2><p className="text-sm text-slate-500">Sesión del {fecha}</p></div>
        <button onClick={onClose} className="icon-btn" aria-label="Cerrar asistencia"><X size={22} /></button>
      </div>
      {error && <p role="alert" className="alert alert-error mb-4">{error}</p>}
      {notice && <p role="status" className="alert alert-success mb-4">{notice}</p>}
      {!data ? <p className="py-8">Cargando asistencia…</p> : <>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-2 font-semibold">1. Comparte la sesión</h3>
            <p className="mb-3 text-sm text-slate-500">Envía este enlace a los participantes para consultar fecha, horario y lugar. La actividad debe estar publicada.</p>
            {data.enlace ? <><input aria-label="Enlace de sesión" readOnly value={data.enlace} onFocus={e => e.target.select()} className="input mb-3" />
              <div className="flex flex-wrap gap-2"><button className="btn btn-secondary" onClick={copy}><Copy size={16} />Copiar enlace</button><a className="btn btn-secondary" href={data.enlace} target="_blank" rel="noreferrer">Ver sesión</a></div></>
              : <button className="btn btn-secondary" disabled={busy} onClick={() => action("compartir")}>Generar enlace de sesión</button>}
          </section>
          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-2 font-semibold">2. Habilita el QR de asistencia</h3>
            <p className="mb-3 text-sm text-slate-500">El participante escanea el QR con la cámara de su teléfono. Debe estar inscrito en la actividad.</p>
            <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Duración<select className="input mt-1" value={minutes} onChange={e => setMinutes(Number(e.target.value))}>
              {[15, 30, 60, 120, 240, 480].map(m => <option key={m} value={m}>{m} minutos</option>)}
            </select></label><button className="btn btn-primary" disabled={busy} onClick={() => action("activar")}>{active ? "Renovar QR" : "Activar QR"}</button>
            {active && <button className="btn btn-secondary" disabled={busy} onClick={() => action("cerrar")}>Cerrar registro</button>}</div>
            <p className={`mt-3 text-sm font-medium ${active ? "text-emerald-700" : "text-slate-500"}`}>{active ? `Habilitado hasta ${new Date(data.hasta!).toLocaleTimeString("es-PE")}` : "Registro cerrado"}</p>
            {active && data.qr && <div className="mt-3 flex flex-col items-center">
              <Image src={data.qr} alt="QR para registrar asistencia a esta sesión" width={280} height={280} unoptimized />
              <a href={data.qr} download={`asistencia-sesion-${sesionId}.png`} className="btn btn-secondary"><Download size={16} />Descargar QR</a>
            </div>}
          </section>
        </div>
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Asistencia de participantes</h3><p className="text-sm text-slate-500">{present} presentes · Se actualiza cada 5 segundos.</p></div>
            <button className="btn btn-secondary" onClick={() => load()}><RefreshCw size={16} />Actualizar</button></div>
          <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Participante</th><th>DNI</th><th>Asistencia</th><th>Fecha y hora</th><th>Método</th></tr></thead>
            <tbody>{data.asistentes.map(p => <tr key={p.participante_id}><td>{p.apellidos}, {p.nombres}{p.inscripcion_estado !== "Inscrita" && <span className="block text-xs text-slate-500">Inscripción cancelada</span>}</td><td>{p.dni}</td>
              <td><span className={`badge ${p.estado === "Presente" ? "badge-success" : "badge-muted"}`}>{p.estado}</span></td><td>{p.fecha_hora_registro ? new Date(p.fecha_hora_registro).toLocaleString("es-PE") : "—"}</td><td>{p.metodo ?? "—"}</td></tr>)}
              {!data.asistentes.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Todavía no hay participantes inscritos.</td></tr>}
            </tbody></table></div>
        </section>
      </>}
    </div>
  </div>;
}
