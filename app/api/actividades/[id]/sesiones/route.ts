import { getActivity, listSessions, createSession } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guard";
import {
  puedeAccederActividad,
  MODALIDADES,
  fechaStrToDate,
  horaStrToDate,
} from "@/lib/actividades";
import type { Modalidad } from "@/lib/db/types";

type Params = { params: Promise<{ id: string }> };

const fechaValida = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);
const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

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

    const sesiones = await listSessions(actividadId);

    return NextResponse.json(sesiones);
  } catch (error) {
    console.error("Error al listar sesiones:", error);
    return NextResponse.json(
      { error: "Error al obtener las sesiones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
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

    const body = await request.json();

    const fecha =
      typeof body.fecha === "string" ? body.fecha.trim() : "";
    if (!fechaValida(fecha)) {
      return NextResponse.json(
        { error: "La fecha es requerida (AAAA-MM-DD)" },
        { status: 400 }
      );
    }

    const horaInicio =
      typeof body.hora_inicio === "string" ? body.hora_inicio.trim() : "";
    const horaFin =
      typeof body.hora_fin === "string" ? body.hora_fin.trim() : "";
    if (!horaValida(horaInicio) || !horaValida(horaFin)) {
      return NextResponse.json(
        { error: "Las horas de inicio y fin son requeridas (HH:MM)" },
        { status: 400 }
      );
    }

    const [hiH, hiM] = horaInicio.split(":").map(Number);
    const [hfH, hfM] = horaFin.split(":").map(Number);
    if (hfH * 60 + hfM <= hiH * 60 + hiM) {
      return NextResponse.json(
        { error: "La hora de fin debe ser posterior a la de inicio" },
        { status: 400 }
      );
    }

    const modalidad = body.modalidad as Modalidad;
    if (!MODALIDADES.includes(modalidad as (typeof MODALIDADES)[number])) {
      return NextResponse.json(
        { error: "Modalidad inválida" },
        { status: 400 }
      );
    }

    const lugar =
      typeof body.lugar === "string" ? body.lugar.trim() : "";
    const enlaceVirtual =
      typeof body.enlace_virtual === "string"
        ? body.enlace_virtual.trim()
        : "";

    if (modalidad === "Presencial" && !lugar) {
      return NextResponse.json(
        { error: "Ingresa el lugar para una sesión presencial" },
        { status: 400 }
      );
    }
    if (modalidad === "Virtual" && !enlaceVirtual) {
      return NextResponse.json(
        { error: "Ingresa el enlace para una sesión virtual" },
        { status: 400 }
      );
    }

    const sesion = await createSession({
        actividad_formativa_id: actividadId,
        fecha: fechaStrToDate(fecha),
        hora_inicio: horaStrToDate(horaInicio),
        hora_fin: horaStrToDate(horaFin),
        modalidad,
        lugar: lugar || null,
        enlace_virtual: enlaceVirtual || null,
        estado: "Programada",
      });

    return NextResponse.json(sesion, { status: 201 });
  } catch (error) {
    console.error("Error al crear sesión:", error);
    return NextResponse.json(
      { error: "Error al crear la sesión" },
      { status: 500 }
    );
  }
}