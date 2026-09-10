"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  LogOut,
  GraduationCap,
} from "lucide-react";

export default function DashboardLayout({
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

  const navLinkCls = (href: string, active: boolean) =>
    `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-primary-50 text-primary-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 shadow-sm shadow-primary-600/20">
                <GraduationCap size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  Sistema de Gestión
                </h1>
                <p className="text-xs text-slate-500">
                  Actividades formativas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => signOut()}
                aria-label="Cerrar sesión"
                className="icon-btn text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <nav className="mt-3 flex items-center gap-1 lg:mt-0">
            <Link
              href="/dashboard"
              className={navLinkCls("/dashboard", pathname === "/dashboard")}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <Link
              href="/dashboard/actividades"
              className={navLinkCls(
                "/dashboard/actividades",
                pathname.startsWith("/dashboard/actividades")
              )}
            >
              <Calendar size={16} />
              Actividades
            </Link>

            <div className="ml-2 hidden items-center gap-3 border-l border-slate-200 pl-4 lg:flex">
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-slate-800">
                  {session.user?.correo}
                </p>
                <p className="text-xs text-slate-500">{session.user?.rol}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="btn btn-secondary btn-sm"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
                Salir
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}