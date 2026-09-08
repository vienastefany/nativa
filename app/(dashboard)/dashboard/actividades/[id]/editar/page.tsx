import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageActividades } from "@/lib/auth-guard";
import ActividadForm from "@/components/actividades/ActividadForm";

export default async function EditarActividadDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!(await canManageActividades())) redirect("/dashboard");

  const { id } = await params;
  const actividadId = Number(id);
  if (!Number.isInteger(actividadId)) notFound();

  const actividad = await prisma.actividadFormativa.findUnique({
    where: { id: actividadId },
    include: {
      organizacion: { select: { id: true, nombre: true } },
    },
  });

  if (!actividad) notFound();

  // Admin/Subadm solo puede editar actividades de su organización
  if (
    session.user.organizacionId != null &&
    actividad.organizacion_id !== session.user.organizacionId
  ) {
    redirect("/dashboard/actividades");
  }

  return (
    <ActividadForm
      modo="editar"
      basePath="/dashboard/actividades"
      organizacionIdFijo={session.user.organizacionId}
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
        organizacion: actividad.organizacion,
      }}
    />
  );
}