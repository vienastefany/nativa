import { NextRequest, NextResponse } from "next/server";
import { registerParticipant, RegistrationError } from "@/lib/db/registration";
import { PARTICIPANT_COOKIE, rememberParticipant, participantCookieOptions } from "@/lib/participant-identity";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const tokenTrim = token.trim();
  if (!tokenTrim) return NextResponse.json({ error: "Enlace inválido" }, { status: 400 });
  try {
    const body = await request.json();
    const nombres = typeof body.nombres === "string" ? body.nombres.trim() : "";
    const apellidos = typeof body.apellidos === "string" ? body.apellidos.trim() : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";
    if (!nombres || !apellidos) {
      return NextResponse.json({ error: "Nombres y apellidos son obligatorios" }, { status: 400 });
    }
    if (!/^\d{8}$/.test(dni)) {
      return NextResponse.json({ error: "Ingresa un DNI válido (8 dígitos)" }, { status: 400 });
    }
    const telefono = typeof body.telefono === "string" ? body.telefono.trim() || null : null;
    const direccion = typeof body.direccion === "string" ? body.direccion.trim() || null : null;
    const { participantId, ...result } = await registerParticipant(tokenTrim, { nombres, apellidos, dni, telefono, direccion });
    const response = NextResponse.json(result, { status: 201 });
    response.cookies.set(PARTICIPANT_COOKIE, rememberParticipant(participantId), participantCookieOptions(request.nextUrl.protocol === "https:"));
    return response;
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    console.error("Error al inscribir participante:", error);
    return NextResponse.json({ error: "Error al procesar la inscripción" }, { status: 500 });
  }
}
