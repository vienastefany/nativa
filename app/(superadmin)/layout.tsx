"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  FileText,
  LogOut,
  Settings,
  GraduationCap,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { name: "Organizaciones", href: "/superadmin/organizaciones", icon: Building2 },
  { name: "Usuarios", href: "/superadmin/usuarios", icon: Users },
  { name: "Actividades", href: "/superadmin/actividades", icon: Calendar },
  { name: "Reportes", href: "/superadmin/reportes", icon: FileText },
  { name: "Configuración", href: "/superadmin/configuracion", icon: Settings },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  // Verificar que sea SuperAdmin
  if (session.user?.rol !== "SuperAdmin") {
    redirect("/dashboard");
  }

  const isActive = (href: string) =>
    href === "/superadmin/dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  const navLinkCls = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-primary-50 text-primary-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-200/80 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-sm shadow-primary-600/20">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-slate-900">
              SuperAdmin
            </h1>
            <p className="text-xs text-slate-500">Panel de Control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkCls(item.href)}
              >
                <Icon size={18} className={isActive(item.href) ? "text-primary-600" : ""} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200/80 p-3">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Dashboard de SuperAdmin
            </h2>
            <p className="text-xs text-slate-500">
              Administración central del sistema
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{session.user?.correo}</span>
            <span className="badge badge-primary">
              {session.user?.rol}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}