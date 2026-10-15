import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, ADMINISTRADOR, SUPERADMIN } from "@/lib/auth-guard";
import { getOrganization, listOrganizations, updateOrganization } from "@/lib/db/repository";
import { isDuplicateEntry, RecordNotFoundError } from "@/lib/db";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validLogoUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function organizationId(user: { rol: string; organizacionId: number | null }, value: unknown) {
  if (user.rol === ADMINISTRADOR) return user.organizacionId;
  if (user.rol !== SUPERADMIN) return null;
  const id = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return responseError("No autorizado", 401);
  if (![ADMINISTRADOR, SUPERADMIN].includes(user.rol)) return responseError("No autorizado", 403);

  try {
    const organizaciones = user.rol === SUPERADMIN
      ? (await listOrganizations()).map(({ id, nombre }) => ({ id, nombre }))
      : [];
    const requestedId = request.nextUrl.searchParams.get("organizacion_id");
    const id = organizationId(user, requestedId);
    if (user.rol === ADMINISTRADOR && !id) return responseError("No tienes una organización asignada", 403);
    if (user.rol === ADMINISTRADOR && requestedId && Number(requestedId) !== id) return responseError("No autorizado para esa organización", 403);
    if (user.rol === SUPERADMIN && requestedId && !id) return responseError("ID de organización inválido", 400);
    const organizacion = id ? await getOrganization(id) : null;
    if (id && !organizacion) return responseError("Organización no encontrada", 404);
    return NextResponse.json({ organizaciones, organizacion }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al consultar configuración de organización:", error);
    return responseError("No se pudo cargar la organización", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return responseError("No autorizado", 401);
  if (![ADMINISTRADOR, SUPERADMIN].includes(user.rol)) return responseError("No autorizado", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responseError("JSON inválido", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return responseError("Los datos de la organización son inválidos", 400);
  const values = body as Record<string, unknown>;

  const id = organizationId(user, values.organizacion_id);
  if (!id) return responseError(user.rol === SUPERADMIN ? "Selecciona una organización" : "No tienes una organización asignada", 400);
  if (user.rol === ADMINISTRADOR && values.organizacion_id !== undefined && Number(values.organizacion_id) !== id) {
    return responseError("No autorizado para esa organización", 403);
  }

  const nombre = typeof values.nombre === "string" ? values.nombre.trim() : "";
  const ruc = typeof values.ruc === "string" ? values.ruc.trim() : "";
  const direccion = typeof values.direccion === "string" ? values.direccion.trim() : "";
  const telefono = typeof values.telefono === "string" ? values.telefono.trim() : "";
  const correo = typeof values.correo === "string" ? values.correo.trim() : "";
  const logoUrl = typeof values.logo_url === "string" ? values.logo_url.trim() : "";
  if (!nombre) return responseError("El nombre de la organización es obligatorio", 400);
  if (nombre.length > 150 || ruc.length > 20 || direccion.length > 255 || telefono.length > 30 || correo.length > 150 || logoUrl.length > 500) {
    return responseError("Uno o más campos superan la longitud permitida", 400);
  }
  if (correo && !validEmail(correo)) return responseError("El correo institucional no es válido", 400);
  if (!validLogoUrl(logoUrl)) return responseError("La URL del logo debe comenzar con http:// o https://", 400);

  try {
    const organizacion = await updateOrganization(id, {
      nombre,
      ruc: ruc || null,
      direccion: direccion || null,
      telefono: telefono || null,
      correo: correo || null,
      logo_url: logoUrl || null,
    });
    return NextResponse.json({ organizacion }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isDuplicateEntry(error)) return responseError("Ya existe otra organización con ese RUC", 409);
    if (error instanceof RecordNotFoundError) return responseError("Organización no encontrada", 404);
    console.error("Error al actualizar configuración de organización:", error);
    return responseError("No se pudo guardar la organización", 500);
  }
}
