import { getUser, getRole, updateUser } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUser,
  SUPERADMIN,
  ADMINISTRADOR,
} from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

const ROLES_EDITABLES = [ADMINISTRADOR];

export async function PATCH(request: NextRequest, { params }: Params) {
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

  const { id } = await params;
  const targetId = Number(id);
  if (!Number.isInteger(targetId)) {
    return NextResponse.json(
      { error: "ID de usuario inválido" },
      { status: 400 }
    );
  }

  const target = await getUser(targetId);
  if (!target) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  if (!ROLES_EDITABLES.includes(target.rol.nombre)) {
    return NextResponse.json(
      { error: "Este usuario no se puede modificar" },
      { status: 400 }
    );
  }

  if (!esSuperAdmin) {
    if (target.organizacion_id !== user.organizacionId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }
  }

  const sessionUserId = Number(user.id);

  let body: { activo?: boolean; rol?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 }
    );
  }

  const data: { activo?: boolean; rol_id?: number } = {};

  if (typeof body.activo === "boolean") {
    if (targetId === sessionUserId && body.activo === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }
    data.activo = body.activo;
  }

  if (typeof body.rol === "string") {
    if (!ROLES_EDITABLES.includes(body.rol)) {
      return NextResponse.json(
        { error: "Rol no permitido. Debe ser Administrador" },
        { status: 400 }
      );
    }
    if (body.rol === target.rol.nombre) {
      return NextResponse.json(
        { error: "El usuario ya tiene ese rol" },
        { status: 400 }
      );
    }
    if (targetId === sessionUserId) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 400 }
      );
    }
    const rol = await getRole(body.rol);
    if (!rol || !rol.activo) {
      return NextResponse.json(
        { error: "Rol no válido en el sistema" },
        { status: 400 }
      );
    }
    data.rol_id = rol.id;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Nada que actualizar" },
      { status: 400 }
    );
  }

  const updated = await updateUser(targetId, data);

  return NextResponse.json(updated);
}