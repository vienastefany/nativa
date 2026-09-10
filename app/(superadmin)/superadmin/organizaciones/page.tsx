"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Eye,
  Pencil,
  Power,
  Mail,
  Phone,
  Calendar,
  Users,
  Activity,
  Loader2,
} from "lucide-react";

interface Organizacion {
  id: number;
  nombre: string;
  ruc: string | null;
  correo: string | null;
  telefono: string | null;
  logo_url: string | null;
  activo: boolean;
  created_at: string;
  cantidad_administradores: number;
  cantidad_actividades: number;
}

export default function OrganizacionesPage() {
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (estado) params.set("estado", estado);
      const res = await fetch(`/api/superadmin/organizaciones?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setOrganizaciones(data);
    } catch {
      setError("No se pudieron cargar las organizaciones.");
    } finally {
      setLoading(false);
    }
  }, [q, estado]);

  useEffect(() => {
    const timeout = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [q, estado, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleEstado = async (org: Organizacion) => {
    setTogglingId(org.id);
    try {
      const res = await fetch(`/api/superadmin/organizaciones/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !org.activo }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar");
      }
      setToast(org.activo ? "Organización desactivada" : "Organización activada");
      load();
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Organizaciones</h1>
          <p className="page-subtitle">
            Gestiona las organizaciones o instituciones que utilizan el sistema.
          </p>
        </div>
        <Link
          href="/superadmin/organizaciones/nueva"
          className="btn btn-primary self-start"
        >
          <Plus size={18} />
          Nueva organización
        </Link>
      </div>

      {toast && <div className="alert alert-success mb-4">{toast}</div>}

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Buscador y filtro */}
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
            placeholder="Buscar por nombre..."
            className="input pl-10"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="select sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : organizaciones.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Building2 size={24} />
            </div>
            <p className="font-medium text-slate-600">
              No se encontraron organizaciones
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {q || estado
                ? "Ajusta los filtros de búsqueda para ver más resultados."
                : "Registra la primera organización del sistema."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organización</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th className="text-center">Admins</th>
                  <th className="text-center">Actividades</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {organizaciones.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.nombre}
                            className="h-10 w-10 rounded-lg border border-slate-100 object-cover bg-slate-100"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                            <Building2 size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">
                            {org.nombre}
                          </p>
                          <p className="text-xs text-slate-400">
                            {org.ruc ? `RUC: ${org.ruc}` : "Sin RUC"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        {org.correo && (
                          <p className="flex items-center gap-1.5">
                            <Mail size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate max-w-[180px]">
                              {org.correo}
                            </span>
                          </p>
                        )}
                        {org.telefono && (
                          <p className="flex items-center gap-1.5">
                            <Phone size={14} className="shrink-0 text-slate-400" />
                            {org.telefono}
                          </p>
                        )}
                        {!org.correo && !org.telefono && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          org.activo ? "badge-success" : "badge-danger"
                        }`}
                      >
                        {org.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {formatFecha(org.created_at)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} className="text-slate-400" />
                        {org.cantidad_administradores}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Activity size={14} className="text-slate-400" />
                        {org.cantidad_actividades}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/superadmin/organizaciones/${org.id}`}
                          title="Ver"
                          className="icon-btn hover:text-primary-600"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/superadmin/organizaciones/${org.id}/editar`}
                          title="Editar"
                          className="icon-btn hover:text-primary-600"
                        >
                          <Pencil size={18} />
                        </Link>
                        <button
                          onClick={() => toggleEstado(org)}
                          disabled={togglingId === org.id}
                          title={org.activo ? "Desactivar" : "Activar"}
                          className={`icon-btn transition ${
                            org.activo
                              ? "hover:bg-red-50 hover:text-red-600"
                              : "hover:bg-emerald-50 hover:text-emerald-600"
                          }`}
                        >
                          {togglingId === org.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Power size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}