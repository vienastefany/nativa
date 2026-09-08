"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface TipoActividad {
  id: number;
  nombre: string;
}

interface Organizacion {
  id: number;
  nombre: string;
}

interface InitialData {
  titulo?: string;
  descripcion?: string | null;
  tipo_actividad_id?: number;
  instructor_nombres?: string | null;
  instructor_apellidos?: string | null;
  instructor_profesion?: string | null;
  capacidad?: number | null;
  inscripciones_abiertas?: boolean;
  organizacion_id?: number;
  organizacion?: { id: number; nombre: string };
}

interface ActividadFormProps {
  modo: "crear" | "editar";
  basePath: string;                  // "/dashboard/actividades" o "/superadmin/actividades"
  organizacionIdFijo?: number | null; // Para Admin/Subadm: no editable
  mostrarOrgSelector?: boolean;       // Para SuperAdmin
  organizacionId?: number;            // Para edición
  initialData?: InitialData;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function ActividadForm({
  modo,
  basePath,
  organizacionIdFijo = null,
  mostrarOrgSelector = false,
  organizacionId,
  initialData,
}: ActividadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [orgs, setOrgs] = useState<Organizacion[]>([]);

  const [form, setForm] = useState({
    titulo: initialData?.titulo ?? "",
    descripcion: initialData?.descripcion ?? "",
    tipo_actividad_id: initialData?.tipo_actividad_id?.toString() ?? "",
    instructor_nombres: initialData?.instructor_nombres ?? "",
    instructor_apellidos: initialData?.instructor_apellidos ?? "",
    instructor_profesion: initialData?.instructor_profesion ?? "",
    capacidad: initialData?.capacidad?.toString() ?? "",
    inscripciones_abiertas: initialData?.inscripciones_abiertas ?? false,
    organizacion_id:
      initialData?.organizacion_id?.toString() ??
      organizacionIdFijo?.toString() ??
      "",
  });

  useEffect(() => {
    fetch("/api/tipos-actividad")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTipos(d); })
      .catch(() => {});
    if (mostrarOrgSelector) {
      fetch("/api/superadmin/organizaciones?estado=activo")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setOrgs(d); })
        .catch(() => {});
    }
  }, [mostrarOrgSelector]);

  const setField = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validar = (): string | null => {
    if (!form.titulo.trim()) return "El título es obligatorio.";
    if (!form.tipo_actividad_id) return "Selecciona un tipo de actividad.";
    if (mostrarOrgSelector && !form.organizacion_id) {
      return "Selecciona una organización.";
    }
    if (form.capacidad && isNaN(Number(form.capacidad))) {
      return "La capacidad debe ser un número.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validacion = validar();
    if (validacion) {
      setError(validacion);
      return;
    }

    setLoading(true);
    setError("");

    const url =
      modo === "crear"
        ? "/api/actividades"
        : `/api/actividades/${organizacionId}`;
    const method = modo === "crear" ? "POST" : "PUT";

    const payload: Record<string, unknown> = {
      titulo: form.titulo.trim(),
      tipo_actividad_id: Number(form.tipo_actividad_id),
      descripcion: form.descripcion.trim() || null,
      instructor_nombres: form.instructor_nombres.trim() || null,
      instructor_apellidos: form.instructor_apellidos.trim() || null,
      instructor_profesion: form.instructor_profesion.trim() || null,
      capacidad: form.capacidad ? Number(form.capacidad) : null,
      inscripciones_abiertas: form.inscripciones_abiertas,
    };

    // SuperAdmin elige org; Admin/Subadm la fija está implicita en el backend
    if (mostrarOrgSelector) {
      payload.organizacion_id = Number(form.organizacion_id);
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      if (modo === "crear") {
        router.push(basePath);
        router.refresh();
      } else {
        router.push(`${basePath}/${organizacionId}`);
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message || "Ocurrió un error al guardar.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={
            modo === "crear"
              ? basePath
              : `${basePath}/${organizacionId}`
          }
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          {modo === "crear" ? "Nueva actividad" : "Editar actividad"}
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-4"
      >
        {mostrarOrgSelector && (
          <div>
            <label className={labelCls}>
              Organización <span className="text-red-500">*</span>
            </label>
            <select
              value={form.organizacion_id}
              onChange={(e) => setField("organizacion_id", e.target.value)}
              className={inputCls}
              required
            >
              <option value="">Selecciona una organización</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {!mostrarOrgSelector && organizacionIdFijo && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Organización</p>
            <p className="text-sm font-medium text-gray-800 mt-0.5">
              {initialData?.organizacion?.nombre ?? `ID: ${organizacionIdFijo}`}
            </p>
          </div>
        )}

        <div>
          <label className={labelCls}>
            Título <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => setField("titulo", e.target.value)}
            placeholder="Título de la actividad"
            className={inputCls}
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className={labelCls}>
            Tipo de actividad <span className="text-red-500">*</span>
          </label>
          <select
            value={form.tipo_actividad_id}
            onChange={(e) => setField("tipo_actividad_id", e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Selecciona un tipo</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
            placeholder="Descripción breve de la actividad (opcional)"
            className={`${inputCls} min-h-[80px]`}
            maxLength={2000}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombres del instructor</label>
            <input
              type="text"
              value={form.instructor_nombres}
              onChange={(e) => setField("instructor_nombres", e.target.value)}
              placeholder="Nombres (opcional)"
              className={inputCls}
              maxLength={100}
            />
          </div>
          <div>
            <label className={labelCls}>Apellidos del instructor</label>
            <input
              type="text"
              value={form.instructor_apellidos}
              onChange={(e) =>
                setField("instructor_apellidos", e.target.value)
              }
              placeholder="Apellidos (opcional)"
              className={inputCls}
              maxLength={150}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Profesión del instructor</label>
            <input
              type="text"
              value={form.instructor_profesion}
              onChange={(e) =>
                setField("instructor_profesion", e.target.value)
              }
              placeholder="Profesión (opcional)"
              className={inputCls}
              maxLength={150}
            />
          </div>
          <div>
            <label className={labelCls}>Capacidad</label>
            <input
              type="number"
              min={1}
              value={form.capacidad}
              onChange={(e) => setField("capacidad", e.target.value)}
              placeholder="Capacidad (opcional)"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="inscripciones"
            checked={form.inscripciones_abiertas}
            onChange={(e) =>
              setField("inscripciones_abiertas", e.target.checked)
            }
            className="h-4 w-4 text-blue-600 rounded"
          />
          <label htmlFor="inscripciones" className="text-sm text-gray-700">
            Inscripciones abiertas
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Link
            href={
              modo === "crear"
                ? basePath
                : `${basePath}/${organizacionId}`
            }
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {modo === "crear" ? "Crear actividad" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
