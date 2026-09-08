import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isSuperAdmin } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const estado = searchParams.get("estado");

  try {
    const where: { nombre?: { contains: string }; activo?: boolean } = {};

    if (q) {
      where.nombre = { contains: q };
    }
    if (estado === "activo") {
      where.activo = true;
    } else if (estado === "inactivo") {
      where.activo = false;
    }

    const organizaciones = await prisma.organizacion.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        _count: {
          select: {
            actividades: true,
          },
        },
        usuarios: {
          select: {
            id: true,
            rol: {
              select: { nombre: true },
            },
          },
        },
      },
    });

    const data = organizaciones.map((org) => {
      const administradores = org.usuarios.filter((u) =>
        ["Administrador", "Subadministrador"].includes(u.rol.nombre)
      ).length;
      return {
        id: org.id,
        nombre: org.nombre,
        ruc: org.ruc,
        correo: org.correo,
        telefono: org.telefono,
        logo_url: org.logo_url,
        activo: org.activo,
        created_at: org.created_at,
        cantidad_administradores: administradores,
        cantidad_actividades: org._count.actividades,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error al listar organizaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener las organizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const ruc =
      typeof body.ruc === "string" ? body.ruc.trim() || null : null;
    const direccion =
      typeof body.direccion === "string" ? body.direccion.trim() || null : null;
    const telefono =
      typeof body.telefono === "string" ? body.telefono.trim() || null : null;
    const correo =
      typeof body.correo === "string" ? body.correo.trim() || null : null;
    const logo_url =
      typeof body.logo_url === "string" ? body.logo_url.trim() || null : null;
    const activo =
      typeof body.activo === "boolean" ? body.activo : true;

    const organizacion = await prisma.organizacion.create({
      data: {
        nombre,
        ruc,
        direccion,
        telefono,
        correo,
        logo_url,
        activo,
      },
    });

    return NextResponse.json(organizacion, { status: 201 });
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una organización con ese RUC" },
        { status: 409 }
      );
    }
    console.error("Error al crear organización:", error);
    return NextResponse.json(
      { error: "Error al crear la organización" },
      { status: 500 }
    );
  }
}
