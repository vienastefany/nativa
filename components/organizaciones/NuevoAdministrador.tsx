"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X, Loader2, ShieldCheck } from "lucide-react";

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
        className="btn btn-primary"
      >
        <UserPlus size={18} />
        Nuevo administrador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  Nuevo administrador
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
              Se asignará a la organización{" "}
              <span className="font-semibold text-slate-700">
                {organizacionNombre}
              </span>
              .
            </p>

            {error && <div className="alert alert-error mb-4">{error}</div>}
            {success && (
              <div className="alert alert-success mb-4">{success}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  className="input"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Subadministrador">Subadministrador</option>
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
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
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
                  disabled={loading}
                  className="btn btn-primary"
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