import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageActividades } from "@/lib/auth-guard";
import ActividadDetalle from "@/components/actividades/ActividadDetalle";

export default async function DetalleActividadDashboardPage({
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

  return (
    <ActividadDetalle
      actividadId={actividadId}
      basePath="/dashboard/actividades"
    />
  );
}