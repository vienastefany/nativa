"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  BookOpen,
  CalendarDays,
  Users,
} from "lucide-react";

interface OrganizacionMini {
  id: number;
  nombre: string;
}

interface Actividad {
  id: number;
  titulo: string;
  tipo_actividad_nombre: string;
  organizacion: OrganizacionMini;
  instructor_nombres: string | null;
  instructor_apellidos: string | null;
  capacidad: number | null;
  estado: string;
  inscripciones_abiertas: boolean;
  created_at: string;
  total_sesiones: number;
  total_inscritos: number;
}

interface ActividadesListProps {
  baseUrl: string;         // "/dashboard/actividades" o "/superadmin/actividades"
  apiOrganizaciones?: string; // "/api/superadmin/organizaciones" solo superadmin
  showOrgFilter?: boolean;
}

const ESTADO_BADGE: Record<string, string> = {
  Borrador: "badge-muted",
  Publicada: "badge-primary",
  En_curso: "badge-info",
  Finalizada: "badge-success",
  Cancelada: "badge-danger",
};

const ESTADO_LABELS: Record<string, string> = {
  Borrador: "Borrador",
  Publicada: "Publicada",
  En_curso: "En curso",
  Finalizada: "Finalizada",
  Cancelada: "Cancelada",
};

export default function ActividadesList({
  baseUrl,
  apiOrganizaciones,
  showOrgFilter = false,
}: ActividadesListProps) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [orgs, setOrgs] = useState<OrganizacionMini[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiOrganizaciones) return;
    let active = true;
    fetch(apiOrganizaciones)
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data)) setOrgs(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [apiOrganizaciones]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (estado) params.set("estado", estado);
      if (orgFilter) params.set("organizacion_id", orgFilter);
      const res = await fetch(`/api/actividades?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setActividades(data);
    } catch {
      setError("No se pudieron cargar las actividades.");
    } finally {
      setLoading(false);
    }
  }, [q, estado, orgFilter]);

  useEffect(() => {
    const timeout = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [q, estado, orgFilter, load]);

  const formatFecha = (f: string) =>
    new Date(f).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Actividades</h1>
          <p className="page-subtitle">
            Gestiona las actividades formativas y sus sesiones.
          </p>
        </div>
        <Link
          href={`${baseUrl}/nueva`}
          className="btn btn-primary self-start"
        >
          <Plus size={18} />
          Nueva actividad
        </Link>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* Filtros */}
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
            placeholder="Buscar por título..."
            className="input pl-10"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="select sm:w-44"
        >
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Publicada">Publicada</option>
          <option value="En_curso">En curso</option>
          <option value="Finalizada">Finalizada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
        {showOrgFilter && orgs.length > 0 && (
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="select sm:w-52"
          >
            <option value="">Todas las organizaciones</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : actividades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <BookOpen size={24} />
            </div>
            <p className="font-medium text-slate-600">
              No se encontraron actividades
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {q || estado || orgFilter
                ? "Ajusta los filtros de búsqueda para ver más resultados."
                : "Crea tu primera actividad para empezar."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-4">Actividad</th>
                  {showOrgFilter && <th>Organización</th>}
                  <th>Estado</th>
                  <th>Inscripciones</th>
                  <th className="text-center">Sesiones</th>
                  <th className="text-center">Inscritos</th>
                  <th>Registro</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <p className="font-semibold text-slate-800">{a.titulo}</p>
                      <p className="text-xs text-slate-400">
                        {a.tipo_actividad_nombre}
                        {a.instructor_nombres &&
                          ` · ${a.instructor_nombres} ${a.instructor_apellidos ?? ""}`}
                      </p>
                    </td>
                    {showOrgFilter && <td>{a.organizacion.nombre}</td>}
                    <td>
                      <span
                        className={`badge ${ESTADO_BADGE[a.estado] ?? "badge-muted"}`}
                      >
                        {ESTADO_LABELS[a.estado] || a.estado}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-xs font-medium ${
                          a.inscripciones_abiertas
                            ? "text-emerald-600"
                            : "text-slate-400"
                        }`}
                      >
                        {a.inscripciones_abiertas ? "Abiertas" : "Cerradas"}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} className="text-slate-400" />
                        {a.total_sesiones}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} className="text-slate-400" />
                        {a.total_inscritos}
                      </span>
                    </td>
                    <td className="text-slate-500">
                      {formatFecha(a.created_at)}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`${baseUrl}/${a.id}`}
                          title="Ver detalle"
                          className="icon-btn hover:text-primary-600"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`${baseUrl}/${a.id}/editar`}
                          title="Editar"
                          className="icon-btn hover:text-primary-600"
                        >
                          <Pencil size={18} />
                        </Link>
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