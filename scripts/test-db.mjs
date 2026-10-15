import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { load } from "./load-typescript.mjs";

dotenv.config({ path: ".env.local", quiet: true });
const db = load("../lib/db/index.ts");
const repo = load("../lib/db/repository.ts");
const tag = `QA-SQL-${randomUUID()}`;

async function main() {
  const before = await repo.getGlobalStats();
  const connection = await db.getPool().getConnection();
  try {
    await connection.beginTransaction();
    const role = await repo.getRole("Administrador", connection);
    const [type] = await repo.listActivityTypes(connection);
    assert(role && type, "La BD debe tener roles y al menos un tipo activo");
    const org = await repo.createOrganization({ nombre: `${tag} 100%_!`, ruc: tag.slice(-20), direccion: null, telefono: null, correo: null, logo_url: null, activo: true }, connection);
    assert.equal(org.activo, true);
    assert.equal((await repo.listOrganizations({ nombre: tag, activo: true }, connection)).length, 1);
    assert.equal((await repo.listOrganizations({ nombre: "100%_!" }, connection)).filter(x => x.id === org.id).length, 1);
    assert.equal((await repo.listOrganizations({ nombre: "' OR 1=1 --" }, connection)).length, 0);
    await assert.rejects(repo.createOrganization({ nombre: tag, ruc: org.ruc, direccion: null, telefono: null, correo: null, logo_url: null, activo: true }, connection), db.isDuplicateEntry);
    await repo.updateOrganization(org.id, { activo: false }, connection);
    assert.equal((await repo.getOrganization(org.id, connection)).activo, false);
    await repo.updateOrganization(org.id, { activo: false }, connection);
    await repo.updateOrganization(org.id, { activo: true, nombre: tag }, connection);
    await assert.rejects(repo.updateOrganization(-1, { activo: true }, connection), db.RecordNotFoundError);

    const user = await repo.createUser({ correo: `${tag}@example.invalid`, password: "hash-solo-prueba", rol_id: role.id, organizacion_id: org.id, activo: true }, connection);
    assert.equal((await repo.getUserByEmail(`${tag}@example.invalid`, connection)).rol.nombre, "Administrador");
    assert.equal(await repo.getUserByEmail("' OR 1=1 --", connection), null);
    await repo.updateUser(user.id, { rol_id: role.id, ultimo_acceso: new Date() }, connection);
    const users = await repo.listUsers({ organizacion_id: org.id, rol: "Administrador", correo: tag }, connection);
    assert.equal(users.length, 1); assert.equal("password" in users[0], false);
    const detail = await repo.getOrganizationDetail(org.id, connection);
    assert.equal("password" in detail.usuarios[0], false);
    assert.equal((await repo.listOrganizations({ nombre: tag }, connection))[0].cantidad_administradores, 1);

    const activity = await repo.createActivity({ organizacion_id: org.id, tipo_actividad_id: type.id, titulo: tag,
      descripcion: "Prueba SQL", instructor_nombres: null, instructor_apellidos: null, instructor_profesion: null,
      capacidad: 2, estado: "Borrador", inscripciones_abiertas: false, token_inscripcion: randomUUID().replaceAll("-", ""), creado_por: user.id }, connection);
    assert.equal(activity.inscripciones_abiertas, false);
    await repo.updateActivity(activity.id, { estado: "Publicada", inscripciones_abiertas: true }, connection);
    assert.equal((await repo.getActivityByToken(activity.token_inscripcion, connection)).inscripciones_abiertas, true);
    assert.equal((await repo.listActivities({ organizacion_id: org.id, titulo: tag, estado: "Publicada" }, connection)).length, 1);
    assert.equal((await repo.listActivities({ titulo: "' OR 1=1 --" }, connection)).length, 0);
    assert.equal((await repo.listActivities({ organizacion_id: -1 }, connection)).length, 0);

    const session = await repo.createSession({ actividad_formativa_id: activity.id, fecha: new Date("2026-10-10T00:00:00"),
      hora_inicio: new Date("1970-01-01T09:35:00Z"), hora_fin: new Date("1970-01-01T11:05:00Z"), modalidad: "Presencial", lugar: "QA", enlace_virtual: null, estado: "Programada" }, connection);
    assert.equal(session.fecha.toISOString(), "2026-10-10T00:00:00.000Z");
    assert.equal(session.hora_inicio.toISOString(), "1970-01-01T09:35:00.000Z");
    const [stored] = await db.queryRows("SELECT fecha, hora_inicio FROM sesiones WHERE id = ?", [session.id], connection);
    assert.equal(stored.fecha, "2026-10-10"); assert.equal(stored.hora_inicio, "09:35:00");
    await repo.updateSession(session.id, { estado: "En_curso" }, connection);
    assert.equal((await repo.listSessions(activity.id, connection))[0].estado, "En_curso");

    const dni = String(10_000_000 + Math.floor(Math.random() * 89_999_999));
    assert.equal(await repo.getParticipantByDni(dni, connection), null, "Elegir DNI de prueba libre");
    const participant = await repo.createParticipant({ nombres: "QA", apellidos: tag, dni, telefono: null, direccion: null }, connection);
    const enrollment = await repo.createEnrollment({ actividad_formativa_id: activity.id, participante_id: participant.id, estado: "Inscrita" }, connection);
    assert.equal(await repo.countEnrollments(activity.id, connection), 1);
    assert.equal((await repo.getEnrollmentByParticipant(participant.id, activity.id, connection)).id, enrollment.id);
    assert.equal((await repo.listEnrollments(activity.id, connection))[0].participante.dni, dni);
    await assert.rejects(repo.createEnrollment({ actividad_formativa_id: activity.id, participante_id: participant.id, estado: "Inscrita" }, connection), db.isDuplicateEntry);
    await repo.updateEnrollment(enrollment.id, { estado: "Cancelada", fecha_cancelacion: new Date() }, connection);
    assert.equal(await repo.countEnrollments(activity.id, connection), 0);
    await repo.updateEnrollment(enrollment.id, { estado: "Inscrita", fecha_cancelacion: null }, connection);
    assert.equal((await repo.getActivityDetail(activity.id, connection))._count.inscripciones, 1);
    assert.equal((await repo.getActivityDetail(activity.id, connection)).sesiones.length, 1);
    await db.executeSql("INSERT INTO asistencias (sesion_id, participante_id, estado) VALUES (?, ?, 'Presente')", [session.id, participant.id], connection);
    await assert.rejects(repo.deleteSession(session.id, connection));
    await db.executeSql("DELETE FROM asistencias WHERE sesion_id = ?", [session.id], connection);
    await repo.deleteSession(session.id, connection);
    assert.equal(await repo.getSession(session.id, connection), null);
    console.log("OK: SQL parametrizado, filtros, booleanos, fechas/horas, CRUD, relaciones, duplicados y guardas de eliminación.");
  } finally {
    await connection.rollback(); connection.release();
  }
  assert.deepEqual(await repo.getGlobalStats(), before, "La transacción de prueba debe revertir sus registros");
  console.log("OK: rollback; conteos originales conservados.");
}
try { await main(); } catch (error) { console.error(error instanceof assert.AssertionError ? error.message : `Error de prueba: ${error.code ?? error.name}`); process.exitCode = 1; }
finally { await db.closePool(); }
