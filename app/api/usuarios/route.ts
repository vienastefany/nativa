import type { FiltroUsuarios } from "@/lib/db/repository";
import { listUsers, getOrganization, getRole, getUserByEmail, createUser } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  getSessionUser,
  SUPERADMIN,
  ADMINISTRADOR,
} from "@/lib/auth-guard";

const ROLES_CREABLES = [ADMINISTRADOR];
const ROLES_FILTRABLES = [
  ADMINISTRADOR,
  "Participante",
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const esSuperAdmin = user.rol === SUPERADMIN;
  const esGestor = user.rol === ADMINISTRADOR;
  if (!esSuperAdmin && !esGestor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim();
  const rol = params.get("rol") ?? "";
  const estado = params.get("estado") ?? "";
  const orgId = params.get("organizacion_id") ?? "";

  if (rol && !ROLES_FILTRABLES.includes(rol)) {
    return NextResponse.json(
      { error: "Rol no válido para el filtro" },
      { status: 400 }
    );
  }

  const where: FiltroUsuarios = {};

  if (rol) {
    where.rol = rol;
  }

  if (esSuperAdmin) {
    const oid = Number(orgId);
    if (orgId && Number.isInteger(oid)) {
      where.organizacion_id = oid;
    }
  } else {
    where.organizacion_id = user.organizacionId ?? -1;
  }

  if (q) {
    where.correo = q;
  }

  if (estado === "activo") {
    where.activo = true;
  } else if (estado === "inactivo") {
    where.activo = false;
  }

  const usuarios = await listUsers(where);

  return NextResponse.json(usuarios);
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const esSuperAdmin = user.rol === SUPERADMIN;
  const esAdmin = user.rol === ADMINISTRADOR;
  if (!esSuperAdmin && !esAdmin) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const correo = typeof body.correo === "string" ? body.correo.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const rolNombre = typeof body.rol === "string" ? body.rol : "";

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return NextResponse.json(
      { error: "Correo electrónico inválido" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }
  if (!ROLES_CREABLES.includes(rolNombre)) {
    return NextResponse.json(
      { error: "Rol no permitido. Debe ser Administrador" },
      { status: 400 }
    );
  }

  let organizacionId: number;
  if (esSuperAdmin) {
    organizacionId = Number(body.organizacion_id);
    if (!Number.isInteger(organizacionId)) {
      return NextResponse.json(
        { error: "Selecciona la organización" },
        { status: 400 }
      );
    }
  } else {
    organizacionId = user.organizacionId ?? 0;
    if (!organizacionId) {
      return NextResponse.json(
        { error: "Tu usuario no está asociado a una organización" },
        { status: 400 }
      );
    }
  }

  const organizacion = await getOrganization(organizacionId);
  if (!organizacion) {
    return NextResponse.json(
      { error: "Organización no encontrada" },
      { status: 404 }
    );
  }
  if (!organizacion.activo) {
    return NextResponse.json(
      { error: "No se pueden asignar usuarios a una organización inactiva" },
      { status: 400 }
    );
  }

  const rol = await getRole(rolNombre);
  if (!rol || !rol.activo) {
    return NextResponse.json(
      { error: "Rol no válido en el sistema" },
      { status: 400 }
    );
  }

  const correoExiste = await getUserByEmail(correo);
  if (correoExiste) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const usuario = await createUser({
      correo,
      password: hashedPassword,
      rol_id: rol.id,
      organizacion_id: organizacionId,
      activo: true,
    });

  return NextResponse.json(
    {
      id: usuario.id,
      correo: usuario.correo,
      rol: rolNombre,
    },
    { status: 201 }
  );
}