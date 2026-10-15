import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Optional UI QA. Use an installed Playwright path; no browser/server is left running.
export async function runBrowserQa({ base, adminCookies, participantCookies, activityId, attendancePath, publicPath }) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.NATIVA_PLAYWRIGHT_PATH || "playwright");
  const output = process.env.NATIVA_QA_DIR;
  if (output) await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.NATIVA_BROWSER_CHANNEL ? { channel: process.env.NATIVA_BROWSER_CHANNEL } : {}) });
  const errors = [];
  const cookieList = cookies => [...cookies].map(([name, value]) => ({ name, value, url: base, httpOnly: true, sameSite: "Lax" }));
  const watch = page => page.on("pageerror", error => errors.push(error.message));
  try {
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
    await adminContext.addCookies(cookieList(adminCookies));
    const admin = await adminContext.newPage(); watch(admin);
    await admin.goto(`${base}/dashboard/actividades/${activityId}`);
    await admin.getByRole("button", { name: "Compartir / Asistencia" }).first().click();
    await admin.getByRole("button", { name: "Activar QR", exact: true }).click();
    await admin.getByText("QR habilitado. Los participantes ya pueden registrar su asistencia.", { exact: true }).waitFor();
    await admin.getByAltText("QR para registrar asistencia a esta sesión").waitFor();
    if (output) await admin.screenshot({ path: path.join(output, "sesion-asistencia.png"), fullPage: true });
    const participantContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
    await participantContext.addCookies(cookieList(participantCookies));
    const participant = await participantContext.newPage(); watch(participant);
    await participant.goto(`${base}${attendancePath}`);
    await participant.getByRole("heading", { name: "Asistencia confirmada" }).waitFor();
    assert(await participant.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Asistencia móvil sin desbordamiento horizontal");
    if (output) await participant.screenshot({ path: path.join(output, "asistencia-movil.png"), fullPage: true });
    const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const visitor = await fresh.newPage(); watch(visitor);
    await visitor.goto(`${base}${attendancePath}`);
    await visitor.getByLabel("DNI", { exact: true }).waitFor();
    if (output) await visitor.screenshot({ path: path.join(output, "dni-alternativo.png"), fullPage: true });
    await visitor.goto(`${base}${publicPath}`);
    await visitor.getByText("Para registrar tu asistencia", { exact: false }).waitFor();
    assert.equal(await visitor.getByRole("heading", { name: "Asistencia confirmada" }).count(), 0);
    await admin.getByRole("button", { name: "Cerrar asistencia" }).click();
    await admin.getByRole("link", { name: "Reportes", exact: true }).click();
    await admin.getByRole("button", { name: "Aplicar filtros", exact: true }).waitFor();
    await admin.getByLabel("Actividad", { exact: true }).selectOption(String(activityId));
    await admin.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await admin.getByRole("button", { name: "Aplicar filtros", exact: true }).waitFor();
    if (output) await admin.screenshot({ path: path.join(output, "reportes.png"), fullPage: true });
    assert.deepEqual(errors, [], "Sin errores de JavaScript en las pantallas nuevas");
    console.log("OK: UI administrador, QR visible, asistencia móvil automática, DNI alternativo, sesión pública y reportes.");
  } finally { await browser.close(); }
}
