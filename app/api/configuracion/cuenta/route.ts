import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, ADMINISTRADOR, SUPERADMIN } from "@/lib/auth-guard";
import { getUser, updateUser } from "@/lib/db/repository";

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return responseError("No autorizado", 401);
  if (![ADMINISTRADOR, SUPERADMIN].includes(user.rol)) return responseError("No autorizado", 403);

  try {
    const account = await getUser(Number(user.id));
    if (!account) return responseError("La cuenta no existe", 404);
    return NextResponse.json({
      nombre: account.correo,
      correo: account.correo,
      rol: account.rol.nombre,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al consultar configuración de cuenta:", error);
    return responseError("No se pudo cargar la cuenta", 500);
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
  if (typeof body !== "object" || body === null || Array.isArray(body)) return responseError("Los datos de contraseña son inválidos", 400);
  const values = body as Record<string, unknown>;

  const currentPassword = typeof values.currentPassword === "string" ? values.currentPassword : "";
  const newPassword = typeof values.newPassword === "string" ? values.newPassword : "";
  const confirmPassword = typeof values.confirmPassword === "string" ? values.confirmPassword : "";
  if (!currentPassword || !newPassword || !confirmPassword) return responseError("Completa todos los campos de contraseña", 400);
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) {
    return responseError("La nueva contraseña debe tener al menos 8 caracteres y no superar 72 bytes", 400);
  }
  if (newPassword !== confirmPassword) return responseError("La confirmación no coincide con la nueva contraseña", 400);

  try {
    const account = await getUser(Number(user.id));
    if (!account) return responseError("La cuenta no existe", 404);
    if (!await bcrypt.compare(currentPassword, account.password)) return responseError("La contraseña actual es incorrecta", 400);
    if (await bcrypt.compare(newPassword, account.password)) return responseError("La nueva contraseña debe ser distinta a la actual", 400);
    const password = await bcrypt.hash(newPassword, 10);
    await updateUser(account.id, { password });
    return NextResponse.json({ mensaje: "La contraseña se actualizó correctamente" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return responseError("No se pudo cambiar la contraseña", 500);
  }
}
