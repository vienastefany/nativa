"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  UserPlus,
  Search,
  Power,
  Loader2,
  X,
  ShieldCheck,
  Mail,
  Clock,
  UserCircle2,
} from "lucide-react";

interface UsuarioRow {
  id: number;
  correo: string;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
  rol: { nombre: string };
  organizacion: { id: number; nombre: string } | null;
  participante: { nombres: string; apellidos: string; dni: string } | null;
}

interface OrganizacionMini {
  id: number;
  nombre: string;
}

interface UsuariosListProps {
  apiOrganizaciones?: string;
  showOrgFilter?: boolean;
  editable?: boolean;
}

const ROLES_CREABLES = ["Administrador", "Subadministrador"];
const ROLES_EDITABLES = ["Administrador", "Subadministrador"];

const BADGE_ROL: Record<string, string> = {
  Administrador: "badge-primary",
  Subadministrador: "badge-info",
  Participante: "badge-violet",
};

export default function UsuariosList({
  apiOrganizaciones,
  showOrgFilter = false,
  editable = true,
}: UsuariosListProps) {
  const { data: session } = useSession();
  const currentUserId = Number(session?.user?.id);

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [organizaciones, setOrganizaciones] = useState<OrganizacionMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<number | null>(null);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    rol: "Administrador",
    correo: "",
    password: "",
    organizacion_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (rol) params.set("rol", rol);
      if (estado) params.set("estado", estado);
      if (showOrgFilter && orgFilter) params.set("organizacion_id", orgFilter);
      const res = await fetch(`/api/usuarios?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setUsuarios(data);
    } catch {
      setError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [q, rol, estado, showOrgFilter, orgFilter]);

  useEffect(() => {
    const timeout = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [q, rol, estado, orgFilter, load]);

  useEffect(() => {
    if (!apiOrganizaciones) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiOrganizaciones);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setOrganizaciones(
            data.map((o: OrganizacionMini) => ({
              id: o.id,
              nombre: o.nombre,
            }))
          );
        }
      } catch {
        // el filtro de organización simplemente queda vacío
      }
    }, 300);
    return () => clearTimeout(t);
  }, [apiOrganizaciones]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return "—";
    return new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const toggleEstado = async (u: UsuarioRow) => {
    setTogglingId(u.id);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setToast(
        u.activo ? "Usuario desactivado" : "Usuario activado"
      );
      load();
    } catch (e) {
      setError((e as Error).message || "No se pudo actualizar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  const cambiarRol = async (u: UsuarioRow, nuevoRol: string) => {
    if (nuevoRol === u.rol.nombre) return;
    setRoleChangingId(u.id);
    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: nuevoRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar el rol");
      setToast(`Rol actualizado a ${nuevoRol}`);
      load();
    } catch (e) {
      setError((e as Error).message || "No se pudo cambiar el rol.");
    } finally {
      setRoleChangingId(null);
    }
  };

  const validarForm = (): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      return "Ingresa un correo electrónico válido.";
    }
    if (form.password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (showOrgFilter && !form.organizacion_id) {
      return "Selecciona la organización.";
    }
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validarForm();
    if (v) {
      setFormError(v);
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload: {
        rol: string;
        correo: string;
        password: string;
        organizacion_id?: number;
      } = {
        rol: form.rol,
        correo: form.correo,
        password: form.password,
      };
      if (showOrgFilter) {
        payload.organizacion_id = Number(form.organizacion_id);
      }
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear el usuario");
      setToast(`Usuario creado: ${form.correo}`);
      setForm({ rol: "Administrador", correo: "", password: "", organizacion_id: "" });
      setOpen(false);
      load();
    } catch (e) {
      setFormError((e as Error).message || "Ocurrió un error.");
    } finally {
      setSubmitting(false);
    }
  };

  const esRolEditable = (rolNombre: string) => ROLES_EDITABLES.includes(rolNombre);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">
            Gestiona las cuentas que acceden al sistema y sus roles.
          </p>
        </div>
        {editable && (
          <button onClick={() => setOpen(true)} className="btn btn-primary self-start">
            <UserPlus size={18} />
            Nuevo usuario
          </button>
        )}
      </div>

      {toast && <div className="alert alert-success mb-4">{toast}</div>}
      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por correo..."
            className="input pl-10"
          />
        </div>
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="select sm:w-44"
        >
          <option value="">Todos los roles</option>
          <option value="Administrador">Administrador</option>
          <option value="Subadministrador">Subadministrador</option>
          <option value="Participante">Participante</option>
        </select>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="select sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        {showOrgFilter && (
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="select sm:w-56"
          >
            <option value="">Todas las organizaciones</option>
            {organizaciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={24} />
            </div>
            <p className="font-medium text-slate-600">
              No se encontraron usuarios
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {q || rol || estado || orgFilter
                ? "Ajusta los filtros de búsqueda para ver más resultados."
                : "Crea el primer usuario del sistema."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Organización</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Último acceso</th>
                  {editable && <th className="text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esSelf = u.id === currentUserId;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <UserCircle2 size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <Mail size={14} className="shrink-0 text-slate-400" />
                              <span className="truncate max-w-[220px]">
                                {u.correo}
                              </span>
                              {esSelf && (
                                <span className="badge badge-primary">Tú</span>
                              )}
                            </p>
                            {u.participante && (
                              <p className="truncate max-w-[260px] text-xs text-slate-400">
                                {u.participante.nombres} {u.participante.apellidos} ·{" "}
                                {u.participante.dni}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${BADGE_ROL[u.rol.nombre] ?? "badge-muted"}`}>
                          {u.rol.nombre}
                        </span>
                      </td>
                      <td>
                        <span className="text-slate-500">
                          {u.organizacion?.nombre ?? "Sin organización"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.activo ? "badge-success" : "badge-danger"}`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-slate-500">
                        {formatFecha(u.created_at)}
                      </td>
                      <td className="text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {formatFecha(u.ultimo_acceso)}
                        </span>
                      </td>
                      {editable && (
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            {esRolEditable(u.rol.nombre) && (
                              <select
                                value={u.rol.nombre}
                                disabled={roleChangingId === u.id || esSelf}
                                onChange={(e) => cambiarRol(u, e.target.value)}
                                title={
                                  esSelf
                                    ? "No puedes cambiar tu propio rol"
                                    : "Cambiar rol"
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="Administrador">Administrador</option>
                                <option value="Subadministrador">Subadministrador</option>
                              </select>
                            )}
                            <button
                              onClick={() => toggleEstado(u)}
                              disabled={togglingId === u.id || esSelf}
                              title={
                                esSelf
                                  ? "Esta es tu cuenta"
                                  : u.activo
                                  ? "Desactivar"
                                  : "Activar"
                              }
                              className={`icon-btn transition ${
                                u.activo
                                  ? "hover:bg-red-50 hover:text-red-600"
                                  : "hover:bg-emerald-50 hover:text-emerald-600"
                              }`}
                            >
                              {togglingId === u.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Power size={18} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Nuevo usuario
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="icon-btn"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Se creará una cuenta para acceder al sistema. Solo pueden crearse
              usuarios Administrador o Subadministrador.
            </p>

            {formError && (
              <div className="alert alert-error mb-4">{formError}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {showOrgFilter && (
                <div>
                  <label className="label">Organización</label>
                  <select
                    value={form.organizacion_id}
                    onChange={(e) =>
                      setForm({ ...form, organizacion_id: e.target.value })
                    }
                    className="select"
                  >
                    <option value="">Selecciona la organización</option>
                    {organizaciones.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="input"
                >
                  {ROLES_CREABLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="usuario@org.com"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}