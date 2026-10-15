import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUser } from "@/lib/db/repository";
import {
  SUPERADMIN,
  ADMINISTRADOR,
  PARTICIPANTE,
} from "@/lib/roles";

export { SUPERADMIN, ADMINISTRADOR, PARTICIPANTE };

/**
 * Obtiene la sesión del servidor. Devuelve null si no hay sesión.
 * Para uso en API Routes / Server Components donde se necesita
 * control de error (sin redirección automática).
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const current = await getUser(Number(session.user.id));
  if (!current?.activo || ![SUPERADMIN, ADMINISTRADOR, PARTICIPANTE].includes(current.rol.nombre)) return null;
  return { ...session.user, rol: current.rol.nombre, rolId: current.rol_id,
    organizacionId: current.organizacion_id, organizacionNombre: current.organizacion?.nombre ?? null };
}

/**
 * Verifica que el usuario autenticado tenga el rol SUPERADMIN.
 * Devuelve true si es superadmin, false en cualquier otro caso
 * (no autenticado o rol distinto).
 */
export async function isSuperAdmin() {
  const user = await getSessionUser();
  return user?.rol === SUPERADMIN;
}

/**
 * Verifica que el usuario autenticado sea Administrador.
 */
export async function isAdministrador() {
  const user = await getSessionUser();
  return (
    user?.rol === ADMINISTRADOR
  );
}

/**
 * Puede administrar actividades formativas si es SuperAdmin
 * o Administrador de alguna organización.
 */
export async function canManageActividades() {
  const user = await getSessionUser();
  if (!user) return false;
  if (user.rol === SUPERADMIN) return true;
  return (
    (user.rol === ADMINISTRADOR) &&
    user.organizacionId != null
  );
}

/**
 * Devuelve la organización desde la cual el usuario puede operar.
 * - SuperAdmin: null (puede operar sobre todas, escoge la org).
 * - Administrador: su organizacionId (solo esa).
 * - Otros roles: null (sin alcance de gestión).
 */
export async function getOrganizacionAlcance(): Promise<number | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.rol === SUPERADMIN) return null;
  if (user.rol === ADMINISTRADOR) {
    return user.organizacionId ?? null;
  }
  return null;
}
