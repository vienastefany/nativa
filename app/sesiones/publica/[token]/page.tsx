import { notFound } from "next/navigation";
import { getPublicSession } from "@/lib/db/attendance";
import InformacionSesion from "@/components/actividades/InformacionSesion";
export const dynamic = "force-dynamic";
export const metadata = { title: "Información de sesión | Nativa", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getPublicSession(token);
  if (!session) notFound();
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><article className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm sm:p-9">
    <InformacionSesion sesion={session} />
    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{session.actividad_estado === "Cancelada" || session.estado === "Cancelada" ? "Esta sesión o actividad fue cancelada." : "Para registrar tu asistencia, escanea el QR que compartirá el administrador durante la sesión."}</p>
  </article></main>;
}
