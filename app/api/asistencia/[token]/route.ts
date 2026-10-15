import { NextRequest, NextResponse } from "next/server";
import { AttendanceError, markAttendance } from "@/lib/db/attendance";
import { PARTICIPANT_COOKIE, recognizedParticipant, rememberParticipant, participantCookieOptions } from "@/lib/participant-identity";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // QR navigation is a GET. Only this same-origin JSON POST records attendance.
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (origin && origin !== allowed) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  try {
    const { token } = await params;
    const body = await request.json();
    const dni = typeof body.dni === "string" ? body.dni.trim() : undefined;
    if (dni !== undefined && !/^\d{8}$/.test(dni)) return NextResponse.json({ error: "Ingresa un DNI válido (8 dígitos)" }, { status: 400 });
    const id = recognizedParticipant(request.cookies.get(PARTICIPANT_COOKIE)?.value) ?? undefined;
    const { participantId, ...result } = await markAttendance(token, dni ? { dni } : { id });
    const response = NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(PARTICIPANT_COOKIE, rememberParticipant(participantId), participantCookieOptions(request.nextUrl.protocol === "https:"));
    return response;
  } catch (error) {
    if (error instanceof AttendanceError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    console.error("Error al marcar asistencia:", error);
    return NextResponse.json({ error: "No se pudo registrar la asistencia. Intenta nuevamente." }, { status: 500 });
  }
}
