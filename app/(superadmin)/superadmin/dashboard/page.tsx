"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface DashboardStats {
  totalOrganizaciones: number;
  totalUsuarios: number;
  totalActividades: number;
  totalParticipantes: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizaciones: 0,
    totalUsuarios: 0,
    totalActividades: 0,
    totalParticipantes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/superadmin/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const cards = [
    {
      title: "Organizaciones",
      value: stats.totalOrganizaciones,
      icon: Building2,
      tint: "bg-primary-50 text-primary-600",
    },
    {
      title: "Usuarios",
      value: stats.totalUsuarios,
      icon: Users,
      tint: "bg-sky-50 text-sky-600",
    },
    {
      title: "Actividades",
      value: stats.totalActividades,
      icon: Calendar,
      tint: "bg-violet-50 text-violet-600",
    },
    {
      title: "Participantes",
      value: stats.totalParticipantes,
      icon: TrendingUp,
      tint: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Panel de Control</h1>
        <p className="page-subtitle">
          Resumen general del sistema para administración central.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="card card-hover p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tint}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido adicional */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Building2 size={18} className="text-slate-400" />
            <h3 className="section-title mb-0 text-base">
              Últimas Organizaciones
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Aquí se mostrarán las organizaciones recientes.
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-slate-400" />
            <h3 className="section-title mb-0 text-base">
              Actividades Recientes
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Aquí se mostrarán las actividades recientes.
          </p>
        </div>
      </div>
    </div>
  );
}