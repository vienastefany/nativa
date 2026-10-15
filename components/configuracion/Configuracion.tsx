"use client";

import { useEffect, useState } from "react";
import { Building2, KeyRound, Loader2, Save, Settings, UserRound } from "lucide-react";

type Section = "organizacion" | "cuenta";
type Organization = {
  id: number;
  nombre: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  logo_url: string | null;
};
type OrganizationOption = Pick<Organization, "id" | "nombre">;
type Account = { nombre: string; correo: string; rol: string };

const inputClass = "input";
const labelClass = "label";

function safeLogoUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function Configuracion({ global }: { global: boolean }) {
  const [section, setSection] = useState<Section>("organizacion");
  const [organizationOptions, setOrganizationOptions] = useState<OrganizationOption[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [organizationLoading, setOrganizationLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(true);
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [organizationError, setOrganizationError] = useState("");
  const [organizationSuccess, setOrganizationSuccess] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    let active = true;
    const query = organizationId ? `?organizacion_id=${encodeURIComponent(organizationId)}` : "";
    void fetch(`/api/configuracion/organizacion${query}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la organización");
        if (!active) return;
        setOrganizationOptions(data.organizaciones);
        setOrganization(data.organizacion);
        if (global && !organizationId && data.organizaciones.length) {
          setOrganizationLoading(true);
          setOrganizationId(String(data.organizaciones[0].id));
        }
      })
      .catch(error => {
        if (active) setOrganizationError(error instanceof Error ? error.message : "No se pudo cargar la organización");
      })
      .finally(() => { if (active) setOrganizationLoading(false); });
    return () => { active = false; };
  }, [global, organizationId]);

  useEffect(() => {
    let active = true;
    void fetch("/api/configuracion/cuenta", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la cuenta");
        if (active) setAccount(data);
      })
      .catch(error => {
        if (active) setAccountError(error instanceof Error ? error.message : "No se pudo cargar la cuenta");
      })
      .finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, []);

  function updateOrganizationField(field: keyof Omit<Organization, "id">, value: string) {
    setOrganization(current => current ? { ...current, [field]: value } : current);
  }

  async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    setOrganizationSaving(true);
    setOrganizationError("");
    setOrganizationSuccess("");
    try {
      const response = await fetch("/api/configuracion/organizacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...organization, organizacion_id: organization.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la organización");
      setOrganization(data.organizacion);
      setOrganizationSuccess("Los datos de la organización se guardaron correctamente.");
    } catch (error) {
      setOrganizationError(error instanceof Error ? error.message : "No se pudo guardar la organización");
    } finally {
      setOrganizationSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setAccountSuccess("");
    try {
      const response = await fetch("/api/configuracion/cuenta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cambiar la contraseña");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setAccountSuccess(data.mensaje);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Administra los datos de la organización y la seguridad de tu cuenta.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="Apartados de configuración">
        <button type="button" role="tab" aria-selected={section === "organizacion"} onClick={() => setSection("organizacion")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${section === "organizacion" ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          <Building2 size={17} /> Datos de la organización
        </button>
        <button type="button" role="tab" aria-selected={section === "cuenta"} onClick={() => setSection("cuenta")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${section === "cuenta" ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          <UserRound size={17} /> Mi cuenta
        </button>
      </div>

      {section === "organizacion" ? (
        <section role="tabpanel" aria-label="Datos de la organización" className="card p-5 sm:p-7">
          <div className="mb-5 flex items-start gap-3">
            <span className="rounded-xl bg-primary-50 p-2.5 text-primary-700"><Building2 size={20} /></span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Datos de la organización</h2>
              <p className="mt-1 text-sm text-slate-500">{global ? "Selecciona la organización cuyos datos deseas administrar." : "Actualiza la información institucional de tu organización."}</p>
            </div>
          </div>

          {global && (
            <div className="mb-5">
              <label className={labelClass} htmlFor="config-organization">Organización</label>
              <select id="config-organization" className={inputClass} value={organizationId}
                onChange={event => { setOrganizationLoading(true); setOrganization(null); setOrganizationError(""); setOrganizationId(event.target.value); setOrganizationSuccess(""); }}
                disabled={organizationLoading || organizationOptions.length === 0}>
                {organizationOptions.length === 0 && <option value="">No hay organizaciones</option>}
                {organizationOptions.map(option => <option key={option.id} value={option.id}>{option.nombre}</option>)}
              </select>
            </div>
          )}

          {organizationError && <p role="alert" className="alert alert-error mb-4">{organizationError}</p>}
          {organizationSuccess && <p role="status" className="alert alert-success mb-4">{organizationSuccess}</p>}
          {organizationLoading ? (
            <p role="status" className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Cargando datos de la organización…</p>
          ) : organization ? (
            <form onSubmit={saveOrganization} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="org-nombre">Nombre</label>
                <input id="org-nombre" className={inputClass} maxLength={150} required value={organization.nombre}
                  onChange={event => updateOrganizationField("nombre", event.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="org-ruc">RUC</label>
                  <input id="org-ruc" className={inputClass} maxLength={20} value={organization.ruc ?? ""}
                    onChange={event => updateOrganizationField("ruc", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="org-telefono">Teléfono</label>
                  <input id="org-telefono" className={inputClass} maxLength={30} value={organization.telefono ?? ""}
                    onChange={event => updateOrganizationField("telefono", event.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="org-direccion">Dirección</label>
                <input id="org-direccion" className={inputClass} maxLength={255} value={organization.direccion ?? ""}
                  onChange={event => updateOrganizationField("direccion", event.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="org-correo">Correo institucional</label>
                <input id="org-correo" type="email" className={inputClass} maxLength={150} value={organization.correo ?? ""}
                  onChange={event => updateOrganizationField("correo", event.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="org-logo">URL del logo</label>
                <input id="org-logo" type="url" className={inputClass} maxLength={500} placeholder="https://ejemplo.com/logo.png" value={organization.logo_url ?? ""}
                  onChange={event => updateOrganizationField("logo_url", event.target.value)} />
                <p className="mt-1 text-xs text-slate-500">Usa una URL pública que empiece por https:// o http://.</p>
                {safeLogoUrl(organization.logo_url) && (
                  <div className="mt-3 flex items-center gap-3">
                    {/* Native image rendering supports organization-hosted URLs without next.config host allowlists. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain p-1" src={safeLogoUrl(organization.logo_url)!} alt={`Logo de ${organization.nombre}`} />
                    <a className="text-sm text-primary-700 underline" href={safeLogoUrl(organization.logo_url)!} target="_blank" rel="noreferrer">Abrir logo</a>
                  </div>
                )}
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button type="submit" disabled={organizationSaving || organizationLoading} className="btn btn-primary">
                  {organizationSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                  Guardar organización
                </button>
              </div>
            </form>
          ) : !organizationError ? <p className="py-8 text-sm text-slate-500">Selecciona una organización para editar sus datos.</p> : null}
        </section>
      ) : (
        <section role="tabpanel" aria-label="Mi cuenta" className="space-y-5">
          <div className="card p-5 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-xl bg-primary-50 p-2.5 text-primary-700"><UserRound size={20} /></span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Mi cuenta</h2>
                <p className="mt-1 text-sm text-slate-500">Información de la cuenta que inició sesión.</p>
              </div>
            </div>
            {accountError && <p role="alert" className="alert alert-error mb-4">{accountError}</p>}
            {accountLoading ? <p role="status" className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" /> Cargando cuenta…</p> : account && (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div><dt className="label">Nombre</dt><dd className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{account.nombre}</dd></div>
                <div><dt className="label">Correo</dt><dd className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{account.correo}</dd></div>
                <div><dt className="label">Rol</dt><dd className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{account.rol}</dd></div>
              </dl>
            )}
          </div>

          <div className="card p-5 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-xl bg-primary-50 p-2.5 text-primary-700"><KeyRound size={20} /></span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
                <p className="mt-1 text-sm text-slate-500">Confirma tu contraseña actual para establecer una nueva.</p>
              </div>
            </div>
            {accountSuccess && <p role="status" className="alert alert-success mb-4">{accountSuccess}</p>}
            {passwordError && <p role="alert" className="alert alert-error mb-4">{passwordError}</p>}
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="current-password">Contraseña actual</label>
                <input id="current-password" type="password" autoComplete="current-password" required className={inputClass} value={passwords.currentPassword}
                  onChange={event => setPasswords(current => ({ ...current, currentPassword: event.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="new-password">Nueva contraseña</label>
                  <input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} value={passwords.newPassword}
                    onChange={event => setPasswords(current => ({ ...current, newPassword: event.target.value }))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="confirm-password">Confirmar nueva contraseña</label>
                  <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} value={passwords.confirmPassword}
                    onChange={event => setPasswords(current => ({ ...current, confirmPassword: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button type="submit" disabled={passwordSaving || accountLoading} className="btn btn-primary">
                  {passwordSaving ? <Loader2 size={17} className="animate-spin" /> : <Settings size={17} />}
                  Actualizar contraseña
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
