"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Calendar, 
  FileText,
  LogOut,
  Settings
} from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

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

  // Verificar que sea SuperAdmin
  if (session.user?.rol !== "SuperAdmin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">SuperAdmin</h1>
          <p className="text-sm text-gray-500">Panel de Control</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/superadmin/dashboard"
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/superadmin/organizaciones"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Building2 size={20} />
            <span>Organizaciones</span>
          </Link>
          <Link
            href="/superadmin/usuarios"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Users size={20} />
            <span>Usuarios</span>
          </Link>
          <Link
            href="/superadmin/actividades"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Calendar size={20} />
            <span>Actividades</span>
          </Link>
          <Link
            href="/superadmin/reportes"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FileText size={20} />
            <span>Reportes</span>
          </Link>
          <Link
            href="/superadmin/configuracion"
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Settings size={20} />
            <span>Configuración</span>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg hover:bg-red-50 text-red-600 transition"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">
            Dashboard de SuperAdmin
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session.user?.correo}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
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