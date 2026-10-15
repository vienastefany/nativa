import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { AttendanceReport } from "./db/reports";

const headers = ["Organización", "Actividad", "Sesión", "Fecha", "Hora", "Estado", "Convocados", "Presentes", "Ausentes", "Pendientes"];
function reportRows(report: AttendanceReport) {
  return report.sesiones.map(s => [s.organizacion, s.titulo, s.sesion_id, s.fecha, s.hora_inicio.slice(0, 5), s.estado.replaceAll("_", " "), s.convocados, s.presentes, s.ausentes, s.pendientes]);
}
function scope(report: AttendanceReport) {
  return `Fechas: ${report.filtros.desde ?? "sin inicio"} a ${report.filtros.hasta ?? "sin fin"}. Organización: ${report.filtros.organizacionId ?? "todas"}. Actividad: ${report.filtros.actividadId ?? "todas"}.`;
}
export async function exportExcel(report: AttendanceReport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nativa";
  workbook.created = new Date(report.generado);
  const summary = workbook.addWorksheet("Resumen");
  summary.columns = [{ width: 38 }, { width: 80 }];
  summary.addRows([["Reporte de sesiones y asistencia", ""], ["Generado (UTC)", report.generado], ["Filtros", scope(report)],
    ["Actividades con sesiones", report.resumen.actividades], ["Sesiones", report.resumen.sesiones],
    ["Participantes únicos", report.resumen.participantes_unicos], ["Asistencias esperadas", report.resumen.asistencias_esperadas],
    ["Asistencias presentes", report.resumen.presentes], ["Asistencia (%)", report.resumen.porcentaje],
    ["Criterio", "Incluye inscritos activos y registros históricos de inscripciones canceladas. Pendiente no significa Ausente. Fechas filtradas por sesión."]]);
  summary.getColumn(2).alignment = { wrapText: true, vertical: "middle" };
  summary.getRow(10).height = 45;
  summary.getRow(1).font = { bold: true, size: 14 };
  const sheet = workbook.addWorksheet("Asistencia por sesión", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = headers.map((header, index) => ({ header, key: String(index), width: [28, 44, 10, 14, 10, 16, 14, 14, 14, 14][index] }));
  sheet.addRows(reportRows(report));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } };
  sheet.eachRow(row => { row.alignment = { vertical: "middle", wrapText: true }; });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: headers.length } };
  // Strings are written as string cells, never as formulas derived from user content.
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
export function exportPdf(report: AttendanceReport) {
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  doc.setFontSize(17); doc.text("Reporte de sesiones y asistencia", 14, 18);
  doc.setFontSize(9); doc.text(`Generado (UTC): ${report.generado.replace("T", " ").slice(0, 19)}`, 14, 25);
  doc.text(scope(report), 14, 31);
  doc.text(`Sesiones: ${report.resumen.sesiones}   Participantes únicos: ${report.resumen.participantes_unicos}   Presentes: ${report.resumen.presentes} / ${report.resumen.asistencias_esperadas} (${report.resumen.porcentaje}%)`, 14, 38);
  doc.text("Convocados: inscritos activos más registros históricos. Pendiente no significa Ausente. Fechas por sesión.", 14, 44);
  autoTable(doc, { startY: 50, head: [headers], body: reportRows(report), margin: { left: 14, right: 14, bottom: 16 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [71, 85, 105] },
    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 58 } }, rowPageBreak: "avoid",
    didDrawPage: () => { doc.setFontSize(8); doc.text(`Nativa · Página ${doc.getNumberOfPages()}`, 14, doc.internal.pageSize.getHeight() - 8); },
  });
  if (!report.sesiones.length) doc.text("No se encontraron sesiones para los filtros seleccionados.", 14, 70);
  return new Uint8Array(doc.output("arraybuffer"));
}
