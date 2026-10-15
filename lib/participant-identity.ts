 import { createHmac, timingSafeEqual } from "node:crypto";

export const PARTICIPANT_COOKIE = "nativa_participante";
export const PARTICIPANT_MAX_AGE = 60 * 60 * 24 * 30;
function signature(value: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Falta NEXTAUTH_SECRET");
  return createHmac("sha256", secret).update(`participant:${value}`).digest("base64url");
}
export function rememberParticipant(id: number) {
  const value = `${id}.${Math.floor(Date.now() / 1000) + PARTICIPANT_MAX_AGE}`;
  return `${value}.${signature(value)}`;
}
export function recognizedParticipant(cookie?: string): number | null {
  if (!cookie || cookie.length > 200) return null;
  const [id, expiration, mac, extra] = cookie.split(".");
  if (extra || !/^\d+$/.test(id) || !/^\d+$/.test(expiration) || !mac) return null;
  const value = `${id}.${expiration}`;
  const expected = Buffer.from(signature(value));
  const actual = Buffer.from(mac);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (Number(expiration) <= Date.now() / 1000 || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return null;
  return Number(id);
}
export function participantCookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: PARTICIPANT_MAX_AGE };
}
