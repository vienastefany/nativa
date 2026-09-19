"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  GraduationCap,
  Sparkles,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Actividades",
    href: "/dashboard/actividades",
    icon: Calendar,
  },
  { name: "Usuarios", href: "/dashboard/usuarios", icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaff]">
        <div className="spinner" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname.startsWith(href);

  const navLinkCls = (href: string) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive(href)
        ? "bg-[#f1edfc] text-[#6b5bd0]"
        : "text-[#5a627a] hover:bg-[#f7f4ff] hover:text-[#0e1c3c]"
    }`;

  const iconCls = (href: string) =>
    isActive(href) ? "text-[#7c6ce0]" : "text-[#8b93ab]";

  return (
    <div className="flex min-h-screen bg-[#fbfaff]">
      {/* Sidebar (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#efeaf8] bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-[#f0ecfb] px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c6ce0] to-[#a89af5] shadow-sm shadow-[#7c6ce0]/30">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-[#0e1c3c]">
              Sistema de Gestión
            </h1>
            <p className="text-xs text-[#8b93ab]">Actividades formativas</p>
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
                <Icon size={18} className={iconCls(item.href)} />
                <span>{item.name}</span>
                {isActive(item.href) && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#7c6ce0]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#f0ecfb] p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-[#f7f4ff] px-3.5 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c6ce0] to-[#a89af5]">
              <span className="text-sm font-bold text-white">
                {session.user?.correo?.charAt(0).toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#0e1c3c]">
                {session.user?.correo}
              </p>
              <p className="text-xs text-[#8b93ab]">{session.user?.rol}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#5a627a] transition-all duration-200 hover:bg-[#fdeef3] hover:text-[#c94f7c]"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil) */}
        <header className="sticky top-0 z-30 border-b border-[#efeaf8] bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c6ce0] to-[#a89af5]">
                <Sparkles size={16} className="text-white" />
              </div>
              <h1 className="text-sm font-bold tracking-tight text-[#0e1c3c]">
                Sistema de Gestión
              </h1>
            </div>
            <button
              onClick={() => signOut()}
              aria-label="Cerrar sesión"
              className="icon-btn text-[#c94f7c] hover:bg-[#fdeef3]"
            >
              <LogOut size={18} />
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-[#f1edfc] text-[#6b5bd0]"
                      : "text-[#5a627a] hover:bg-[#f7f4ff]"
                  }`}
                >
                  <Icon size={16} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}