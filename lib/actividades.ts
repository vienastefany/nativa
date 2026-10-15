import {
  SUPERADMIN,
  ADMINISTRADOR,
} from "./roles";

export const ESTADOS_ACTIVIDAD = [
  "Borrador",
  "Publicada",
  "En_curso",
  "Finalizada",
  "Cancelada",
] as const;

export const ESTADOS_SESION = [
  "Programada",
  "En_curso",
  "Finalizada",
  "Cancelada",
] as const;

export const MODALIDADES = ["Presencial", "Virtual", "Hibrida"] as const;

export interface UserLite {
  rol: string;
  organizacionId: number | null;
}

/**
 * Verifica si un usuario puede gestionar una actividad según su rol
 * y su organización (aislamiento).
 * - SuperAdmin: acceso total.
 * - Administrador: solo si la actividad pertenece a su organización.
 */
export function puedeAccederActividad(
  user: UserLite,
  organizacionId: number
): boolean {
  if (user.rol === SUPERADMIN) return true;
  if (
    (user.rol === ADMINISTRADOR) &&
    user.organizacionId != null &&
    organizacionId === user.organizacionId
  ) {
    return true;
  }
  return false;
}

/** "YYYY-MM-DD" -> Date local a medianoche */
export function fechaStrToDate(fecha: string): Date {
  return new Date(`${fecha}T00:00:00`);
}

/** "HH:MM" -> Date cuya parte UTC coincide con la hora (el driver mariadb
 *  almacena TIME usando el componente UTC). */
export function horaStrToDate(hora: string): Date {
  const [h, m] = hora.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h || 0, m || 0, 0, 0));
}

/** Date -> "HH:MM". Las columnas TIME se leen en UTC; se usa la parte UTC. */
export function dateToHoraStr(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Date -> "YYYY-MM-DD". Las columnas DATE se devuelven como
 *  medianoche UTC; se usa la parte UTC para no desplazar la fecha. */
export function dateToFechaStr(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}