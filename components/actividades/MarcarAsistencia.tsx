"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function MarcarAsistencia({ token }: { token: string }) {
  const [dni, setDni] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ participante: string; fecha_hora_registro: string } | null>(null);
  const mark = useCallback(async (document?: string, signal?: AbortSignal) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/asistencia/${token}`, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(document ? { dni: document } : {}) });
      const data = await res.json();
      if (res.status === 401) return;
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : "No se pudo confirmar la asistencia"); }
    finally { if (!signal?.aborted) setBusy(false); }
  }, [token]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void mark(undefined, controller.signal), 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [mark]);
  if (result) return <div className="rounded-xl bg-emerald-50 p-6 text-center text-emerald-900" role="status">
    <CheckCircle2 className="mx-auto mb-3" size={40} /><h2 className="text-xl font-semibold">Asistencia confirmada</h2>
    <p className="mt-2">{result.participante}</p><p className="mt-1 text-sm">{new Date(result.fecha_hora_registro).toLocaleString("es-PE")}</p>
    <p className="mt-3 text-sm">Ya puedes cerrar esta página.</p>
    <button className="mt-4 text-sm underline" onClick={() => { setResult(null); setDni(""); }}>Registrar a otro participante</button>
  </div>;
  return <form onSubmit={e => { e.preventDefault(); void mark(dni); }} className="space-y-4">
    {busy ? <p role="status">Comprobando tu inscripción y registrando asistencia…</p> : <>
      <h2 className="text-lg font-semibold">Confirma tu asistencia</h2><p className="text-sm text-slate-600">Si te inscribiste desde otro navegador, ingresa tu DNI. Este navegador te recordará durante 30 días.</p>
      {error && <p role="alert" className="alert alert-error">{error}</p>}
      <label className="label" htmlFor="attendance-dni">DNI</label><input className="input" id="attendance-dni" inputMode="numeric" autoComplete="off" pattern="[0-9]{8}" maxLength={8} required value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ""))} />
      <button className="btn btn-primary w-full" disabled={busy}>Confirmar asistencia</button>
    </>}
  </form>;
}
