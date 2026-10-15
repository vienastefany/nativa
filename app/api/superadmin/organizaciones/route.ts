import { isDuplicateEntry } from "@/lib/db";
import type { FiltroOrganizaciones } from "@/lib/db/repository";
import { listOrganizations, createOrganization } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const estado = searchParams.get("estado");

  try {
    const where: FiltroOrganizaciones = {};

    if (q) {
      where.nombre = q;
    }
    if (estado === "activo") {
      where.activo = true;
    } else if (estado === "inactivo") {
      where.activo = false;
    }

    const organizaciones = await listOrganizations(where);

    return NextResponse.json(organizaciones);
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

    const organizacion = await createOrganization({
        nombre,
        ruc,
        direccion,
        telefono,
        correo,
        logo_url,
        activo,
      });

    return NextResponse.json(organizacion, { status: 201 });
  } catch (error) {
    if (isDuplicateEntry(error)) {
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
