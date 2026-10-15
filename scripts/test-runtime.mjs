import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { load } from "./load-typescript.mjs";

dotenv.config({ path: ".env.local", quiet: true });
const db = load("../lib/db/index.ts");
const repo = load("../lib/db/repository.ts");
const tag = `QA-HTTP-${randomUUID()}`;
const base = "http://127.0.0.1:3197";
const orgIds = []; const userIds = []; const dnis = [];
let server;
let output = "";

class Client {
  cookies = new Map();
  async request(path, options = {}) {
    const response = await fetch(`${base}${path}`, { ...options, redirect: "manual", signal: AbortSignal.timeout(30_000),
      headers: { Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "), ...options.headers } });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0]; const split = pair.indexOf("=");
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    if (/application\/(pdf|vnd.openxmlformats)/.test(response.headers.get("content-type") || "")) return { status: response.status, data: Buffer.from(await response.arrayBuffer()) };
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  }
  json(path, method, body) { return this.request(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  async login(correo, password) {
    const csrf = await this.request("/api/auth/csrf");
    return this.request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.data.csrfToken, correo, password, json: "true", callbackUrl: `${base}/dashboard` }) });
  }
}

async function freshDni() {
  for (;;) {
    const dni = String(10_000_000 + Math.floor(Math.random() * 89_999_999));
    if (!dnis.includes(dni) && !await repo.getParticipantByDni(dni)) { dnis.push(dni); return dni; }
  }
}
async function createOrg(suffix) {
  const org = await repo.createOrganization({ nombre: `${tag}-${suffix}`, ruc: null, direccion: null, telefono: null, correo: null, logo_url: null, activo: true });
  orgIds.push(org.id); return org;
}
async function createAccount(roleName, orgId, activo = true) {
  const role = await repo.getRole(roleName); assert(role, `Falta rol ${roleName}`);
  const password = randomBytes(16).toString("hex");
  const correo = `${tag}-${roleName}-${activo}@example.invalid`;
  const user = await repo.createUser({ correo, password: await bcrypt.hash(password, 10), rol_id: role.id, organizacion_id: orgId, activo });
  userIds.push(user.id);
  return { ...user, password, correo };
}
async function check(result, expected, message) { assert.equal(result.status, expected, `${message}: ${result.status}, ${JSON.stringify(result.data).slice(0, 200)}`); return result.data; }

async function main() {
  const before = await repo.getGlobalStats();
  const org = await createOrg("A"); const other = await createOrg("B");
  const superAccount = await createAccount("SuperAdmin", null);
  const adminAccount = await createAccount("Administrador", org.id);
  const subAccount = await createAccount("Subadministrador", org.id);
  const participantAccount = await createAccount("Participante", org.id);
  const inactiveAccount = await createAccount("Administrador", org.id, false);
  const [type] = await repo.listActivityTypes(); assert(type, "Falta un tipo activo");

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3197"], {
    cwd: process.cwd(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXTAUTH_URL: base, NEXTAUTH_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "production" },
  });
  server.stdout.on("data", chunk => { output = (output + chunk).slice(-6000); });
  server.stderr.on("data", chunk => { output = (output + chunk).slice(-6000); });
  server.on("error", error => { output += error.message; });
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (server.exitCode !== null) throw new Error("El servidor de prueba terminó antes de arrancar");
    try { ready = (await fetch(`${base}/api/auth/csrf`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* starting */ }
    if (ready) break; await delay(500);
  }
  assert(ready, "El servidor de prueba no arrancó");
  const anonymous = new Client(); const admin = new Client(); const superadmin = new Client(); const sub = new Client(); const participant = new Client(); const bad = new Client();
  await check(await anonymous.request("/api/actividades"), 401, "Actividades sin sesión");
  await check(await anonymous.request("/api/superadmin/stats"), 401, "Estadísticas sin sesión");
  await check(await anonymous.request("/api/configuracion/organizacion"), 401, "Configuración de organización sin sesión");
  await check(await anonymous.request("/api/configuracion/cuenta"), 401, "Configuración de cuenta sin sesión");
  for (const [client, account] of [[admin, adminAccount], [superadmin, superAccount]]) {
    await client.login(account.correo, account.password);
    const session = await check(await client.request("/api/auth/session"), 200, "Sesión");
    assert.equal(session.user.correo, account.correo);
  }
  await participant.login(participantAccount.correo, participantAccount.password);
  assert.equal((await participant.request("/api/auth/session")).data.user, undefined, "El rol Participante no inicia sesión");
  await sub.login(subAccount.correo, subAccount.password);
  assert.equal((await sub.request("/api/auth/session")).data.user, undefined, "El rol retirado no inicia sesión");
  await bad.login(inactiveAccount.correo, inactiveAccount.password);
  assert.equal((await bad.request("/api/auth/session")).data.user, undefined);
  await bad.login(adminAccount.correo, "incorrecta");
  assert.equal((await bad.request("/api/auth/session")).data.user, undefined);
  assert((await repo.getUser(adminAccount.id)).ultimo_acceso instanceof Date);
  await check(await admin.request("/api/superadmin/stats"), 401, "Estadísticas restringidas");
  await check(await superadmin.request("/api/superadmin/stats"), 200, "Estadísticas globales");
  await check(await participant.request("/api/usuarios"), 401, "Participante sin sesión de gestión");
  await check(await sub.json("/api/usuarios", "POST", { correo: `${tag}-blocked@example.invalid`, password: "qa123456", rol: "Administrador" }), 401, "Subadmin no crea gestores");

  const newOrg = await check(await superadmin.json("/api/superadmin/organizaciones", "POST", { nombre: `${tag}-API`, ruc: tag.slice(-20) }), 201, "Crear organización"); orgIds.push(newOrg.id);
  assert.equal(newOrg.activo, true);
  const ownConfig = await check(await admin.request("/api/configuracion/organizacion"), 200, "Configuración de organización propia");
  assert.equal(ownConfig.organizacion.id, org.id);
  await check(await admin.json("/api/configuracion/organizacion", "PATCH", null), 400, "Objeto de organización requerido");
  const configOptions = await check(await superadmin.request("/api/configuracion/organizacion"), 200, "Selector de organizaciones");
  assert(configOptions.organizaciones.some(item => item.id === org.id));
  assert(configOptions.organizaciones.some(item => item.id === other.id));
  assert.equal(configOptions.organizacion, null);
  const selectedConfig = await check(await superadmin.request(`/api/configuracion/organizacion?organizacion_id=${other.id}`), 200, "Configuración global de organización");
  assert.equal(selectedConfig.organizacion.id, other.id);
  await check(await admin.request(`/api/configuracion/organizacion?organizacion_id=${other.id}`), 403, "Administrador no consulta otra organización");
  const ownOrgUpdated = await check(await admin.json("/api/configuracion/organizacion", "PATCH", {
    organizacion_id: org.id, nombre: `${tag}-A-configurada`, ruc: org.ruc, direccion: "Dirección QA",
    telefono: "999123456", correo: "qa@example.invalid", logo_url: "https://example.invalid/logo.png",
  }), 200, "Administrador actualiza su organización");
  assert.equal(ownOrgUpdated.organizacion.direccion, "Dirección QA");
  assert.equal(ownOrgUpdated.organizacion.logo_url, "https://example.invalid/logo.png");
  await check(await admin.json("/api/configuracion/organizacion", "PATCH", {
    organizacion_id: org.id, nombre: `${tag}-A-configurada`, logo_url: "javascript:alert(1)",
  }), 400, "URL de logo insegura rechazada");
  await check(await admin.json("/api/configuracion/organizacion", "PATCH", {
    organizacion_id: other.id, nombre: `${tag}-fuera-de-alcance`,
  }), 403, "Administrador no actualiza otra organización");
  await check(await superadmin.json("/api/configuracion/organizacion", "PATCH", {
    organizacion_id: other.id, nombre: `${tag}-B-configurada`, ruc: other.ruc, direccion: "",
    telefono: "", correo: "", logo_url: "",
  }), 200, "SuperAdmin actualiza organización seleccionada");
  const adminAccountInfo = await check(await admin.request("/api/configuracion/cuenta"), 200, "Datos de mi cuenta");
  assert.equal(adminAccountInfo.correo, adminAccount.correo);
  assert.equal(adminAccountInfo.nombre, adminAccount.correo, "Correo se muestra como nombre hasta que exista un campo de nombre");
  await check(await admin.json("/api/configuracion/cuenta", "PATCH", null), 400, "Objeto de contraseña requerido");
  await check(await admin.json("/api/configuracion/cuenta", "PATCH", {
    currentPassword: "incorrecta", newPassword: "new-secure-password", confirmPassword: "new-secure-password",
  }), 400, "Contraseña actual incorrecta rechazada");
  await check(await admin.json("/api/configuracion/cuenta", "PATCH", {
    currentPassword: adminAccount.password, newPassword: "new-secure-password", confirmPassword: "otra-password",
  }), 400, "Confirmación de contraseña distinta rechazada");
  await check(await admin.json("/api/configuracion/cuenta", "PATCH", {
    currentPassword: adminAccount.password, newPassword: "new-secure-password", confirmPassword: "new-secure-password",
  }), 200, "Cambio de contraseña");
  const oldPasswordClient = new Client();
  await oldPasswordClient.login(adminAccount.correo, adminAccount.password);
  assert.equal((await oldPasswordClient.request("/api/auth/session")).data.user, undefined, "Contraseña anterior deja de funcionar");
  adminAccount.password = "new-secure-password";
  const newPasswordClient = new Client();
  await newPasswordClient.login(adminAccount.correo, adminAccount.password);
  assert.equal((await newPasswordClient.request("/api/auth/session")).data.user.correo, adminAccount.correo, "La nueva contraseña permite iniciar sesión");
  await check(await superadmin.json(`/api/superadmin/organizaciones/${newOrg.id}`, "PUT", { nombre: `${tag}-API-edit`, ruc: newOrg.ruc }), 200, "Editar organización");
  await check(await superadmin.json(`/api/superadmin/organizaciones/${newOrg.id}`, "PATCH", { activo: false }), 200, "Desactivar organización");
  await check(await superadmin.json("/api/superadmin/organizaciones", "POST", { nombre: tag, ruc: newOrg.ruc }), 409, "RUC duplicado");
  const orgDetail = await check(await superadmin.request(`/api/superadmin/organizaciones/${org.id}`), 200, "Detalle organización");
  assert.equal(orgDetail.usuarios.some(user => "password" in user), false);
  const orgs = await check(await superadmin.request(`/api/superadmin/organizaciones?q=${encodeURIComponent(tag)}`), 200, "Filtro organizaciones");
  assert.equal(orgs.length, 3);

  const newUser = await check(await admin.json("/api/usuarios", "POST", { correo: `${tag}-created@example.invalid`, password: "qa123456", rol: "Administrador", organizacion_id: other.id }), 201, "Crear usuario con alcance"); userIds.push(newUser.id);
  assert.equal((await repo.getUser(newUser.id)).organizacion_id, org.id);
  await check(await admin.json(`/api/usuarios/${newUser.id}`, "PATCH", { activo: false }), 200, "Estado usuario");
  const users = await check(await admin.request(`/api/usuarios?q=${encodeURIComponent(tag)}`), 200, "Lista usuarios");
  assert(users.every(user => user.organizacion?.id === org.id && !("password" in user)));
  await check(await admin.json(`/api/usuarios/${adminAccount.id}`, "PATCH", { activo: false }), 400, "No desactivar propia cuenta");
  const otherUser = await check(await superadmin.json(`/api/superadmin/organizaciones/${other.id}/usuarios`, "POST", { correo: `${tag}-other@example.invalid`, password: "qa123456", rol: "Administrador" }), 201, "Gestor de otra organización"); userIds.push(otherUser.id);
  await check(await admin.json(`/api/usuarios/${otherUser.id}`, "PATCH", { activo: false }), 403, "Aislamiento usuarios");

  const activityData = { titulo: tag, tipo_actividad_id: type.id, organizacion_id: other.id, capacidad: 1,
    instructor_nombres: "Instructora QA", instructor_apellidos: "Nativa", instructor_profesion: "Docente" };
  const activity = await check(await admin.json("/api/actividades", "POST", activityData), 201, "Crear actividad");
  assert.equal(activity.organizacion_id, org.id); assert.equal(activity.inscripciones_abiertas, false);
  const foreign = await check(await superadmin.json("/api/actividades", "POST", { ...activityData, titulo: `${tag}-foreign` }), 201, "Actividad otra organización");
  await check(await admin.request(`/api/actividades/${foreign.id}`), 403, "Aislamiento detalle");
  await check(await admin.json(`/api/actividades/${foreign.id}`, "PATCH", { estado: "Publicada" }), 403, "Aislamiento escritura");
  await check(await admin.json(`/api/actividades/${activity.id}`, "PUT", { titulo: `${tag}-edit`, tipo_actividad_id: type.id, capacidad: 1 }), 200, "Editar actividad");
  await check(await admin.json(`/api/actividades/${activity.id}`, "PATCH", { estado: "Publicada", inscripciones_abiertas: true }), 200, "Publicar actividad");
  const activities = await check(await admin.request(`/api/actividades?q=${encodeURIComponent(tag)}&estado=Publicada`), 200, "Filtro actividades");
  assert.equal(activities.length, 1); assert.equal(activities[0].inscripciones_abiertas, true);

  const session = await check(await admin.json(`/api/actividades/${activity.id}/sesiones`, "POST", { fecha: "2026-10-10", hora_inicio: "09:35", hora_fin: "11:05", modalidad: "Presencial", lugar: "QA" }), 201, "Crear sesión");
  assert.equal(session.fecha, "2026-10-10T00:00:00.000Z"); assert.equal(session.hora_inicio, "1970-01-01T09:35:00.000Z");
  await check(await admin.json(`/api/sesiones/${session.id}`, "PUT", { fecha: "2026-10-11", hora_inicio: "10:15", hora_fin: "12:00", modalidad: "Virtual", enlace_virtual: "https://example.invalid/qa" }), 200, "Editar sesión");
  await check(await admin.json(`/api/sesiones/${session.id}`, "PATCH", { estado: "En_curso" }), 200, "Estado sesión");
  const sessions = await check(await admin.request(`/api/actividades/${activity.id}/sesiones`), 200, "Lista sesiones");
  assert.equal(sessions[0].hora_inicio, "1970-01-01T10:15:00.000Z");

  const [dniA, dniB] = [await freshDni(), await freshDni()];
  const publicActivity = await check(await anonymous.request(`/inscribirse/${activity.token_inscripcion}`), 200, "Página pública");
  assert(publicActivity.includes("Instructora QA Nativa"), "El enlace público muestra al instructor");
  assert(publicActivity.includes("11/10/2026") && publicActivity.includes("Virtual") && publicActivity.includes("QA"),
    "El enlace público muestra fecha, modalidad y lugar de la sesión");
  const registrations = await Promise.all([dniA, dniB].map(dni => anonymous.json(`/api/inscribirse/${activity.token_inscripcion}`, "POST", { nombres: "QA", apellidos: tag, dni })));
  assert.deepEqual(registrations.map(r => r.status).sort(), [201, 409], "Cupo uno ante dos solicitudes concurrentes");
  assert.equal(await repo.countEnrollments(activity.id), 1);
  const winner = registrations[0].status === 201 ? dniA : dniB;
  const loser = winner === dniA ? dniB : dniA;
  assert.equal(await repo.getParticipantByDni(loser), null, "Solicitud rechazada no deja participante huérfano");
  const enrollments = await check(await admin.request(`/api/actividades/${activity.id}/inscripciones`), 200, "Lista inscritos");
  assert.equal(enrollments.length, 1); assert.equal(enrollments[0].participante.dni, winner);
  await check(await admin.json(`/api/inscripciones/${enrollments[0].id}`, "PATCH", { estado: "Cancelada" }), 200, "Cancelar inscripción");
  await check(await anonymous.json(`/api/inscribirse/${activity.token_inscripcion}`, "POST", { nombres: "QA", apellidos: tag, dni: winner }), 201, "Reactivar por enlace");
  await check(await admin.json(`/api/inscripciones/${enrollments[0].id}`, "PATCH", { estado: "Cancelada" }), 200, "Cancelar nuevamente");
  await check(await admin.json(`/api/inscripciones/${enrollments[0].id}`, "PATCH", { estado: "Inscrita" }), 200, "Reactivar administrativo");
  const registered = await repo.getParticipantByDni(winner);
  const panel = await check(await admin.request(`/api/sesiones/${session.id}/asistencia`), 200, "Panel de asistencia");
  assert.equal(panel.activo, false); assert.equal(panel.asistentes[0].estado, "Pendiente");
  const qrToken = new URL(panel.enlace_asistencia).pathname.split("/").pop();
  const publicPath = new URL(panel.enlace).pathname;
  await check(await anonymous.request(publicPath), 200, "Compartir sesión pública");
  assert.equal((await db.queryRows("SELECT COUNT(*) AS n FROM asistencias WHERE sesion_id = ?", [session.id]))[0].n, 0, "Compartir no marca asistencia");
  await check(await anonymous.json(`/api/asistencia/${qrToken}`, "POST", {}), 409, "QR inicialmente cerrado");
  const otherClient = new Client(); await otherClient.login(otherUser.correo, "qa123456");
  await check(await otherClient.request(`/api/sesiones/${session.id}/asistencia`), 403, "Aislamiento tabla asistencia");
  await check(await otherClient.json(`/api/sesiones/${session.id}/asistencia`, "POST", { accion: "activar", minutos: 60 }), 403, "Aislamiento activación QR");
  await check(await admin.json(`/api/sesiones/${session.id}/asistencia`, "POST", { accion: "activar", minutos: -1 }), 400, "Ventana inválida");
  const active = await check(await admin.json(`/api/sesiones/${session.id}/asistencia`, "POST", { accion: "activar", minutos: 60 }), 200, "Activar QR");
  assert.equal(active.activo, true, "El QR se habilita inmediatamente"); assert(active.qr.startsWith("data:image/png;base64,"));
  assert(anonymous.cookies.has("nativa_participante"), "Inscripción recuerda participante");
  const marks = await Promise.all([1,2].map(() => anonymous.json(`/api/asistencia/${qrToken}`, "POST", {})));
  assert(marks.every(m => m.status === 200), `Marcados concurrentes idempotentes: ${JSON.stringify(marks)}`);
  assert.equal(marks[0].data.fecha_hora_registro, marks[1].data.fecha_hora_registro);
  assert.equal((await db.queryRows("SELECT COUNT(*) AS n FROM asistencias WHERE sesion_id = ?", [session.id]))[0].n, 1);
  const fresh = new Client();
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 401, "Otro navegador requiere DNI");
  fresh.cookies.set("nativa_participante", `${registered.id}.9999999999.firma-invalida`);
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 401, "Cookie falsificada rechazada");
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", { dni: loser }), 403, "No inscrito rechazado");
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", { dni: winner }), 200, "DNI alternativo");
  const table = await check(await admin.request(`/api/sesiones/${session.id}/asistencia`), 200, "Tabla actualizada");
  assert.equal(table.asistentes[0].estado, "Presente"); assert.equal(table.asistentes[0].metodo, "QR");
  await check(await admin.json(`/api/inscripciones/${enrollments[0].id}`, "PATCH", { estado: "Cancelada" }), 200, "Cancelar para QA asistencia");
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 403, "Inscripción cancelada no marca");
  await check(await admin.json(`/api/inscripciones/${enrollments[0].id}`, "PATCH", { estado: "Inscrita" }), 200, "Restaurar inscripción QA");
  await check(await admin.json(`/api/sesiones/${session.id}`, "PATCH", { estado: "Cancelada" }), 200, "Cancelar sesión QA");
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 409, "Sesión cancelada no marca");
  await check(await admin.json(`/api/sesiones/${session.id}`, "PATCH", { estado: "En_curso" }), 200, "Restaurar sesión QA");
  await db.executeSql("UPDATE sesiones SET qr_desde = ?, qr_hasta = ? WHERE id = ?", [new Date(Date.now()-120000),new Date(Date.now()-60000),session.id]);
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 409, "QR vencido rechazado");
  await check(await admin.json(`/api/sesiones/${session.id}/asistencia`, "POST", { accion: "cerrar" }), 200, "Cerrar QR");
  await check(await fresh.json(`/api/asistencia/${qrToken}`, "POST", {}), 409, "QR cerrado rechazado");
  const sessionData = { fecha: "2026-10-12", hora_inicio: "09:00", hora_fin: "10:00", modalidad: "Presencial", lugar: "QA Reportes" };
  await check(await admin.json(`/api/actividades/${activity.id}/sesiones`, "POST", sessionData), 201, "Segunda sesión para participantes únicos");
  const foreignSession = await check(await superadmin.json(`/api/actividades/${foreign.id}/sesiones`, "POST", sessionData), 201, "Sesión de otra organización");
  await check(await participant.request("/api/reportes"), 401, "Participante sin sesión para reportes");
  await check(await new Client().request("/api/reportes?formato=xlsx"), 401, "Exportación requiere autenticación");
  await check(await admin.request(`/api/reportes?organizacion_id=${other.id}`), 403, "Filtro no amplía alcance");
  await check(await admin.request("/api/reportes?desde=2026-02-30"), 400, "Fecha inexistente rechazada");
  const report = await check(await admin.request(`/api/reportes?actividad_id=${activity.id}`), 200, "Reporte por actividad");
  assert.equal(report.resumen.sesiones, 2); assert.equal(report.resumen.participantes_unicos, 1);
  assert.equal(report.resumen.presentes, 1); assert.equal(report.resumen.asistencias_esperadas, 2); assert.equal(report.resumen.porcentaje, 50);
  assert(report.sesiones.every(row => row.actividad_id === activity.id));
  const dated = await check(await admin.request("/api/reportes?desde=2026-10-12&hasta=2026-10-12"), 200, "Rango inclusivo por sesión");
  assert.equal(dated.sesiones.length, 1); assert.equal(dated.sesiones[0].pendientes, 1);
  const globalReport = await check(await superadmin.request(`/api/reportes?organizacion_id=${other.id}`), 200, "Filtro global por organización");
  assert.equal(globalReport.sesiones.length, 1); assert.equal(globalReport.sesiones[0].sesion_id, foreignSession.id);
  const forbiddenActivity = await check(await admin.request(`/api/reportes?actividad_id=${foreign.id}`), 200, "Actividad ajena no filtra datos");
  assert.equal(forbiddenActivity.sesiones.length, 0);
  const excel = await check(await admin.request(`/api/reportes?actividad_id=${activity.id}&formato=xlsx`), 200, "Exportar Excel");
  const ExcelJS = load("exceljs"); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(excel);
  assert.equal(workbook.getWorksheet("Asistencia por sesión").rowCount, 3);
  assert.equal(workbook.getWorksheet("Resumen").getCell("B6").value, 1);
  const pdf = await check(await admin.request(`/api/reportes?actividad_id=${activity.id}&formato=pdf`), 200, "Exportar PDF");
  assert.equal(pdf.subarray(0,4).toString(), "%PDF");
  await check(await admin.request("/dashboard/reportes"), 200, "Página reportes administrador");
  await check(await superadmin.request("/superadmin/reportes"), 200, "Página reportes global");
  await check(await admin.request("/dashboard/configuracion"), 200, "Página configuración administrador");
  await check(await superadmin.request("/superadmin/configuracion"), 200, "Página configuración SuperAdmin");
  if (process.env.NATIVA_QA_DIR) {
    const { mkdir, writeFile } = await import("node:fs/promises"); const { join } = await import("node:path");
    await mkdir(process.env.NATIVA_QA_DIR, { recursive: true });
    await writeFile(join(process.env.NATIVA_QA_DIR, "reporte-prueba.pdf"), pdf);
    await writeFile(join(process.env.NATIVA_QA_DIR, "reporte-prueba.xlsx"), excel);
  }
  if (process.env.NATIVA_BROWSER_QA === "1") {
    const { runBrowserQa } = await import("./test-browser.mjs");
    await runBrowserQa({ base, adminCookies: admin.cookies, participantCookies: anonymous.cookies,
      activityId: activity.id, attendancePath: new URL(panel.enlace_asistencia).pathname, publicPath });
  }
  console.log("OK: QR, cookie firmada, DNI alternativo, concurrencia, ventanas, tabla y reportes PDF/Excel con aislamiento.");
  await check(await admin.request(`/api/sesiones/${session.id}`, { method: "DELETE" }), 409, "Sesión con asistencia no se elimina");
  await db.executeSql("DELETE FROM asistencias WHERE sesion_id = ? AND participante_id = ?", [session.id, registered.id]);
  await check(await admin.request(`/api/sesiones/${session.id}`, { method: "DELETE" }), 200, "Eliminar sesión sin asistencia");
  for (const path of [`/dashboard/actividades/${activity.id}/editar`, `/superadmin/actividades/${activity.id}/editar`, `/superadmin/organizaciones/${org.id}`, `/superadmin/organizaciones/${org.id}/editar`]) {
    await check(await superadmin.request(path), 200, "Página servidor SQL");
  }
  console.log("OK: login, sesiones JWT, APIs, aislamiento por organización, páginas servidor, CRUD y cupo concurrente.");
  return before;
}

async function cleanup() {
  for (const id of orgIds) {
    await db.executeSql("DELETE x FROM asistencias x JOIN sesiones s ON s.id = x.sesion_id JOIN actividades_formativas a ON a.id = s.actividad_formativa_id WHERE a.organizacion_id = ?", [id]);
    await db.executeSql("DELETE i FROM inscripciones i JOIN actividades_formativas a ON a.id = i.actividad_formativa_id WHERE a.organizacion_id = ?", [id]);
    await db.executeSql("DELETE s FROM sesiones s JOIN actividades_formativas a ON a.id = s.actividad_formativa_id WHERE a.organizacion_id = ?", [id]);
    await db.executeSql("DELETE FROM actividades_formativas WHERE organizacion_id = ?", [id]);
    await db.executeSql("DELETE FROM usuarios WHERE organizacion_id = ?", [id]);
    await db.executeSql("DELETE FROM organizaciones WHERE id = ?", [id]);
  }
  for (const id of userIds) await db.executeSql("DELETE FROM usuarios WHERE id = ?", [id]);
  for (const dni of dnis) await db.executeSql("DELETE FROM participantes WHERE dni = ? AND apellidos = ?", [dni, tag]);
}
async function stopServer() {
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    else server.kill("SIGTERM");
    await exited;
  }
}
let before;
try { before = await main(); }
catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : `Error de runtime: ${error.code ?? error.name}: ${error.message}`);
  if (output.includes("Error:")) console.error(output.split(/\r?\n/).filter(line => /Error al marcar asistencia:|code:|sqlMessage:/.test(line)).join("\n"));
  console.error(error.stack?.split("\n").filter(line => line.includes("scripts/test-runtime.mjs")).join("\n"));
  process.exitCode = 1;
} finally {
  try { await cleanup(); if (before) assert.deepEqual(await repo.getGlobalStats(), before); console.log("OK: registros de prueba retirados y conteos originales conservados."); }
  catch (error) { console.error(`Error de limpieza: ${error.code ?? error.name}`); process.exitCode = 1; }
  try { await stopServer(); console.log("OK: servidor de prueba detenido."); }
  catch (error) { console.error(`Error al detener servidor: ${error.code ?? error.name}`); process.exitCode = 1; }
  await db.closePool();
}
