import { executeSql, queryRows, withTransaction } from "./index";
import { countEnrollments, createEnrollment, getEnrollmentByParticipant, updateEnrollment } from "./repository";
import type { Actividad, NuevoParticipante } from "./types";

export class RegistrationError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function registerParticipant(token: string, data: NuevoParticipante) {
  return withTransaction(async connection => {
    // Serialize registrations for this activity before counting available places.
    const [activity] = await queryRows<Actividad>(
      "SELECT * FROM actividades_formativas WHERE token_inscripcion = ? FOR UPDATE", [token], connection);
    if (!activity) throw new RegistrationError("El enlace no corresponde a una actividad", 404);
    if (activity.estado !== "Publicada") throw new RegistrationError("Las inscripciones aún no están abiertas", 409);
    if (!activity.inscripciones_abiertas) throw new RegistrationError("Las inscripciones están cerradas", 409);
    if (activity.capacidad !== null && await countEnrollments(activity.id, connection) >= activity.capacidad) {
      throw new RegistrationError("El cupo de la actividad está completo", 409);
    }

    // Reuse the unique DNI atomically, even when two different activities register it.
    // No personal data of an existing participant is overwritten.
    const result = await executeSql(`INSERT INTO participantes (nombres, apellidos, dni, telefono, direccion)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [data.nombres, data.apellidos, data.dni, data.telefono, data.direccion], connection);
    const participantId = result.insertId;
    const existing = await getEnrollmentByParticipant(participantId, activity.id, connection);
    if (existing?.estado === "Inscrita") throw new RegistrationError("Ya te encuentras inscrito en esta actividad", 409);
    if (existing) {
      await updateEnrollment(existing.id, { estado: "Inscrita", fecha_cancelacion: null }, connection);
      return { ok: true, mensaje: "Tu inscripción estaba cancelada y fue reactivada", participantId };
    }
    const enrollment = await createEnrollment({ actividad_formativa_id: activity.id, participante_id: participantId, estado: "Inscrita" }, connection);
    return { ok: true, mensaje: "Inscripción registrada correctamente", participantId, participante: `${enrollment.participante.nombres} ${enrollment.participante.apellidos}` };
  });
}
