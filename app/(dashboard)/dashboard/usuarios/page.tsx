import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ADMINISTRADOR,
  SUBADMINISTRADOR,
} from "@/lib/auth-guard";
import UsuariosList from "@/components/usuarios/UsuariosList";

export default async function DashboardUsuariosPage() {
  const session = await auth();

  if (
    session.user.rol !== ADMINISTRADOR &&
    session.user.rol !== SUBADMINISTRADOR
  ) {
    redirect("/dashboard");
  }

  const editable = session.user.rol === ADMINISTRADOR;

  return <UsuariosList editable={editable} />;
}