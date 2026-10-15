import { redirect } from "next/navigation";
import { getSessionUser, ADMINISTRADOR, SUPERADMIN } from "@/lib/auth-guard";
import { listActivities, listOrganizations } from "@/lib/db/repository";
import Reportes from "./Reportes";

export default async function PaginaReportes({ global }: { global: boolean }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (global && user.rol !== SUPERADMIN) redirect("/dashboard");
  if (!global && (user.rol !== ADMINISTRADOR || !user.organizacionId)) redirect(user.rol === SUPERADMIN ? "/superadmin/reportes" : "/login");
  const activities = await listActivities(global ? {} : { organizacion_id: user.organizacionId! });
  const organizations = global ? await listOrganizations() : [];
  return <Reportes global={global} actividades={activities.map(a => ({ id: a.id, titulo: a.titulo, organizacion_id: a.organizacion_id }))}
    organizaciones={organizations.map(o => ({ id: o.id, nombre: o.nombre }))} />;
}
