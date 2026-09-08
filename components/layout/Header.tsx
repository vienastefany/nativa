"use client";

import { Bell, UserCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8">
      {/* Título de la sección */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Panel de administración
        </h2>

        <p className="text-sm text-slate-500">
          Gestiona tus actividades y participantes
        </p>
      </div>

      {/* Acciones del usuario */}
      <div className="flex items-center gap-5">
        {/* Notificaciones */}
        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Notificaciones"
        >
          <Bell size={20} />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-5">
          <UserCircle size={38} className="text-slate-400" />

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Administrador
            </p>

            <p className="text-xs text-slate-500">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
