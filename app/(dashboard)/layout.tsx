"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const navLinkCls = (href: string, active: boolean) =>
    `flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition ${
      active
        ? "bg-blue-600 text-white"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              Sistema de Gestión
            </h1>
            <div className="flex items-center gap-4 lg:hidden">
              <span className="text-sm text-gray-600">
                {session.user?.correo} ({session.user?.rol})
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <nav className="flex items-center gap-2">
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
            <div className="hidden lg:flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-600">
                {session.user?.correo} ({session.user?.rol})
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}