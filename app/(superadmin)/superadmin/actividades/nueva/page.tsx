import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SUPERADMIN } from "@/lib/auth-guard";
import ActividadForm from "@/components/actividades/ActividadForm";

export default async function NuevaActividadPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.rol !== SUPERADMIN) redirect("/dashboard");

  return (
    <ActividadForm
      modo="crear"
      basePath="/superadmin/actividades"
      mostrarOrgSelector
    />
  );
}