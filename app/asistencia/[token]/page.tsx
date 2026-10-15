import { notFound } from "next/navigation";
import { attendanceOpen, getPublicSession } from "@/lib/db/attendance";
import InformacionSesion from "@/components/actividades/InformacionSesion";
import MarcarAsistencia from "@/components/actividades/MarcarAsistencia";
export const dynamic = "force-dynamic";
export const metadata = { title: "Registrar asistencia | Nativa", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getPublicSession(token);
  if (!session) notFound();
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><article className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm sm:p-9">
    <InformacionSesion sesion={session} />
    {attendanceOpen(session) ? <MarcarAsistencia token={token} /> : <p role="status" className="alert alert-warning">El registro de asistencia está cerrado. Consulta al administrador de la sesión.</p>}
  </article></main>;
}
