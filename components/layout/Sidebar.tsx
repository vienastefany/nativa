"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  FileText,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const menuItems = [
  {
    name: "Panel Principal",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Actividades",
    href: "/administrador/actividades",
    icon: BookOpen,
  },
  {
    name: "Sesiones",
    href: "/administrador/sesiones",
    icon: CalendarDays,
  },
  {
    name: "Formularios",
    href: "/administrador/formularios",
    icon: FileText,
  },
  {
    name: "Participantes",
    href: "/administrador/participantes",
    icon: Users,
  },
  {
    name: "Asistencias",
    href: "/administrador/asistencias",
    icon: ClipboardCheck,
  },
  {
    name: "Reportes",
    href: "/administrador/reportes",
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
      
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-gray-200 px-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Gestión Actividades formativas
          </h1>
          <p className="text-xs text-gray-500">
            Sistema de Gestión
          </p>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex flex-col gap-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Parte inferior */}
      <div className="absolute bottom-0 left-0 w-full border-t border-gray-200 p-4">
        
        <Link
          href="/configuracion"
          className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <Settings size={20} />
          <span>Configuración</span>
        </Link>

        <button
          type="button"
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut size={20} />
          <span>Cerrar sesión</span>
        </button>

      </div>
    </aside>
  );
}