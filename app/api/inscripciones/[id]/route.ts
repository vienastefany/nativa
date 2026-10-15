import { getEnrollment, updateEnrollment } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";
import { puedeAccederActividad } from "@/lib/actividades";
import type { EstadoInscripcion } from "@/lib/db/types";

type Params = { params: Promise<{ id: string }> };

const ESTADOS_INSCRIPCION: readonly EstadoInscripcion[] = [
  "Inscrita",
  "Cancelada",
];

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const inscripcionId = Number(id);
  if (!Number.isInteger(inscripcionId)) {
    return NextResponse.json(
      { error: "ID de inscripción inválido" },
      { status: 400 }
    );
  }

  let body: { estado?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud inválido" },
      { status: 400 }
    );
  }

  const estado = typeof body.estado === "string" ? body.estado : "";
  if (!(ESTADOS_INSCRIPCION as readonly string[]).includes(estado)) {
    return NextResponse.json(
      { error: "Estado de inscripción inválido" },
      { status: 400 }
    );
  }
  const estadoEnum = estado as EstadoInscripcion;

  try {
    const inscripcion = await getEnrollment(inscripcionId);

    if (!inscripcion) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    if (!puedeAccederActividad(user, inscripcion.actividad_formativa.organizacion_id)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const actualizada = await updateEnrollment(inscripcionId, estadoEnum === "Cancelada"
          ? { estado: estadoEnum, fecha_cancelacion: new Date() }
          : { estado: estadoEnum, fecha_cancelacion: null });

    return NextResponse.json({
      id: actualizada.id,
      estado: actualizada.estado,
      fecha_inscripcion: actualizada.fecha_inscripcion,
      fecha_cancelacion: actualizada.fecha_cancelacion,
      participante: actualizada.participante,
    });
  } catch (error) {
    console.error("Error al actualizar inscripción:", error);
    return NextResponse.json(
      { error: "Error al actualizar la inscripción" },
      { status: 500 }
    );
  }
}