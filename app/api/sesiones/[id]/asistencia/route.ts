import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSessionUser } from "@/lib/auth-guard";
import { puedeAccederActividad } from "@/lib/actividades";
import { getActivity, getSession } from "@/lib/db/repository";
import { AttendanceError, attendanceOpen, listAttendance, prepareSessionLink, setAttendanceWindow } from "@/lib/db/attendance";

type Context = { params: Promise<{ id: string }> };
async function access(context: Context) {
  const user = await getSessionUser();
  if (!user) throw new AttendanceError("No autorizado", 401);
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new AttendanceError("ID inválido", 400);
  const session = await getSession(id);
  if (!session) throw new AttendanceError("Sesión no encontrada", 404);
  if (!puedeAccederActividad(user, session.actividad_formativa.organizacion_id)) throw new AttendanceError("No autorizado", 403);
  return session;
}
async function panel(request: NextRequest, id: number) {
  const session = (await getSession(id))!;
  const activity = (await getActivity(session.actividad_formativa_id))!;
  const base = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  const share = session.qr_token ? `${base}/sesiones/publica/${session.qr_token}` : null;
  const checkIn = session.qr_token ? `${base}/asistencia/${session.qr_token}` : null;
  return NextResponse.json({ enlace: share, enlace_asistencia: checkIn,
    qr: checkIn ? await QRCode.toDataURL(checkIn, { width: 360, margin: 4, errorCorrectionLevel: "M" }) : null,
    activo: attendanceOpen({ ...session, actividad_estado: activity.estado }), hasta: session.qr_hasta,
    asistentes: await listAttendance(id) }, { headers: { "Cache-Control": "no-store" } });
}
function failure(error: unknown) {
  if (error instanceof AttendanceError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  console.error("Error de asistencia:", error);
  return NextResponse.json({ error: "No se pudo procesar la asistencia" }, { status: 500 });
}
export async function GET(request: NextRequest, context: Context) {
  try { return await panel(request, (await access(context)).id); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const session = await access(context);
    const body = await request.json();
    if (body.accion === "compartir") await prepareSessionLink(session.id);
    else if (body.accion === "cerrar") await setAttendanceWindow(session.id, null);
    else if (body.accion === "activar") {
      if (!Number.isInteger(body.minutos) || body.minutos < 5 || body.minutos > 480) throw new AttendanceError("La duración debe ser entre 5 y 480 minutos", 400);
      await setAttendanceWindow(session.id, body.minutos);
    } else throw new AttendanceError("Acción inválida", 400);
    return await panel(request, session.id);
  } catch (error) { return failure(error); }
}
