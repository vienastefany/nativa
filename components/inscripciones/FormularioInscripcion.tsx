"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";

interface FormularioInscripcionProps {
  token: string;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

export default function FormularioInscripcion({
  token,
}: FormularioInscripcionProps) {
  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    dni: "",
    telefono: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const setField = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExito("");

    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError("Nombres y apellidos son obligatorios.");
      return;
    }
    if (!/^\d{8}$/.test(form.dni.trim())) {
      setError("El DNI debe tener 8 dígitos.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`/api/inscribirse/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          dni: form.dni.trim(),
          telefono: form.telefono.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al inscribirse");
      setExito(data.mensaje || "Inscripción registrada correctamente");
      setForm({ nombres: "", apellidos: "", dni: "", telefono: "" });
    } catch (e) {
      setError((e as Error).message || "Ocurrió un error.");
    } finally {
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-6 text-center">
        <CheckCircle2 size={36} className="text-green-600 mx-auto mb-3" />
        <p className="text-green-800 font-semibold">{exito}</p>
        <p className="text-sm text-green-600 mt-1">
          Nos vemos en la actividad.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            Nombres <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nombres}
            onChange={(e) => setField("nombres", e.target.value)}
            placeholder="Nombres"
            className={inputCls}
            maxLength={100}
            required
          />
        </div>
        <div>
          <label className={labelCls}>
            Apellidos <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.apellidos}
            onChange={(e) => setField("apellidos", e.target.value)}
            placeholder="Apellidos"
            className={inputCls}
            maxLength={150}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            DNI <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.dni}
            onChange={(e) =>
              setField("dni", e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            placeholder="8 dígitos"
            className={inputCls}
            maxLength={8}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Teléfono</label>
          <input
            type="text"
            inputMode="tel"
            value={form.telefono}
            onChange={(e) =>
              setField("telefono", e.target.value.replace(/\D/g, "").slice(0, 20))
            }
            placeholder="Opcional"
            className={inputCls}
            maxLength={20}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {enviando ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
        Inscribirme
      </button>
    </form>
  );
}