"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Mail,
  Lock,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    correo: "",
    password: "",
  });

  const inputCls = (invalid: boolean) =>
    `w-full rounded-xl border bg-white px-4 py-3 pl-11 text-sm text-[#0e1c3c] shadow-sm outline-none transition-all duration-200 hover:-translate-y-px focus:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 placeholder:text-slate-400 ${
      invalid
        ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
        : "border-slate-200 hover:border-violet-200 focus:border-[#7c6ce0] focus:ring-4 focus:ring-[#7c6ce0]/10"
    }`;

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
        setError("Correo o contraseña incorrectos.");
        setIsLoading(false);
        return;
      }

      // Redirigir según el rol
      const session = await fetch("/api/auth/session").then((res) => res.json());
      const rol = session?.user?.rol;

      if (rol === "SuperAdmin") {
        router.push("/superadmin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Ocurrió un error al iniciar sesión. Intenta nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ============ Panel visual (izquierda) ============ */}
      <aside className="relative hidden w-[55%] overflow-hidden bg-gradient-to-br from-[#f8f4ff] via-[#f2ecfd] to-[#e9e0fa] lg:flex">
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/60 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-28 h-96 w-96 rounded-full bg-[#e6dbfb] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-[#e2f6ec]/70 blur-3xl" />

        {/* Contenido centrado verticalmente */}
        <div className="relative z-10 flex w-full flex-col justify-center px-12 py-10">
          {/* Imagen principal + texto superpuesto */}
          <div className="relative w-full overflow-hidden rounded-[28px] shadow-[0_18px_50px_rgba(124,108,224,0.16)]">
            <Image
              src="/images/imagen_login_dos.png"
              alt="Personas interactuando en una plataforma digital"
              width={1374}
              height={1145}
              priority
              className="h-auto w-full object-contain"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 max-w-[560px] px-8 pb-8">
              <h2 className="text-3xl font-bold leading-snug tracking-tight text-[#0e1c3c]">
                Conecta personas.
                <br />
                Organiza experiencias.
                <br />
                <span className="font-semibold text-[#7c6ce0]">
                  Impulsa el aprendizaje.
                </span>
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#5a6b8c]">
                Una plataforma para gestionar capacitaciones, talleres, cursos
                y más, desde un solo lugar.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ============ Panel formulario (derecha) ============ */}
      <main className="flex w-full items-center justify-center bg-white px-6 py-10 lg:w-[45%] sm:px-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#cdbcf6] to-[#a994ea] shadow-lg shadow-[#7c6ce0]/25">
              <Sparkles size={26} className="text-white" />
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-[#0e1c3c]">
              Bienvenido de nuevo
            </h1>
            <p className="mt-1.5 text-sm text-[#8a93ae]">
              Ingresa tus datos para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-sm text-[#b33a52]">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#23345e]" htmlFor="correo">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  id="correo"
                  type="email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className={inputCls(!!error)}
                  placeholder="usuario@ejemplo.com"
                  value={formData.correo}
                  onChange={(e) =>
                    setFormData({ ...formData, correo: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#23345e]" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={`${inputCls(!!error)} pr-12`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  disabled={isLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#7c6ce0] disabled:opacity-60"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7c6ce0] to-[#6d5bd0] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#7c6ce0]/25 transition-all duration-200 hover:-translate-y-px hover:shadow-lg hover:shadow-[#7c6ce0]/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Plataforma de Gestión de Capacitaciones
          </p>
        </div>
      </main>
    </div>
  );
}