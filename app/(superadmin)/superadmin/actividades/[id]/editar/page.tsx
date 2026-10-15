import { getActivity } from "@/lib/db/repository";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SUPERADMIN } from "@/lib/auth-guard";
import ActividadForm from "@/components/actividades/ActividadForm";

export default async function EditarActividadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.rol !== SUPERADMIN) redirect("/dashboard");

  const { id } = await params;
  const actividadId = Number(id);
  if (!Number.isInteger(actividadId)) notFound();

  const actividad = await getActivity(actividadId);

  if (!actividad) notFound();

  return (
    <ActividadForm
      modo="editar"
      basePath="/superadmin/actividades"
      mostrarOrgSelector
      organizacionId={actividad.id}
      initialData={{
        titulo: actividad.titulo,
        descripcion: actividad.descripcion,
        tipo_actividad_id: actividad.tipo_actividad_id,
        instructor_nombres: actividad.instructor_nombres,
        instructor_apellidos: actividad.instructor_apellidos,
        instructor_profesion: actividad.instructor_profesion,
        capacidad: actividad.capacidad,
        inscripciones_abiertas: actividad.inscripciones_abiertas,
        organizacion_id: actividad.organizacion_id,
      }}
    />
  );
}