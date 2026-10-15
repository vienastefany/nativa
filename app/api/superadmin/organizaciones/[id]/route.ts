import { RecordNotFoundError, isDuplicateEntry } from "@/lib/db";
import { getOrganizationDetail, updateOrganization } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/auth-guard";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
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
    const organizacion = await getOrganizationDetail(organizacionId);

    if (!organizacion) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }

    const administradores = organizacion.usuarios.filter(
      (u) => u.rol.nombre === "Administrador"
    );

    const totalActividades = organizacion.actividades.length;
    const actividadesProximas = organizacion.actividades.filter(
      (a) => ["Borrador", "Publicada", "En_curso"].includes(a.estado)
    ).length;
    const actividadesFinalizadas = organizacion.actividades.filter(
      (a) => a.estado === "Finalizada"
    ).length;

    return NextResponse.json({
      ...organizacion,
      administradores,
      resumen_actividades: {
        total: totalActividades,
        proximas: actividadesProximas,
        finalizadas: actividadesFinalizadas,
      },
    });
  } catch (error) {
    console.error("Error al obtener organización:", error);
    return NextResponse.json(
      { error: "Error al obtener la organización" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
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
    const body = await request.json();

    // Muy importante: solo para activar/desactivar la organización
    // (toggle de estado). Cualquier otro campo se ignora por seguridad.
    if (typeof body.activo === "boolean") {
      const organizacion = await updateOrganization(organizacionId, { activo: body.activo });
      return NextResponse.json(organizacion);
    }

    return NextResponse.json(
      { error: "Campo 'activo' (booleano) es requerido" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al actualizar organización:", error);
    return NextResponse.json(
      { error: "Error al actualizar la organización" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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
    const body = await request.json();

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const data = {
      nombre,
      ruc: typeof body.ruc === "string" ? body.ruc.trim() || null : null,
      direccion:
        typeof body.direccion === "string"
          ? body.direccion.trim() || null
          : null,
      telefono:
        typeof body.telefono === "string" ? body.telefono.trim() || null : null,
      correo: typeof body.correo === "string" ? body.correo.trim() || null : null,
      logo_url:
        typeof body.logo_url === "string"
          ? body.logo_url.trim() || null
          : null,
      activo: typeof body.activo === "boolean" ? body.activo : undefined,
    };

    // Actualiza solo los campos presentes; activo tiene default propio
    const organizacion = await updateOrganization(organizacionId, data);

    return NextResponse.json(organizacion);
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return NextResponse.json(
        { error: "Ya existe otra organización con ese RUC" },
        { status: 409 }
      );
    }
    if (error instanceof RecordNotFoundError) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }
    console.error("Error al actualizar organización:", error);
    return NextResponse.json(
      { error: "Error al actualizar la organización" },
      { status: 500 }
    );
  }
}
