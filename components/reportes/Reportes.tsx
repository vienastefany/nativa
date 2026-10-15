"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, FileText, Filter } from "lucide-react";
import type { AttendanceReport } from "@/lib/db/reports";

export default function Reportes({ global, organizaciones, actividades }: {
  global: boolean; organizaciones: { id: number; nombre: string }[];
  actividades: { id: number; titulo: string; organizacion_id: number }[];
}) {
  const [filters, setFilters] = useState({ organizacion_id: "", actividad_id: "", desde: "", hasta: "" });
  const [applied, setApplied] = useState("");
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const load = useCallback(async (query: string, signal?: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/reportes?${query}`, { signal, cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data); setApplied(query); setPage(0);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar el reporte"); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load("", controller.signal), 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [load]);
  async function download(format: "xlsx" | "pdf") {
    setDownloading(true); setError("");
    try {
      const res = await fetch(`/api/reportes?${applied}&formato=${format}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a"); link.href = url; link.download = `reporte-asistencia.${format}`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo descargar el reporte"); }
    finally { setDownloading(false); }
  }
  const choices = actividades.filter(a => !filters.organizacion_id || a.organizacion_id === Number(filters.organizacion_id));
  const pageCount = Math.max(1, Math.ceil((report?.sesiones.length ?? 0) / 25));
  const rows = report?.sesiones.slice(page * 25, (page + 1) * 25) ?? [];
  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="page-title">Reportes de asistencia</h1><p className="mt-1 text-sm text-slate-500">{global ? "Consulta las sesiones de todas las organizaciones." : "Consulta las sesiones y la participación de tu organización."}</p></div>
      <div className="flex gap-2"><button className="btn btn-secondary" disabled={!report || busy || downloading || !!error} onClick={() => download("xlsx")}><Download size={16} />Excel</button><button className="btn btn-secondary" disabled={!report || busy || downloading || !!error} onClick={() => download("pdf")}><FileText size={16} />PDF</button></div></div>
    <form className="card mb-6 flex flex-wrap items-end gap-4 p-5" onSubmit={e => { e.preventDefault(); void load(new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()); }}>
      {global && <label className="min-w-44 flex-1 text-sm font-medium">Organización<select aria-label="Organización" className="input mt-1" value={filters.organizacion_id} onChange={e => setFilters({ ...filters, organizacion_id: e.target.value, actividad_id: "" })}><option value="">Todas</option>{organizaciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>}
      <label className="min-w-48 flex-1 text-sm font-medium">Actividad<select aria-label="Actividad" className="input mt-1" value={filters.actividad_id} onChange={e => setFilters({ ...filters, actividad_id: e.target.value })}><option value="">Todas</option>{choices.map(a => <option key={a.id} value={a.id}>{a.titulo}</option>)}</select></label>
      <label className="text-sm font-medium">Desde<input type="date" className="input mt-1" value={filters.desde} onChange={e => setFilters({ ...filters, desde: e.target.value })} /></label>
      <label className="text-sm font-medium">Hasta<input type="date" className="input mt-1" min={filters.desde || undefined} value={filters.hasta} onChange={e => setFilters({ ...filters, hasta: e.target.value })} /></label>
      <button className="btn btn-primary" disabled={busy}><Filter size={16} />{busy ? "Consultando…" : "Aplicar filtros"}</button>
    </form>
    {error && <p role="alert" className="alert alert-error mb-4">{error}</p>}
    {report && <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[
        ["Sesiones", report.resumen.sesiones], ["Participantes únicos", report.resumen.participantes_unicos],
        ["Registros presentes", report.resumen.presentes], ["Asistencia", `${report.resumen.porcentaje}%`],
      ].map(([title, value]) => <div key={title} className="card p-5"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>)}</div>
      <p className="mb-3 text-sm text-slate-500">El rango corresponde a la fecha de cada sesión. Convocados incluye inscritos activos y asistencias históricas de inscripciones canceladas. Una persona se cuenta una sola vez en participantes únicos. Pendiente no significa ausente.</p>
      <div className="card overflow-x-auto"><table className="data-table"><thead><tr>{global && <th>Organización</th>}<th>Actividad</th><th>Fecha y hora</th><th>Estado</th><th>Convocados</th><th>Presentes</th><th>Ausentes</th><th>Pendientes</th></tr></thead>
        <tbody>{rows.map(s => <tr key={s.sesion_id}>{global && <td>{s.organizacion}</td>}<td><Link className="font-medium text-primary-600 hover:underline" href={`${global ? "/superadmin" : "/dashboard"}/actividades/${s.actividad_id}`}>{s.titulo}</Link></td><td className="whitespace-nowrap">{s.fecha.split("-").reverse().join("/")}<span className="block text-xs text-slate-500">{s.hora_inicio.slice(0, 5)} · Sesión {s.sesion_id}</span></td><td>{s.estado.replaceAll("_", " ")}</td><td>{s.convocados}</td><td className="font-semibold text-emerald-700">{s.presentes}</td><td>{s.ausentes}</td><td>{s.pendientes}</td></tr>)}
        {!rows.length && <tr><td colSpan={global ? 8 : 7} className="p-8 text-center text-slate-500">No hay sesiones para los filtros seleccionados.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>Página {page + 1} de {pageCount} · {report.sesiones.length} sesiones</span><div className="flex gap-2"><button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><button className="btn btn-secondary" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>
    </>}
  </div>;
}
