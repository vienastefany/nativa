"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    {
      title: "Organizaciones",
      value: stats.totalOrganizaciones,
      icon: Building2,
      color: "bg-blue-500",
    },
    {
      title: "Usuarios",
      value: stats.totalUsuarios,
      icon: Users,
      color: "bg-green-500",
    },
    {
      title: "Actividades",
      value: stats.totalActividades,
      icon: Calendar,
      color: "bg-purple-500",
    },
    {
      title: "Participantes",
      value: stats.totalParticipantes,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Panel de Control
      </h1>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-full`}>
                <Icon size={24} className="text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenido adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas organizaciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Últimas Organizaciones
          </h3>
          <p className="text-gray-500 text-sm">
            Aquí se mostrarán las organizaciones recientes
          </p>
        </div>

        {/* Actividades recientes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Actividades Recientes
          </h3>
          <p className="text-gray-500 text-sm">
            Aquí se mostrarán las actividades recientes
          </p>
        </div>
      </div>
    </div>
  );
}