import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-guard";
import {
  puedeAccederActividad,
  ESTADOS_ACTIVIDAD,
} from "@/lib/actividades";

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
    const actividad = await prisma.actividadFormativa.findUnique({
      where: { id: actividadId },
      include: {
        tipo_actividad: { select: { id: true, nombre: true } },
        organizacion: { select: { id: true, nombre: true } },
        creador: {
          select: { id: true, correo: true },
        },
        sesiones: {
          orderBy: { fecha: "asc" },
          select: {
            id: true,
            fecha: true,
            hora_inicio: true,
            hora_fin: true,
            modalidad: true,
            lugar: true,
            enlace_virtual: true,
            estado: true,
            qr_token: true,
          },
        },
        _count: {
          select: {
            inscripciones: {
              where: { estado: "Inscrita" },
            },
          },
        },
      },
    });

    if (!actividad) {
      return NextResponse.json(
        { error: "Actividad no encontrada" },
        { status: 404 }
      );
    }

    if (!puedeAccederActividad(user, actividad.organizacion_id)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.json({
      ...actividad,
      total_inscritos: actividad._count.inscripciones,
    });
  } catch (error) {
    console.error("Error al obtener actividad:", error);
    return NextResponse.json(
      { error: "Error al obtener la actividad" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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
    const existente = await prisma.actividadFormativa.findUnique({
      where: { id: actividadId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Actividad no encontrada" },
        { status: 404 }
      );
    }

    if (!puedeAccederActividad(user, existente.organizacion_id)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    const titulo =
      typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const tipoActividadId = body.tipo_actividad_id
      ? Number(body.tipo_actividad_id)
      : existente.tipo_actividad_id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      titulo,
      tipo_actividad_id: tipoActividadId,
      descripcion:
        typeof body.descripcion === "string"
          ? body.descripcion.trim() || null
          : existente.descripcion,
      instructor_nombres:
        typeof body.instructor_nombres === "string"
          ? body.instructor_nombres.trim() || null
          : existente.instructor_nombres,
      instructor_apellidos:
        typeof body.instructor_apellidos === "string"
          ? body.instructor_apellidos.trim() || null
          : existente.instructor_apellidos,
      instructor_profesion:
        typeof body.instructor_profesion === "string"
          ? body.instructor_profesion.trim() || null
          : existente.instructor_profesion,
      capacidad: body.capacidad
        ? Number(body.capacidad)
        : existente.capacidad,
      inscripciones_abiertas:
        typeof body.inscripciones_abiertas === "boolean"
          ? body.inscripciones_abiertas
          : existente.inscripciones_abiertas,
    };

    const actividad = await prisma.actividadFormativa.update({
      where: { id: actividadId },
      data,
    });

    return NextResponse.json(actividad);
  } catch (error) {
    console.error("Error al actualizar actividad:", error);
    return NextResponse.json(
      { error: "Error al actualizar la actividad" },
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
  const actividadId = Number(id);
  if (!Number.isInteger(actividadId)) {
    return NextResponse.json(
      { error: "ID de actividad inválido" },
      { status: 400 }
    );
  }

  try {
    const existente = await prisma.actividadFormativa.findUnique({
      where: { id: actividadId },
    });

    if (!existente) {
      return NextResponse.json(
        { error: "Actividad no encontrada" },
        { status: 404 }
      );
    }

    if (!puedeAccederActividad(user, existente.organizacion_id)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();

    const ESTADOS = ESTADOS_ACTIVIDAD;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (typeof body.estado === "string" && ESTADOS.includes(body.estado)) {
      data.estado = body.estado;
    }
    if (typeof body.inscripciones_abiertas === "boolean") {
      data.inscripciones_abiertas = body.inscripciones_abiertas;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Sin cambios que aplicar" },
        { status: 400 }
      );
    }

    const actividad = await prisma.actividadFormativa.update({
      where: { id: actividadId },
      data,
    });

    return NextResponse.json(actividad);
  } catch (error) {
    console.error("Error al actualizar actividad:", error);
    return NextResponse.json(
      { error: "Error al actualizar la actividad" },
      { status: 500 }
    );
  }
}
