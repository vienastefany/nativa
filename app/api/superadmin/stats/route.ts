import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [
      totalOrganizaciones,
      totalUsuarios,
      totalActividades,
      totalParticipantes,
    ] = await Promise.all([
      prisma.organizacion.count(),
      prisma.usuario.count(),
      prisma.actividadFormativa.count(),
      prisma.participante.count(),
    ]);

    return NextResponse.json({
      totalOrganizaciones,
      totalUsuarios,
      totalActividades,
      totalParticipantes,
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}