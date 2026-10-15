import type { PublicSession } from "@/lib/db/attendance";
export default function InformacionSesion({ sesion }: { sesion: PublicSession }) {
  const safeLink = sesion.enlace_virtual && /^https?:\/\//i.test(sesion.enlace_virtual) ? sesion.enlace_virtual : null;
  return <div className="mb-6">
    <p className="text-sm font-medium text-primary-600">{sesion.organizacion}</p>
    <h1 className="mt-2 text-2xl font-bold text-slate-900">{sesion.titulo}</h1>
    <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
      <div><dt className="text-slate-500">Fecha</dt><dd className="mt-1 font-medium">{sesion.fecha.split("-").reverse().join("/")}</dd></div>
      <div><dt className="text-slate-500">Horario</dt><dd className="mt-1 font-medium">{sesion.hora_inicio.slice(0, 5)} – {sesion.hora_fin.slice(0, 5)}</dd></div>
      <div><dt className="text-slate-500">Modalidad</dt><dd className="mt-1 font-medium">{sesion.modalidad}</dd></div>
      <div><dt className="text-slate-500">Estado</dt><dd className="mt-1 font-medium">{sesion.estado.replaceAll("_", " ")}</dd></div>
      {sesion.lugar && <div className="col-span-2"><dt className="text-slate-500">Lugar</dt><dd className="mt-1 font-medium">{sesion.lugar}</dd></div>}
    </dl>
    {safeLink && sesion.estado !== "Cancelada" && sesion.actividad_estado !== "Cancelada" && <a className="btn btn-secondary mt-4" href={safeLink} target="_blank" rel="noreferrer">Abrir sesión virtual</a>}
  </div>;
}
