import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  BookOpen,
  Users,
  User,
  Building2,
  Lock,
} from "lucide-react";
import FormularioInscripcion from "@/components/inscripciones/FormularioInscripcion";

export default async function InscribirsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenTrim = token.trim();
  if (!tokenTrim) notFound();

  const actividad = await prisma.actividadFormativa.findUnique({
    where: { token_inscripcion: tokenTrim },
    include: {
      tipo_actividad: { select: { nombre: true } },
      organizacion: { select: { nombre: true } },
      _count: {
        select: {
          inscripciones: {
            where: { estado: "Inscrita" },
          },
        },
      },
    },
  });

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
            {!inscripcionesAbiertas ? (
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
            ) : (
              <>
                {actividad.descripcion && (
                  <p className="mb-5 text-sm text-slate-600">
                    {actividad.descripcion}
                  </p>
                )}
                {actividad.instructor_nombres && (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                      <User size={18} />
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Instructor</p>
                      <p className="text-sm font-medium text-slate-800">
                        {actividad.instructor_nombres}
                      </p>
                    </div>
                  </div>
                )}
                <FormularioInscripcion token={tokenTrim} />
              </>
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