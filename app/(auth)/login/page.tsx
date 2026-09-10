"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, GraduationCap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    correo: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        correo: formData.correo,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales incorrectas. Por favor, verifica tus datos.");
        setIsLoading(false);
        return;
      }

      // Redirigir según el rol
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const rol = session?.user?.rol;

      if (rol === "SuperAdmin") {
        router.push("/superadmin/dashboard");
      } else if (rol === "Administrador" || rol === "Subadministrador") {
        router.push("/dashboard");
      } else if (rol === "Participante") {
        router.push("/participante/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Ocurrió un error al iniciar sesión. Intenta nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card rounded-2xl p-8 shadow-[0_4px_12px_rgba(15,23,42,0.06),0_16px_40px_rgba(15,23,42,0.1)]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-lg shadow-primary-600/20">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sistema de Gestión
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Actividades Formativas y Asistencia
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="alert alert-error">{error}</div>}

            <div>
              <label className="label" htmlFor="correo">
                Correo Electrónico
              </label>
              <input
                id="correo"
                type="email"
                required
                autoComplete="email"
                className="input"
                placeholder="usuario@ejemplo.com"
                value={formData.correo}
                onChange={(e) =>
                  setFormData({ ...formData, correo: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-2.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Sistema de Gestión de Actividades
          Formativas
        </p>
      </div>
    </div>
  );
}