import { queryRows, withTransaction, type SqlValue } from "./index";

export interface ReportFilters { organizacionId?: number; actividadId?: number; desde?: string; hasta?: string }
export interface ReportRow {
  sesion_id: number; actividad_id: number; organizacion: string; titulo: string; fecha: string;
  hora_inicio: string; estado: string; convocados: number; presentes: number; ausentes: number; pendientes: number;
}
export async function attendanceReport(filters: ReportFilters) {
  const where: string[] = []; const values: SqlValue[] = [];
  if (filters.organizacionId) { where.push("a.organizacion_id = ?"); values.push(filters.organizacionId); }
  if (filters.actividadId) { where.push("a.id = ?"); values.push(filters.actividadId); }
  if (filters.desde) { where.push("s.fecha >= ?"); values.push(filters.desde); }
  if (filters.hasta) { where.push("s.fecha <= ?"); values.push(filters.hasta); }
  const from = `FROM sesiones s JOIN actividades_formativas a ON a.id = s.actividad_formativa_id
    JOIN organizaciones o ON o.id = a.organizacion_id
    LEFT JOIN inscripciones i ON i.actividad_formativa_id = a.id AND (i.estado = 'Inscrita'
      OR EXISTS (SELECT 1 FROM asistencias history WHERE history.sesion_id = s.id AND history.participante_id = i.participante_id))
    LEFT JOIN asistencias x ON x.sesion_id = s.id AND x.participante_id = i.participante_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
  return withTransaction(async connection => {
    const raw = await queryRows<ReportRow>(`SELECT s.id AS sesion_id, a.id AS actividad_id,
      o.nombre AS organizacion, a.titulo, s.fecha, s.hora_inicio, s.estado,
      COUNT(i.id) AS convocados, COALESCE(SUM(x.estado = 'Presente'), 0) AS presentes,
      COALESCE(SUM(x.estado = 'Ausente'), 0) AS ausentes,
      COALESCE(SUM(i.id IS NOT NULL AND (x.id IS NULL OR x.estado = 'Pendiente')), 0) AS pendientes
      ${from} GROUP BY s.id, a.id, o.nombre, a.titulo, s.fecha, s.hora_inicio, s.estado
      ORDER BY s.fecha DESC, s.hora_inicio DESC, s.id DESC`, values, connection);
    const rows = raw.map(r => ({ ...r, convocados: Number(r.convocados), presentes: Number(r.presentes), ausentes: Number(r.ausentes), pendientes: Number(r.pendientes) }));
    const [unique] = await queryRows<{ total: number }>(`SELECT COUNT(DISTINCT i.participante_id) AS total ${from}`, values, connection);
    const expected = rows.reduce((sum, row) => sum + row.convocados, 0);
    const present = rows.reduce((sum, row) => sum + row.presentes, 0);
    return { generado: new Date().toISOString(), filtros: filters, resumen: {
      actividades: new Set(rows.map(row => row.actividad_id)).size, sesiones: rows.length,
      participantes_unicos: Number(unique.total), asistencias_esperadas: expected, presentes: present,
      porcentaje: expected ? Math.round(present * 1000 / expected) / 10 : 0,
    }, sesiones: rows };
  });
}
export type AttendanceReport = Awaited<ReturnType<typeof attendanceReport>>;
