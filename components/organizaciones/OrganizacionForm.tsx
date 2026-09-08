"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface OrganizacionFormProps {
  modo: "crear" | "editar";
  organizacionId?: number;
  initialData?: {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    logo_url: string | null;
    activo: boolean;
  };
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function OrganizacionForm({
  modo,
  organizacionId,
  initialData,
}: OrganizacionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? "",
    ruc: initialData?.ruc ?? "",
    direccion: initialData?.direccion ?? "",
    telefono: initialData?.telefono ?? "",
    correo: initialData?.correo ?? "",
    logo_url: initialData?.logo_url ?? "",
    activo: initialData?.activo ?? true,
  });

  const setField = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const validar = (): string | null => {
    if (!form.nombre.trim()) return "El nombre es obligatorio.";
    if (
      form.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())
    ) {
      return "El correo electrónico no es válido.";
    }
    if (form.logo_url.trim() && !/^https?:\/\//.test(form.logo_url.trim())) {
      return "La URL del logo debe comenzar con http:// o https://";
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
    try {
      const url =
        modo === "crear"
          ? "/api/superadmin/organizaciones"
          : `/api/superadmin/organizaciones/${organizacionId}`;
      const method = modo === "crear" ? "POST" : "PUT";

      const body = {
        nombre: form.nombre.trim(),
        ruc: form.ruc.trim() || null,
        direccion: form.direccion.trim() || null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        logo_url: form.logo_url.trim() || null,
        activo: form.activo,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      if (modo === "crear") {
        router.push("/superadmin/organizaciones");
        router.refresh();
      } else {
        router.push(`/superadmin/organizaciones/${organizacionId}`);
        router.refresh();
      }
    } catch (e) {
      const err = e as Error;
      setError(err.message || "Ocurrió un error al guardar.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={
            modo === "crear"
              ? "/superadmin/organizaciones"
              : `/superadmin/organizaciones/${organizacionId}`
          }
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition"
        >
          <ArrowLeft size={16} />
          Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">
          {modo === "crear" ? "Nueva organización" : "Editar organización"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {modo === "crear"
            ? "Registra una nueva organización en el sistema."
            : `Actualizando la información de la organización #${organizacionId}.`}
        </p>
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
        <div>
          <label className={labelCls}>
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            placeholder="Nombre de la organización"
            className={inputCls}
            maxLength={150}
            required
          />
        </div>

        <div>
          <label className={labelCls}>RUC</label>
          <input
            type="text"
            value={form.ruc}
            onChange={(e) => setField("ruc", e.target.value)}
            placeholder="RUC (opcional)"
            className={inputCls}
            maxLength={20}
          />
        </div>

        <div>
          <label className={labelCls}>Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => setField("direccion", e.target.value)}
            placeholder="Dirección (opcional)"
            className={inputCls}
            maxLength={255}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setField("telefono", e.target.value)}
              placeholder="Teléfono (opcional)"
              className={inputCls}
              maxLength={30}
            />
          </div>
          <div>
            <label className={labelCls}>Correo</label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => setField("correo", e.target.value)}
              placeholder="correo@org.com (opcional)"
              className={inputCls}
              maxLength={150}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>URL del logo</label>
          <input
            type="text"
            value={form.logo_url}
            onChange={(e) => setField("logo_url", e.target.value)}
            placeholder="https://... (opcional)"
            className={inputCls}
            maxLength={500}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setField("activo", e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            Organización activa
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={
              modo === "crear"
                ? "/superadmin/organizaciones"
                : `/superadmin/organizaciones/${organizacionId}`
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
            {modo === "crear" ? "Guardar organización" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
