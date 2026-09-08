import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageActividades } from "@/lib/auth-guard";
import ActividadesList from "@/components/actividades/ActividadesList";

export default async function DashboardActividadesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!(await canManageActividades())) redirect("/dashboard");

  return (
    <ActividadesList baseUrl="/dashboard/actividades" />
  );
}