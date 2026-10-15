import { getOrganization, getRole, getUserByEmail, createUser } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isSuperAdmin } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

const ROLES_PERMITIDOS = ["Administrador"];

export async function POST(request: NextRequest, { params }: Params) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const organizacionId = Number(id);
  if (!Number.isInteger(organizacionId)) {
    return NextResponse.json(
      { error: "ID de organización inválido" },
      { status: 400 }
    );
  }

  try {
    // Verificar que la organización exista y esté activa
    const organizacion = await getOrganization(organizacionId);
    if (!organizacion) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }
    if (!organizacion.activo) {
      return NextResponse.json(
        { error: "No se pueden asignar administradores a una organización inactiva" },
        { status: 400 }
      );
    }

    const body = await request.json();

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
    if (!ROLES_PERMITIDOS.includes(rolNombre)) {
      return NextResponse.json(
        { error: "Rol no permitido. Debe ser Administrador" },
        { status: 400 }
      );
    }

    // Buscar el rol por nombre
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
  } catch (error) {
    console.error("Error al crear administrador:", error);
    return NextResponse.json(
      { error: "Error al crear el administrador" },
      { status: 500 }
    );
  }
}
