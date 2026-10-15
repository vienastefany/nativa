import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, ADMINISTRADOR, SUPERADMIN } from "@/lib/auth-guard";
import { attendanceReport } from "@/lib/db/reports";

function positive(value: string | null) {
  if (value === null || value === "") return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) throw new Error("ID de filtro inválido");
  return number;
}
function date(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error("Fecha de filtro inválida");
  return value;
}
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (![SUPERADMIN, ADMINISTRADOR].includes(user.rol) || (user.rol === ADMINISTRADOR && !user.organizacionId)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  let filters;
  const params = request.nextUrl.searchParams;
  const format = params.get("formato") || "json";
  try {
    if (!["json", "xlsx", "pdf"].includes(format)) throw new Error("Formato no permitido");
    const orgId = positive(params.get("organizacion_id"));
    if (user.rol === ADMINISTRADOR && orgId && orgId !== user.organizacionId) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    filters = { organizacionId: user.rol === ADMINISTRADOR ? user.organizacionId! : orgId,
      actividadId: positive(params.get("actividad_id")), desde: date(params.get("desde")), hasta: date(params.get("hasta")) };
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) throw new Error("La fecha inicial debe ser anterior o igual a la final");
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    const report = await attendanceReport(filters);
    if (format === "json") return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
    const { exportExcel, exportPdf } = await import("@/lib/report-export");
    const bytes = format === "xlsx" ? await exportExcel(report) : exportPdf(report);
    return new Response(bytes, { headers: { "Content-Type": format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-asistencia.${format}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al generar reporte:", error);
    return NextResponse.json({ error: "No se pudo generar el reporte" }, { status: 500 });
  }
}
