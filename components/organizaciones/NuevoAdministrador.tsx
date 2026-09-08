"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2 } from "lucide-react";

interface NuevoAdministradorProps {
  organizacionId: number;
  organizacionNombre: string;
}

export default function NuevoAdministrador({
  organizacionId,
  organizacionNombre,
}: NuevoAdministradorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    correo: "",
    password: "",
    rol: "Administrador",
  });

  const validar = (): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      return "Ingresa un correo electrónico válido.";
    }
    if (form.password.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validar();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/superadmin/organizaciones/${organizacionId}/usuarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear el usuario");

      setSuccess(`Se creó el usuario ${form.rol} con el correo ${form.correo}.`);
      setForm({ correo: "", password: "", rol: "Administrador" });
      // Recargar para mostrar el nuevo usuario en la lista
      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (e) {
      const err = e as Error;
      setError(
        err.message || "Ocurrió un error."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
      >
        <UserPlus size={18} />
        Nuevo administrador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Nuevo administrador
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Se asignará a la organización{" "}
              <span className="font-semibold text-gray-700">
                {organizacionNombre}
              </span>
              .
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Subadministrador">Subadministrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  placeholder="usuario@org.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
