import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ADMINISTRADOR,
} from "@/lib/auth-guard";
import UsuariosList from "@/components/usuarios/UsuariosList";

export default async function DashboardUsuariosPage() {
  const session = await auth();

  if (
    session.user.rol !== ADMINISTRADOR
  ) {
    redirect("/dashboard");
  }

  const editable = session.user.rol === ADMINISTRADOR;

  return <UsuariosList editable={editable} />;
}