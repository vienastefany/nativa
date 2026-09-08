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
  Loader2,
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

const ESTADO_COLORS: Record<string, string> = {
  Borrador: "bg-gray-100 text-gray-600",
  Publicada: "bg-blue-100 text-blue-700",
  En_curso: "bg-green-100 text-green-700",
  Finalizada: "bg-emerald-100 text-emerald-700",
  Cancelada: "bg-red-100 text-red-600",
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Actividades</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las actividades formativas y sus sesiones.
          </p>
        </div>
        <Link
          href={`${baseUrl}/nueva`}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Nueva actividad
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : actividades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BookOpen size={40} className="mb-3" />
            <p className="text-sm">No se encontraron actividades</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Actividad</th>
                  {showOrgFilter && (
                    <th className="px-4 py-3 font-medium">Organización</th>
                  )}
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Inscripciones</th>
                  <th className="px-4 py-3 font-medium text-center">Sesiones</th>
                  <th className="px-4 py-3 font-medium text-center">Inscritos</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{a.titulo}</p>
                      <p className="text-xs text-gray-400">
                        {a.tipo_actividad_nombre}
                        {a.instructor_nombres &&
                          ` · ${a.instructor_nombres} ${a.instructor_apellidos ?? ""}`}
                      </p>
                    </td>
                    {showOrgFilter && (
                      <td className="px-4 py-3 text-gray-600">
                        {a.organizacion.nombre}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          ESTADO_COLORS[a.estado] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ESTADO_LABELS[a.estado] || a.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          a.inscripciones_abiertas
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      >
                        {a.inscripciones_abiertas ? "Abiertas" : "Cerradas"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} className="text-gray-400" />
                        {a.total_sesiones}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        {a.total_inscritos}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatFecha(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`${baseUrl}/${a.id}`}
                          title="Ver detalle"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`${baseUrl}/${a.id}/editar`}
                          title="Editar"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
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
