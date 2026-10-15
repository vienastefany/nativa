"use client";

import { useState } from "react";
import {
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface FormularioInscripcionProps {
  token: string;
}

const inputCls = "input";
const labelCls = "label";

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
      <div className="flex flex-col items-center rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <p className="font-semibold text-emerald-800">{exito}</p>
        <p className="mt-1 text-sm text-emerald-600">
          Este navegador te recordará durante 30 días para registrar tu asistencia al escanear el QR de la sesión. Si usas otro navegador, podrás ingresar tu DNI.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        className="btn btn-primary w-full py-2.5"
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
