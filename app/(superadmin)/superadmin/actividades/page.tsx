import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SUPERADMIN } from "@/lib/auth-guard";
import ActividadesList from "@/components/actividades/ActividadesList";

export default async function SuperAdminActividadesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.rol !== SUPERADMIN) redirect("/dashboard");

  return (
    <ActividadesList
      baseUrl="/superadmin/actividades"
      apiOrganizaciones="/api/superadmin/organizaciones"
      showOrgFilter
    />
  );
}