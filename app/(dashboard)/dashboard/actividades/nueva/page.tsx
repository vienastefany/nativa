import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageActividades } from "@/lib/auth-guard";
import ActividadForm from "@/components/actividades/ActividadForm";

export default async function NuevaActividadDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!(await canManageActividades())) redirect("/dashboard");

  return (
    <ActividadForm
      modo="crear"
      basePath="/dashboard/actividades"
      organizacionIdFijo={session.user.organizacionId}
      initialData={{
        organizacion: {
          id: session.user.organizacionId ?? 0,
          nombre: session.user.organizacionNombre ?? "",
        },
      }}
    />
  );
}