import { NextResponse } from "next/server";
import { getGlobalStats } from "@/lib/db/repository";
import { isSuperAdmin } from "@/lib/auth-guard";

export async function GET() {
  if (!(await isSuperAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getGlobalStats());
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
