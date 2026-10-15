import { listActivityTypes } from "@/lib/db/repository";
import { NextResponse } from "next/server";
import { canManageActividades } from "@/lib/auth-guard";

export async function GET() {
  if (!(await canManageActividades())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const tipos = await listActivityTypes();
    return NextResponse.json(tipos);
  } catch (error) {
    console.error("Error al listar tipos de actividad:", error);
    return NextResponse.json(
      { error: "Error al obtener los tipos de actividad" },
      { status: 500 }
    );
  }
}