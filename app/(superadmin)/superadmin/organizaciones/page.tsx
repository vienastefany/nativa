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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Organizaciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las organizaciones o instituciones que utilizan el sistema.
          </p>
        </div>
        <Link
          href="/superadmin/organizaciones/nueva"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus size={18} />
          Nueva organización
        </Link>
      </div>

      {toast && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {toast}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Buscador y filtro */}
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
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activas</option>
          <option value="inactivo">Inactivas</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : organizaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Building2 size={40} className="mb-3" />
            <p className="text-sm">No se encontraron organizaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Organización</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Registro</th>
                  <th className="px-4 py-3 font-medium text-center">Admins</th>
                  <th className="px-4 py-3 font-medium text-center">Actividades</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {organizaciones.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt={org.nombre}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Building2 size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800">
                            {org.nombre}
                          </p>
                          <p className="text-xs text-gray-400">
                            {org.ruc ? `RUC: ${org.ruc}` : "Sin RUC"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {org.correo && (
                          <p className="flex items-center gap-1.5 text-gray-600">
                            <Mail size={14} className="text-gray-400" />
                            <span className="truncate max-w-[180px]">
                              {org.correo}
                            </span>
                          </p>
                        )}
                        {org.telefono && (
                          <p className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {org.telefono}
                          </p>
                        )}
                        {!org.correo && !org.telefono && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          org.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {org.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        {formatFecha(org.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        {org.cantidad_administradores}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Activity size={14} className="text-gray-400" />
                        {org.cantidad_actividades}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/superadmin/organizaciones/${org.id}`}
                          title="Ver"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/superadmin/organizaciones/${org.id}/editar`}
                          title="Editar"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition"
                        >
                          <Pencil size={18} />
                        </Link>
                        <button
                          onClick={() => toggleEstado(org)}
                          disabled={togglingId === org.id}
                          title={org.activo ? "Desactivar" : "Activar"}
                          className={`p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 ${
                            org.activo
                              ? "text-green-600 hover:text-red-600"
                              : "text-gray-400 hover:text-green-600"
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
