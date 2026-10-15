import type { FiltroActividades } from "@/lib/db/repository";
import { listActivities, getOrganization, createActivity } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import {
  getSessionUser,
  SUPERADMIN,
  ADMINISTRADOR,
} from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const estado = searchParams.get("estado") || "";
  const ESTADOS_VALIDOS = [
    "Borrador",
    "Publicada",
    "En_curso",
    "Finalizada",
    "Cancelada",
  ];

  const isSuperAdmin = user.rol === SUPERADMIN;
  const isAdmin =
    user.rol === ADMINISTRADOR;

  if (!isSuperAdmin && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const where: FiltroActividades = {};

    // Aislamiento por organización
    if (isSuperAdmin) {
      const orgIdParam = searchParams.get("organizacion_id");
      const orgId = orgIdParam ? Number(orgIdParam) : NaN;
      if (Number.isInteger(orgId) && orgId > 0) {
        where.organizacion_id = orgId;
      }
    } else {
      if (user.organizacionId == null) {
        return NextResponse.json([]);
      }
      where.organizacion_id = user.organizacionId;
    }

    // Filtros
    if (q) {
      where.titulo = q;
    }
    if (estado && ESTADOS_VALIDOS.includes(estado)) {
      where.estado = estado;
    }

    const actividades = await listActivities(where);

    return NextResponse.json(
      actividades.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        descripcion: a.descripcion,
        tipo_actividad_nombre: a.tipo_actividad.nombre,
        organizacion: a.organizacion,
        instructor_nombres: a.instructor_nombres,
        instructor_apellidos: a.instructor_apellidos,
        capacidad: a.capacidad,
        estado: a.estado,
        inscripciones_abiertas: a.inscripciones_abiertas,
        created_at: a.created_at,
        total_sesiones: a._count.sesiones,
        total_inscritos: a._count.inscripciones,
      }))
    );
  } catch (error) {
    console.error("Error al listar actividades:", error);
    return NextResponse.json(
      { error: "Error al obtener las actividades" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isSuperAdmin = user.rol === SUPERADMIN;
  const isAdmin =
    user.rol === ADMINISTRADOR;

  if (!isSuperAdmin && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const titulo =
      typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    const tipoActividadId = Number(body.tipo_actividad_id);
    if (!Number.isInteger(tipoActividadId) || tipoActividadId <= 0) {
      return NextResponse.json(
        { error: "El tipo de actividad es obligatorio" },
        { status: 400 }
      );
    }

    // Organización: SuperAdmin la elige, Administrador queda fija a su org
    let organizacionId: number;
    if (isSuperAdmin) {
      organizacionId = Number(body.organizacion_id);
      if (!Number.isInteger(organizacionId) || organizacionId <= 0) {
        return NextResponse.json(
          { error: "La organización es obligatoria para SuperAdmin" },
          { status: 400 }
        );
      }
      const org = await getOrganization(organizacionId);
      if (!org) {
        return NextResponse.json(
          { error: "Organización no encontrada" },
          { status: 404 }
        );
      }
    } else {
      if (user.organizacionId == null) {
        return NextResponse.json(
          { error: "No tienes una organización asignada" },
          { status: 400 }
        );
      }
      organizacionId = user.organizacionId;
    }

    const descripcion =
      typeof body.descripcion === "string"
        ? body.descripcion.trim() || null
        : null;
    const instructorNombres =
      typeof body.instructor_nombres === "string"
        ? body.instructor_nombres.trim() || null
        : null;
    const instructorApellidos =
      typeof body.instructor_apellidos === "string"
        ? body.instructor_apellidos.trim() || null
        : null;
    const instructorProfesion =
      typeof body.instructor_profesion === "string"
        ? body.instructor_profesion.trim() || null
        : null;
    const capacidad = body.capacidad
      ? Number(body.capacidad)
      : null;

    const actividad = await createActivity({
        titulo,
        tipo_actividad_id: tipoActividadId,
        organizacion_id: organizacionId,
        descripcion,
        instructor_nombres: instructorNombres,
        instructor_apellidos: instructorApellidos,
        instructor_profesion: instructorProfesion,
        capacidad: capacidad && Number.isInteger(capacidad) ? capacidad : null,
        estado: "Borrador",
        inscripciones_abiertas: false,
        token_inscripcion: randomBytes(12).toString("hex"),
        creado_por: Number(user.id),
      });

    return NextResponse.json(actividad, { status: 201 });
  } catch (error) {
    console.error("Error al crear actividad:", error);
    return NextResponse.json(
      { error: "Error al crear la actividad" },
      { status: 500 }
    );
  }
}
