import { getActivityByToken, getActivityDetail } from "@/lib/db/repository";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Users,
  User,
  Building2,
  Lock,
  CalendarDays,
  Clock3,
  MapPin,
  Video,
} from "lucide-react";
import FormularioInscripcion from "@/components/inscripciones/FormularioInscripcion";
import { dateToFechaStr, dateToHoraStr } from "@/lib/actividades";

export default async function InscribirsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenTrim = token.trim();
  if (!tokenTrim) notFound();

  const actividadBase = await getActivityByToken(tokenTrim);

  if (!actividadBase || actividadBase.estado === "Borrador") notFound();
  const actividad = await getActivityDetail(actividadBase.id);
  if (!actividad) notFound();

  const inscripcionesAbiertas =
    actividad.estado === "Publicada" &&
    actividad.inscripciones_abiertas;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="card overflow-hidden rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.1)]">
          {/* Encabezado */}
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-sm">
                <BookOpen size={22} />
              </span>
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  {actividad.titulo}
                </h1>
                <p className="mt-0.5 text-sm text-primary-100">
                  {actividad.tipo_actividad.nombre}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-100">
              <span className="inline-flex items-center gap-1.5">
                <Building2 size={15} />
                {actividad.organizacion.nombre}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users size={15} />
                {actividad._count.inscripciones} inscrito
                {actividad._count.inscripciones !== 1 ? "s" : ""}
                {actividad.capacidad
                  ? ` / ${actividad.capacidad}`
                  : ""}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="px-6 py-6">
            {actividad.descripcion && (
              <p className="mb-5 whitespace-pre-line text-sm text-slate-600">
                {actividad.descripcion}
              </p>
            )}
            {(actividad.instructor_nombres || actividad.instructor_apellidos) && (
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                  <User size={18} />
                </span>
                <div>
                  <p className="text-xs text-slate-500">Instructor</p>
                  <p className="text-sm font-medium text-slate-800">
                    {[actividad.instructor_nombres, actividad.instructor_apellidos].filter(Boolean).join(" ")}
                  </p>
                  {actividad.instructor_profesion && (
                    <p className="text-xs text-slate-500">{actividad.instructor_profesion}</p>
                  )}
                </div>
              </div>
            )}
            {actividad.sesiones.length > 0 && (
              <section className="mb-6" aria-labelledby="sesiones-heading">
                <h2 id="sesiones-heading" className="mb-3 text-base font-semibold text-slate-800">
                  Fechas y sesiones
                </h2>
                <ul className="space-y-3">
                  {actividad.sesiones.map((sesion) => {
                    const enlaceVirtual = sesion.enlace_virtual && /^https?:\/\//i.test(sesion.enlace_virtual)
                      ? sesion.enlace_virtual
                      : null;
                    return (
                      <li key={sesion.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={15} />
                            {dateToFechaStr(sesion.fecha).split("-").reverse().join("/")}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={15} />
                            {dateToHoraStr(sesion.hora_inicio)}–{dateToHoraStr(sesion.hora_fin)}
                          </span>
                          <span>{sesion.modalidad}</span>
                          {sesion.estado === "Cancelada" && (
                            <span className="font-medium text-rose-600">Cancelada</span>
                          )}
                        </div>
                        {sesion.lugar && (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPin size={15} />
                            {sesion.lugar}
                          </p>
                        )}
                        {enlaceVirtual && sesion.estado !== "Cancelada" && (
                          <a className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 underline" href={enlaceVirtual} target="_blank" rel="noreferrer">
                            <Video size={15} />
                            Abrir sesión virtual
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {inscripcionesAbiertas ? (
              <FormularioInscripcion token={tokenTrim} />
            ) : (
              <div className="empty-state py-8">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Lock size={24} />
                </div>
                <p className="font-medium text-slate-700">
                  Las inscripciones están cerradas
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Esta actividad no acepta inscripciones en este momento.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Sistema de Gestión de Actividades Formativas
        </p>
      </div>
    </div>
  );
}