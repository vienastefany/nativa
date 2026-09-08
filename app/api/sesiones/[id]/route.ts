import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guard";
import {
  puedeAccederActividad,
  ESTADOS_SESION,
  MODALIDADES,
  fechaStrToDate,
  horaStrToDate,
} from "@/lib/actividades";
import type { Modalidad, EstadoSesion } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const fechaValida = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f);
const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

async function obtenerSesionConAcceso(
  sesionId: number,
  user: { rol: string; organizacionId: number | null }
) {
  const sesion = await prisma.sesion.findUnique({
    where: { id: sesionId },
    include: {
      actividad_formativa: {
        select: { id: true, organizacion_id: true },
      },
      _count: {
        select: { asistencias: true },
      },
    },
  });

  if (!sesion) return null;
  if (!puedeAccederActividad(user, sesion.actividad_formativa.organizacion_id)) {
    return "prohibido";
  }
  return sesion;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sesionId = Number(id);
  if (!Number.isInteger(sesionId)) {
    return NextResponse.json(
      { error: "ID de sesión inválido" },
      { status: 400 }
    );
  }

  try {
    const sesion = await obtenerSesionConAcceso(sesionId, user);
    if (sesion === null) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }
    if (sesion === "prohibido") {
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

    const updated = await prisma.sesion.update({
      where: { id: sesionId },
      data: {
        fecha: fechaStrToDate(fecha),
        hora_inicio: horaStrToDate(horaInicio),
        hora_fin: horaStrToDate(horaFin),
        modalidad,
        lugar: lugar || null,
        enlace_virtual: enlaceVirtual || null,
      },
      select: {
        id: true,
        fecha: true,
        hora_inicio: true,
        hora_fin: true,
        modalidad: true,
        lugar: true,
        enlace_virtual: true,
        estado: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar sesión:", error);
    return NextResponse.json(
      { error: "Error al actualizar la sesión" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sesionId = Number(id);
  if (!Number.isInteger(sesionId)) {
    return NextResponse.json(
      { error: "ID de sesión inválido" },
      { status: 400 }
    );
  }

  try {
    const sesion = await obtenerSesionConAcceso(sesionId, user);
    if (sesion === null) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }
    if (sesion === "prohibido") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const estado = body.estado as EstadoSesion;

    if (!ESTADOS_SESION.includes(estado as (typeof ESTADOS_SESION)[number])) {
      return NextResponse.json(
        { error: "Estado de sesión inválido" },
        { status: 400 }
      );
    }

    const updated = await prisma.sesion.update({
      where: { id: sesionId },
      data: { estado },
      select: {
        id: true,
        fecha: true,
        hora_inicio: true,
        hora_fin: true,
        modalidad: true,
        lugar: true,
        enlace_virtual: true,
        estado: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar estado de sesión:", error);
    return NextResponse.json(
      { error: "Error al actualizar la sesión" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const sesionId = Number(id);
  if (!Number.isInteger(sesionId)) {
    return NextResponse.json(
      { error: "ID de sesión inválido" },
      { status: 400 }
    );
  }

  try {
    const sesion = await obtenerSesionConAcceso(sesionId, user);
    if (sesion === null) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }
    if (sesion === "prohibido") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const asistencias = sesion._count.asistencias;

    if (asistencias > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar: la sesión ya tiene asistencias registradas" },
        { status: 409 }
      );
    }

    await prisma.sesion.delete({ where: { id: sesionId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar sesión:", error);
    return NextResponse.json(
      { error: "Error al eliminar la sesión" },
      { status: 500 }
    );
  }
}