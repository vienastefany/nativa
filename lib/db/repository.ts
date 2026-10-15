import { executeSql, queryRows, RecordNotFoundError, type SqlExecutor, type SqlValue } from "./index";
import { randomBytes } from "node:crypto";
import type { Actividad, Inscripcion, NuevaActividad, NuevaOrganizacion, NuevaSesion, NuevoParticipante, NuevoUsuario, Organizacion, Participante, Rol, Sesion, Usuario } from "./types";

// Identifiers come from internal allowlists; user values only enter as parameters.
const columns = {
  organizaciones: ["nombre", "ruc", "direccion", "telefono", "correo", "logo_url", "activo"],
  usuarios: ["correo", "password", "rol_id", "organizacion_id", "activo", "ultimo_acceso"],
  actividades_formativas: ["organizacion_id", "tipo_actividad_id", "titulo", "descripcion", "instructor_nombres", "instructor_apellidos", "instructor_profesion", "capacidad", "estado", "inscripciones_abiertas", "token_inscripcion", "creado_por"],
  sesiones: ["actividad_formativa_id", "fecha", "hora_inicio", "hora_fin", "modalidad", "lugar", "enlace_virtual", "estado", "qr_token"],
  participantes: ["nombres", "apellidos", "dni", "telefono", "direccion"],
  inscripciones: ["actividad_formativa_id", "participante_id", "estado", "fecha_cancelacion"],
} as const;
type Table = keyof typeof columns;

function entries(table: Table, data: object): [string, SqlValue][] {
  const result = Object.entries(data).filter(([, value]) => value !== undefined);
  for (const [name] of result) {
    if (!(columns[table] as readonly string[]).includes(name)) throw new Error("Columna SQL no permitida");
  }
  return result as [string, SqlValue][];
}
async function insert(table: Table, data: object, executor?: SqlExecutor) {
  const fields = entries(table, data);
  const result = await executeSql(`INSERT INTO ${table} (${fields.map(([name]) => name).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`, fields.map(([, value]) => value), executor);
  return result.insertId;
}
async function update(table: Table, id: number, data: object, executor?: SqlExecutor) {
  const fields = entries(table, data);
  if (fields.length === 0) throw new Error("Sin cambios que aplicar");
  const result = await executeSql(`UPDATE ${table} SET ${fields.map(([name]) => `${name} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...fields.map(([, value]) => value), id], executor);
  if (result.affectedRows === 0) {
    // No-op updates are valid. Check existence instead of assuming deletion.
    const existing = await queryRows<{ id: number }>(`SELECT id FROM ${table} WHERE id = ?`, [id], executor);
    if (!existing.length) throw new RecordNotFoundError();
  }
}
function required<T>(record: T | null): T {
  if (!record) throw new RecordNotFoundError();
  return record;
}
function contains(value: string) { return `%${value.replace(/[!%_]/g, "!$&")}%`; }
function organization(row: Organizacion): Organizacion { return { ...row, activo: Boolean(row.activo) }; }
function activity(row: Actividad): Actividad { return { ...row, inscripciones_abiertas: Boolean(row.inscripciones_abiertas) }; }
export interface FiltroOrganizaciones { nombre?: string; activo?: boolean }
export interface FiltroUsuarios { rol?: string; organizacion_id?: number; correo?: string; activo?: boolean }
export interface FiltroActividades { organizacion_id?: number; titulo?: string; estado?: string }

export async function getOrganization(id: number, executor?: SqlExecutor) {
  const [row] = await queryRows<Organizacion>("SELECT * FROM organizaciones WHERE id = ?", [id], executor);
  return row ? organization(row) : null;
}
export async function listOrganizations(filters: FiltroOrganizaciones = {}, executor?: SqlExecutor) {
  const where: string[] = []; const values: SqlValue[] = [];
  if (filters.nombre) { where.push("o.nombre LIKE ? ESCAPE '!'"); values.push(contains(filters.nombre)); }
  if (filters.activo !== undefined) { where.push("o.activo = ?"); values.push(filters.activo); }
  const rows = await queryRows<Organizacion & { cantidad_administradores: number; cantidad_actividades: number }>(`
    SELECT o.*,
      (SELECT COUNT(*) FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE u.organizacion_id = o.id AND r.nombre = 'Administrador') AS cantidad_administradores,
      (SELECT COUNT(*) FROM actividades_formativas a WHERE a.organizacion_id = o.id) AS cantidad_actividades
    FROM organizaciones o ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.id DESC`, values, executor);
  return rows.map(row => ({ ...organization(row), cantidad_administradores: Number(row.cantidad_administradores), cantidad_actividades: Number(row.cantidad_actividades) }));
}
export async function getOrganizationDetail(id: number, executor?: SqlExecutor) {
  const org = await getOrganization(id, executor);
  if (!org) return null;
  // Password hashes never leave the authentication query.
  const users = await queryRows<Pick<Usuario, "id" | "correo" | "activo" | "created_at" | "rol_id" | "organizacion_id"> & { rol_nombre: string }>(`
    SELECT u.id, u.correo, u.activo, u.created_at, u.rol_id, u.organizacion_id, r.nombre AS rol_nombre
    FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.organizacion_id = ? ORDER BY u.id ASC`, [id], executor);
  const actividades = await queryRows<Pick<Actividad, "id" | "titulo" | "estado" | "created_at">>("SELECT id, titulo, estado, created_at FROM actividades_formativas WHERE organizacion_id = ? ORDER BY id DESC", [id], executor);
  return { ...org, usuarios: users.map(({ rol_nombre, ...u }) => ({ ...u, activo: Boolean(u.activo), rol: { id: u.rol_id, nombre: rol_nombre } })), actividades };
}
export async function createOrganization(data: NuevaOrganizacion, executor?: SqlExecutor) {
  return required(await getOrganization(await insert("organizaciones", data, executor), executor));
}
export async function updateOrganization(id: number, data: Partial<NuevaOrganizacion>, executor?: SqlExecutor) {
  await update("organizaciones", id, data, executor);
  return required(await getOrganization(id, executor));
}
export async function getRole(nombre: string, executor?: SqlExecutor) {
  const [row] = await queryRows<Rol>("SELECT * FROM roles WHERE nombre = ?", [nombre], executor);
  return row ? { ...row, activo: Boolean(row.activo) } : null;
}

type UserRow = Usuario & { rol_nombre: string; org_nombre: string | null };
const userSelect = `SELECT u.*, r.nombre AS rol_nombre, o.nombre AS org_nombre
  FROM usuarios u JOIN roles r ON r.id = u.rol_id LEFT JOIN organizaciones o ON o.id = u.organizacion_id`;
function user(row: UserRow) {
  const { rol_nombre, org_nombre, ...u } = row;
  return { ...u, activo: Boolean(u.activo), rol: { id: u.rol_id, nombre: rol_nombre }, organizacion: u.organizacion_id === null ? null : { id: u.organizacion_id, nombre: org_nombre ?? "" } };
}
export async function getUserByEmail(correo: string, executor?: SqlExecutor) {
  const [row] = await queryRows<UserRow>(`${userSelect} WHERE u.correo = ?`, [correo], executor);
  return row ? user(row) : null;
}
export async function getUser(id: number, executor?: SqlExecutor) {
  const [row] = await queryRows<UserRow>(`${userSelect} WHERE u.id = ?`, [id], executor);
  return row ? user(row) : null;
}
export async function listUsers(filters: FiltroUsuarios = {}, executor?: SqlExecutor) {
  const where = ["r.nombre <> 'SuperAdmin'"]; const values: SqlValue[] = [];
  if (filters.rol) { where.push("r.nombre = ?"); values.push(filters.rol); }
  if (filters.organizacion_id !== undefined) { where.push("u.organizacion_id = ?"); values.push(filters.organizacion_id); }
  if (filters.correo) { where.push("u.correo LIKE ? ESCAPE '!'"); values.push(contains(filters.correo)); }
  if (filters.activo !== undefined) { where.push("u.activo = ?"); values.push(filters.activo); }
  type ListRow = Pick<Usuario, "id" | "correo" | "activo" | "ultimo_acceso" | "created_at" | "organizacion_id"> & { rol_nombre: string; org_nombre: string | null; nombres: string | null; apellidos: string | null; dni: string | null };
  const rows = await queryRows<ListRow>(`
    SELECT u.id, u.correo, u.activo, u.ultimo_acceso, u.created_at, u.organizacion_id,
      r.nombre AS rol_nombre, o.nombre AS org_nombre, p.nombres, p.apellidos, p.dni
    FROM usuarios u JOIN roles r ON r.id = u.rol_id
    LEFT JOIN organizaciones o ON o.id = u.organizacion_id LEFT JOIN participantes p ON p.usuario_id = u.id
    WHERE ${where.join(" AND ")} ORDER BY u.id DESC`, values, executor);
  return rows.map(row => ({ id: row.id, correo: row.correo, activo: Boolean(row.activo), ultimo_acceso: row.ultimo_acceso, created_at: row.created_at,
    rol: { nombre: row.rol_nombre }, organizacion: row.organizacion_id === null ? null : { id: row.organizacion_id, nombre: row.org_nombre },
    participante: row.dni === null ? null : { nombres: row.nombres, apellidos: row.apellidos, dni: row.dni } }));
}
export async function createUser(data: NuevoUsuario, executor?: SqlExecutor) {
  const row = required(await getUser(await insert("usuarios", data, executor), executor));
  return { id: row.id, correo: row.correo, activo: row.activo, rol: row.rol };
}
export async function updateUser(id: number, data: Partial<Pick<Usuario, "activo" | "rol_id" | "ultimo_acceso">>, executor?: SqlExecutor) {
  await update("usuarios", id, data, executor);
  const row = required(await getUser(id, executor));
  return { id: row.id, correo: row.correo, activo: row.activo, rol: { nombre: row.rol.nombre } };
}
export async function listActivityTypes(executor?: SqlExecutor) {
  return queryRows<{ id: number; nombre: string }>("SELECT id, nombre FROM tipos_actividad WHERE activo = 1 ORDER BY nombre ASC", [], executor);
}

type ActivityRow = Actividad & { tipo_nombre: string; org_nombre: string; creador_correo: string; total_sesiones: number; total_inscritos: number };
const activitySelect = `SELECT a.*, t.nombre AS tipo_nombre, o.nombre AS org_nombre, u.correo AS creador_correo,
  (SELECT COUNT(*) FROM sesiones s WHERE s.actividad_formativa_id = a.id) AS total_sesiones,
  (SELECT COUNT(*) FROM inscripciones i WHERE i.actividad_formativa_id = a.id AND i.estado = 'Inscrita') AS total_inscritos
  FROM actividades_formativas a JOIN tipos_actividad t ON t.id = a.tipo_actividad_id
  JOIN organizaciones o ON o.id = a.organizacion_id JOIN usuarios u ON u.id = a.creado_por`;
function activityRelations(row: ActivityRow) {
  const { tipo_nombre, org_nombre, creador_correo, total_sesiones, total_inscritos, ...a } = row;
  return { ...activity(a), tipo_actividad: { id: a.tipo_actividad_id, nombre: tipo_nombre },
    organizacion: { id: a.organizacion_id, nombre: org_nombre }, creador: { id: a.creado_por, correo: creador_correo },
    _count: { sesiones: Number(total_sesiones), inscripciones: Number(total_inscritos) } };
}
export async function listActivities(filters: FiltroActividades = {}, executor?: SqlExecutor) {
  const where: string[] = []; const values: SqlValue[] = [];
  if (filters.organizacion_id !== undefined) { where.push("a.organizacion_id = ?"); values.push(filters.organizacion_id); }
  if (filters.titulo) { where.push("a.titulo LIKE ? ESCAPE '!'"); values.push(contains(filters.titulo)); }
  if (filters.estado) { where.push("a.estado = ?"); values.push(filters.estado); }
  return (await queryRows<ActivityRow>(`${activitySelect} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY a.id DESC`, values, executor)).map(activityRelations);
}
export async function getActivity(id: number, executor?: SqlExecutor) {
  const [row] = await queryRows<ActivityRow>(`${activitySelect} WHERE a.id = ?`, [id], executor);
  return row ? activityRelations(row) : null;
}
export async function getActivityByToken(token: string, executor?: SqlExecutor) {
  const [row] = await queryRows<ActivityRow>(`${activitySelect} WHERE a.token_inscripcion = ?`, [token], executor);
  return row ? activityRelations(row) : null;
}
export async function getActivityDetail(id: number, executor?: SqlExecutor) {
  const a = await getActivity(id, executor);
  return a ? { ...a, sesiones: await listSessions(id, executor) } : null;
}
export async function createActivity(data: NuevaActividad, executor?: SqlExecutor) {
  const id = await insert("actividades_formativas", data, executor);
  const [row] = await queryRows<Actividad>("SELECT * FROM actividades_formativas WHERE id = ?", [id], executor);
  return activity(required(row ?? null));
}
export async function updateActivity(id: number, data: Partial<NuevaActividad>, executor?: SqlExecutor) {
  await update("actividades_formativas", id, data, executor);
  const [row] = await queryRows<Actividad>("SELECT * FROM actividades_formativas WHERE id = ?", [id], executor);
  return activity(required(row ?? null));
}

type SessionRow = Omit<Sesion, "fecha" | "hora_inicio" | "hora_fin"> & { fecha: string; hora_inicio: string; hora_fin: string };
function session(row: SessionRow): Sesion {
  return { ...row, fecha: new Date(`${row.fecha}T00:00:00.000Z`),
    hora_inicio: new Date(`1970-01-01T${row.hora_inicio}.000Z`), hora_fin: new Date(`1970-01-01T${row.hora_fin}.000Z`) };
}
export async function listSessions(activityId: number, executor?: SqlExecutor) {
  return (await queryRows<SessionRow>("SELECT * FROM sesiones WHERE actividad_formativa_id = ? ORDER BY fecha ASC, hora_inicio ASC", [activityId], executor)).map(session);
}
export async function getSession(id: number, executor?: SqlExecutor) {
  const [row] = await queryRows<SessionRow & { organizacion_id: number; total_asistencias: number }>(`
    SELECT s.*, a.organizacion_id, (SELECT COUNT(*) FROM asistencias x WHERE x.sesion_id = s.id) AS total_asistencias
    FROM sesiones s JOIN actividades_formativas a ON a.id = s.actividad_formativa_id WHERE s.id = ?`, [id], executor);
  if (!row) return null;
  const { organizacion_id, total_asistencias, ...s } = row;
  return { ...session(s), actividad_formativa: { id: s.actividad_formativa_id, organizacion_id }, _count: { asistencias: Number(total_asistencias) } };
}
function sessionValues(data: Partial<NuevaSesion>) {
  return { ...data,
    ...(data.fecha ? { fecha: `${data.fecha.getFullYear()}-${String(data.fecha.getMonth() + 1).padStart(2, "0")}-${String(data.fecha.getDate()).padStart(2, "0")}` } : {}),
    ...(data.hora_inicio ? { hora_inicio: data.hora_inicio.toISOString().slice(11, 19) } : {}),
    ...(data.hora_fin ? { hora_fin: data.hora_fin.toISOString().slice(11, 19) } : {}),
  };
}
function sessionResponse(s: Sesion) {
  return { id: s.id, fecha: s.fecha, hora_inicio: s.hora_inicio, hora_fin: s.hora_fin, modalidad: s.modalidad, lugar: s.lugar, enlace_virtual: s.enlace_virtual, estado: s.estado };
}
export async function createSession(data: NuevaSesion, executor?: SqlExecutor) {
  return sessionResponse(required(await getSession(await insert("sesiones", { ...sessionValues(data), qr_token: randomBytes(32).toString("hex") }, executor), executor)));
}
export async function updateSession(id: number, data: Partial<NuevaSesion>, executor?: SqlExecutor) {
  await update("sesiones", id, sessionValues(data), executor);
  return sessionResponse(required(await getSession(id, executor)));
}
export async function deleteSession(id: number, executor?: SqlExecutor) {
  const result = await executeSql("DELETE FROM sesiones WHERE id = ? AND NOT EXISTS (SELECT 1 FROM asistencias WHERE sesion_id = ?)", [id, id], executor);
  if (!result.affectedRows) throw new Error("La sesión no existe o tiene asistencias");
}

type EnrollmentRow = Inscripcion & { nombres: string; apellidos: string; dni: string; telefono: string | null; organizacion_id: number };
const enrollmentSelect = `SELECT i.*, p.nombres, p.apellidos, p.dni, p.telefono, a.organizacion_id
  FROM inscripciones i JOIN participantes p ON p.id = i.participante_id JOIN actividades_formativas a ON a.id = i.actividad_formativa_id`;
function enrollment(row: EnrollmentRow) {
  const { nombres, apellidos, dni, telefono, organizacion_id, ...i } = row;
  return { ...i, participante: { id: i.participante_id, nombres, apellidos, dni, telefono }, actividad_formativa: { organizacion_id } };
}
export async function listEnrollments(activityId: number, executor?: SqlExecutor) {
  return (await queryRows<EnrollmentRow>(`${enrollmentSelect} WHERE i.actividad_formativa_id = ? ORDER BY i.fecha_inscripcion ASC`, [activityId], executor)).map(enrollment);
}
export async function getEnrollment(id: number, executor?: SqlExecutor) {
  const [row] = await queryRows<EnrollmentRow>(`${enrollmentSelect} WHERE i.id = ?`, [id], executor);
  return row ? enrollment(row) : null;
}
export async function getEnrollmentByParticipant(participantId: number, activityId: number, executor?: SqlExecutor) {
  const [row] = await queryRows<EnrollmentRow>(`${enrollmentSelect} WHERE i.participante_id = ? AND i.actividad_formativa_id = ?`, [participantId, activityId], executor);
  return row ? enrollment(row) : null;
}
export async function countEnrollments(activityId: number, executor?: SqlExecutor) {
  const [row] = await queryRows<{ total: number }>("SELECT COUNT(*) AS total FROM inscripciones WHERE actividad_formativa_id = ? AND estado = 'Inscrita'", [activityId], executor);
  return Number(row.total);
}
export async function createEnrollment(data: Pick<Inscripcion, "actividad_formativa_id" | "participante_id" | "estado">, executor?: SqlExecutor) {
  return required(await getEnrollment(await insert("inscripciones", data, executor), executor));
}
export async function updateEnrollment(id: number, data: Partial<Pick<Inscripcion, "estado" | "fecha_cancelacion">>, executor?: SqlExecutor) {
  await update("inscripciones", id, data, executor);
  return required(await getEnrollment(id, executor));
}
export async function getParticipantByDni(dni: string, executor?: SqlExecutor) {
  const [row] = await queryRows<Participante>("SELECT * FROM participantes WHERE dni = ?", [dni], executor);
  return row ?? null;
}
export async function createParticipant(data: NuevoParticipante, executor?: SqlExecutor) {
  const id = await insert("participantes", data, executor);
  const [row] = await queryRows<Participante>("SELECT * FROM participantes WHERE id = ?", [id], executor);
  return required(row ?? null);
}
export async function getGlobalStats(executor?: SqlExecutor) {
  const [row] = await queryRows<{ totalOrganizaciones: number; totalUsuarios: number; totalActividades: number; totalParticipantes: number }>(`
    SELECT (SELECT COUNT(*) FROM organizaciones) AS totalOrganizaciones,
      (SELECT COUNT(*) FROM usuarios) AS totalUsuarios,
      (SELECT COUNT(*) FROM actividades_formativas) AS totalActividades,
      (SELECT COUNT(*) FROM participantes) AS totalParticipantes`, [], executor);
  return { totalOrganizaciones: Number(row.totalOrganizaciones), totalUsuarios: Number(row.totalUsuarios), totalActividades: Number(row.totalActividades), totalParticipantes: Number(row.totalParticipantes) };
}
