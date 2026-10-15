import { randomBytes } from "node:crypto";
import { executeSql, queryRows, withTransaction, type SqlExecutor } from "./index";

export class AttendanceError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export interface PublicSession {
  id: number; actividad_formativa_id: number; titulo: string; organizacion: string;
  fecha: string; hora_inicio: string; hora_fin: string; modalidad: string;
  lugar: string | null; enlace_virtual: string | null; estado: string;
  actividad_estado: string; qr_desde: Date | null; qr_hasta: Date | null;
}
export async function getPublicSession(token: string, executor?: SqlExecutor) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const [row] = await queryRows<PublicSession>(`SELECT s.id, s.actividad_formativa_id,
    a.titulo, o.nombre AS organizacion, s.fecha, s.hora_inicio, s.hora_fin,
    s.modalidad, s.lugar, s.enlace_virtual, s.estado, a.estado AS actividad_estado,
    s.qr_desde, s.qr_hasta FROM sesiones s
    JOIN actividades_formativas a ON a.id = s.actividad_formativa_id
    JOIN organizaciones o ON o.id = a.organizacion_id
    WHERE s.qr_token = ? AND a.estado <> 'Borrador' AND o.activo = 1`, [token], executor);
  return row ?? null;
}
export function attendanceOpen(s: Pick<PublicSession, "estado" | "actividad_estado" | "qr_desde" | "qr_hasta">) {
  return ["Programada", "En_curso"].includes(s.estado) && ["Publicada", "En_curso"].includes(s.actividad_estado)
    && s.qr_desde !== null && s.qr_hasta !== null && new Date(s.qr_desde).getTime() <= Date.now()
    && new Date(s.qr_hasta).getTime() > Date.now();
}
export async function prepareSessionLink(id: number) {
  await executeSql("UPDATE sesiones SET qr_token = COALESCE(qr_token, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?", [randomBytes(32).toString("hex"), id]);
}
export async function setAttendanceWindow(id: number, minutes: number | null) {
  await withTransaction(async connection => {
    const [s] = await queryRows<{ estado: string; actividad_estado: string }>(`SELECT s.estado, a.estado AS actividad_estado
      FROM sesiones s JOIN actividades_formativas a ON a.id = s.actividad_formativa_id WHERE s.id = ? FOR UPDATE`, [id], connection);
    if (!s) throw new AttendanceError("Sesión no encontrada", 404);
    if (minutes !== null && (!["Programada", "En_curso"].includes(s.estado) || !["Publicada", "En_curso"].includes(s.actividad_estado))) {
      throw new AttendanceError("Publica la actividad y usa una sesión programada o en curso para activar el QR", 409);
    }
    // DATETIME has second precision; avoid rounding the start into the next second.
    const now = Math.floor(Date.now() / 1000) * 1000;
    const from = minutes === null ? null : new Date(now);
    const until = minutes === null ? null : new Date(now + minutes * 60_000);
    await executeSql("UPDATE sesiones SET qr_token = COALESCE(qr_token, ?), qr_desde = ?, qr_hasta = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [randomBytes(32).toString("hex"), from, until, id], connection);
  });
}
export interface AttendanceRow {
  participante_id: number; nombres: string; apellidos: string; dni: string;
  inscripcion_estado: string; estado: string; fecha_hora_registro: Date | null; metodo: string | null;
}
export async function listAttendance(sessionId: number) {
  return queryRows<AttendanceRow>(`SELECT p.id AS participante_id, p.nombres, p.apellidos, p.dni,
    i.estado AS inscripcion_estado, COALESCE(x.estado, 'Pendiente') AS estado, x.fecha_hora_registro, x.metodo
    FROM sesiones s JOIN inscripciones i ON i.actividad_formativa_id = s.actividad_formativa_id
    JOIN participantes p ON p.id = i.participante_id
    LEFT JOIN asistencias x ON x.sesion_id = s.id AND x.participante_id = p.id
    WHERE s.id = ? AND (i.estado = 'Inscrita' OR x.id IS NOT NULL) ORDER BY p.apellidos, p.nombres, p.id`, [sessionId]);
}
export async function markAttendance(token: string, identity: { id?: number; dni?: string }) {
  return withTransaction(async connection => {
    const publicSession = await getPublicSession(token, connection);
    if (!publicSession) throw new AttendanceError("El enlace de la sesión no es válido", 404);
    // Lock in activity -> session -> enrollment order, consistent with registration.
    const [activity] = await queryRows<{ estado: string }>("SELECT estado FROM actividades_formativas WHERE id = ? FOR UPDATE", [publicSession.actividad_formativa_id], connection);
    const [session] = await queryRows<{ estado: string; qr_desde: Date | null; qr_hasta: Date | null }>(
      "SELECT estado, qr_desde, qr_hasta FROM sesiones WHERE id = ? AND qr_token = ? FOR UPDATE", [publicSession.id, token], connection);
    if (!session || !attendanceOpen({ ...session, actividad_estado: activity.estado })) {
      throw new AttendanceError("El registro de asistencia no está habilitado para esta sesión", 409);
    }
    if (!identity.id && !identity.dni) throw new AttendanceError("Ingresa tu DNI para confirmar la asistencia", 401);
    const [participant] = await queryRows<{ id: number; nombres: string; apellidos: string }>(
      `SELECT id, nombres, apellidos FROM participantes WHERE ${identity.dni ? "dni" : "id"} = ?`, [identity.dni ?? identity.id!], connection);
    if (!participant) throw new AttendanceError("No se encontró una inscripción activa en esta actividad", 403);
    const [enrollment] = await queryRows<{ estado: string }>("SELECT estado FROM inscripciones WHERE actividad_formativa_id = ? AND participante_id = ? FOR UPDATE",
      [publicSession.actividad_formativa_id, participant.id], connection);
    if (enrollment?.estado !== "Inscrita") throw new AttendanceError("No se encontró una inscripción activa en esta actividad", 403);
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);
    await executeSql(`INSERT INTO asistencias (sesion_id, participante_id, estado, fecha_hora_registro, metodo)
      VALUES (?, ?, 'Presente', ?, 'QR') ON DUPLICATE KEY UPDATE
      fecha_hora_registro = IF(estado = 'Presente', fecha_hora_registro, ?),
      metodo = IF(estado = 'Presente', metodo, 'QR'),
      registrado_por = IF(estado = 'Presente', registrado_por, NULL),
      updated_at = IF(estado = 'Presente', updated_at, CURRENT_TIMESTAMP), estado = 'Presente'`,
      [publicSession.id, participant.id, now, now], connection);
    // A current read also sees the winner of a concurrent duplicate insert under REPEATABLE READ.
    const [attendance] = await queryRows<{ fecha_hora_registro: Date }>("SELECT fecha_hora_registro FROM asistencias WHERE sesion_id = ? AND participante_id = ? FOR UPDATE", [publicSession.id, participant.id], connection);
    return { participantId: participant.id, participante: `${participant.nombres} ${participant.apellidos}`,
      estado: "Presente", fecha_hora_registro: attendance.fecha_hora_registro, mensaje: "Tu asistencia está confirmada" };
  });
}
