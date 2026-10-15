import { getActivity, listEnrollments } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";
import { puedeAccederActividad } from "@/lib/actividades";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const actividadId = Number(id);
  if (!Number.isInteger(actividadId)) {
    return NextResponse.json(
      { error: "ID de actividad inválido" },
      { status: 400 }
    );
  }

  try {
    const actividad = await getActivity(actividadId);

    if (!actividad) {
      return NextResponse.json(
        { error: "Actividad no encontrada" },
        { status: 404 }
      );
    }

    if (!puedeAccederActividad(user, actividad.organizacion_id)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const inscripciones = await listEnrollments(actividadId);

    return NextResponse.json(
      inscripciones.map((i) => ({
        id: i.id,
        estado: i.estado,
        fecha_inscripcion: i.fecha_inscripcion,
        fecha_cancelacion: i.fecha_cancelacion,
        participante: i.participante,
      }))
    );
  } catch (error) {
    console.error("Error al listar inscripciones:", error);
    return NextResponse.json(
      { error: "Error al obtener las inscripciones" },
      { status: 500 }
    );
  }
}