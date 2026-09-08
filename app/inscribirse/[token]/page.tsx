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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Encabezado */}
          <div className="bg-blue-600 px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                <BookOpen size={22} />
              </span>
              <div>
                <h1 className="text-xl font-bold leading-tight">
                  {actividad.titulo}
                </h1>
                <p className="text-sm text-blue-100 mt-0.5">
                  {actividad.tipo_actividad.nombre}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-100">
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
              <div className="flex flex-col items-center text-center py-8 text-gray-400">
                <Lock size={40} className="mb-3" />
                <p className="text-gray-600 font-medium">
                  Las inscripciones están cerradas
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Esta actividad no acepta inscripciones en este momento.
                </p>
              </div>
            ) : (
              <>
                {actividad.descripcion && (
                  <p className="text-sm text-gray-600 mb-5">
                    {actividad.descripcion}
                  </p>
                )}
                {actividad.instructor_nombres && (
                  <div className="flex items-center gap-3 mb-5 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                    <span className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                      <User size={18} />
                    </span>
                    <div>
                      <p className="text-xs text-gray-500">Instructor</p>
                      <p className="text-sm font-medium text-gray-800">
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
        <p className="text-center text-xs text-gray-400 mt-4">
          Sistema de Gestión de Actividades Formativas
        </p>
      </div>
    </div>
  );
}