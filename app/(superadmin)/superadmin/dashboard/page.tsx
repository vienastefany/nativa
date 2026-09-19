"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  ArrowRight,
  Plus,
  ClipboardList,
  ListChecks,
  Building,
} from "lucide-react";

interface DashboardStats {
  totalOrganizaciones: number;
  totalUsuarios: number;
  totalActividades: number;
  totalParticipantes: number;
}

interface Organizacion {
  id: number;
  nombre: string;
  correo: string | null;
  activo: boolean;
  created_at: string;
  cantidad_administradores: number;
  cantidad_actividades: number;
}

interface Actividad {
  id: number;
  titulo: string;
  tipo_actividad_nombre: string;
  organizacion: { id: number; nombre: string };
  estado: string;
  created_at: string;
  total_sesiones: number;
  total_inscritos: number;
}

const ESTADOS_ORDEN = [
  "Borrador",
  "Publicada",
  "En_curso",
  "Finalizada",
  "Cancelada",
];

const estadoStyle: Record<
  string,
  { dot: string; text: string; bg: string }
> = {
  Borrador: { dot: "bg-[#b9a7f0]", text: "text-[#6b5bd0]", bg: "bg-[#f1edfc]" },
  Publicada: { dot: "bg-[#5ec4a1]", text: "text-[#2c8f6d]", bg: "bg-[#e6f6ef]" },
  En_curso: { dot: "bg-[#8f7be8]", text: "text-[#5a49b8]", bg: "bg-[#efeafd]" },
  Finalizada: {
    dot: "bg-[#93a0b8]",
    text: "text-[#64708a]",
    bg: "bg-[#f0f2f7]",
  },
  Cancelada: {
    dot: "bg-[#e58ca9]",
    text: "text-[#c94f7c]",
    bg: "bg-[#fdeef3]",
  },
};

function cardCls(extra = "") {
  return `rounded-2xl border border-[#efeaf8] bg-white p-5 shadow-[0_1px_2px_rgba(14,28,60,0.04),0_12px_32px_-16px_rgba(124,108,224,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(14,28,60,0.05),0_18px_44px_-16px_rgba(124,108,224,0.28)] ${extra}`;
}

function EstadoBadge({ estado }: { estado: string }) {
  const st = estadoStyle[estado] ?? estadoStyle.Borrador;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-300 ${st.bg} ${st.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
      {estado}
    </span>
  );
}

function SkeletonBento() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-[#efeaf8] bg-white p-5"
          >
            <div className="h-3 w-24 rounded-full bg-[#f0ecfb]" />
            <div className="mt-4 h-7 w-16 rounded-lg bg-[#f7f4ff]" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`h-56 animate-pulse rounded-2xl border border-[#efeaf8] bg-white ${
              i === 1 ? "lg:col-span-2" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrganizaciones: 0,
    totalUsuarios: 0,
    totalActividades: 0,
    totalParticipantes: 0,
  });
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [statsRes, orgsRes, actsRes] = await Promise.all([
          fetch("/api/superadmin/stats"),
          fetch("/api/superadmin/organizaciones"),
          fetch("/api/actividades"),
        ]);
        if (!statsRes.ok || !orgsRes.ok || !actsRes.ok) {
          throw new Error("No se pudieron cargar las estadísticas");
        }
        const [statsData, orgsData, actsData] = await Promise.all([
          statsRes.json(),
          orgsRes.json(),
          actsRes.json(),
        ]);
        setStats(statsData);
        setOrganizaciones(orgsData);
        setActividades(actsData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const kpis = [
    {
      title: "Organizaciones",
      value: String(stats.totalOrganizaciones),
      icon: Building2,
      tint: "bg-[#f1edfc] text-[#7c6ce0]",
    },
    {
      title: "Usuarios",
      value: String(stats.totalUsuarios),
      icon: Users,
      tint: "bg-[#e6f6ef] text-[#3fae85]",
    },
    {
      title: "Actividades",
      value: String(stats.totalActividades),
      icon: Calendar,
      tint: "bg-[#fdf6e3] text-[#d9a536]",
    },
    {
      title: "Participantes",
      value: String(stats.totalParticipantes),
      icon: TrendingUp,
      tint: "bg-[#fdeef3] text-[#e58ca9]",
    },
  ];

  const porEstado = useMemo(() => {
    const counts = ESTADOS_ORDEN.map((estado) => ({
      estado,
      count: actividades.filter((a) => a.estado === estado).length,
    })).filter((c) => c.count > 0);
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [actividades]);

  const recientes = useMemo(
    () =>
      [...actividades]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 4),
    [actividades]
  );

  const ultimasOrganizaciones = useMemo(
    () =>
      [...organizaciones]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 4),
    [organizaciones]
  );

  const totalInscritos = useMemo(
    () => actividades.reduce((acc, a) => acc + a.total_inscritos, 0),
    [actividades]
  );

  const totalSesiones = useMemo(
    () => actividades.reduce((acc, a) => acc + a.total_sesiones, 0),
    [actividades]
  );

  const accesos = [
    {
      label: "Nueva organización",
      desc: "Registrar organización",
      href: "/superadmin/organizaciones",
      icon: Building,
      tint: "bg-[#f1edfc] text-[#7c6ce0]",
    },
    {
      label: "Organizaciones",
      desc: "Gestionar organizaciones",
      href: "/superadmin/organizaciones",
      icon: ListChecks,
      tint: "bg-[#e6f6ef] text-[#3fae85]",
    },
    {
      label: "Usuarios",
      desc: "Administrar usuarios",
      href: "/superadmin/usuarios",
      icon: ClipboardList,
      tint: "bg-[#fdf6e3] text-[#d9a536]",
    },
  ];

  const hoy = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-6">
      {loading ? (
        <SkeletonBento />
      ) : (
        <>
          {/* Bienvenida */}
          <div className="relative overflow-hidden rounded-2xl border border-[#efeaf8] bg-gradient-to-r from-[#f6f3ff] via-white to-white p-6 shadow-[0_1px_2px_rgba(14,28,60,0.04),0_12px_32px_-16px_rgba(124,108,224,0.18)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#f1edfc] blur-2xl" />
            <div className="relative">
              <p className="text-sm font-medium capitalize text-[#7c6ce0]">
                {hoy}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0e1c3c]">
                Panel de Control
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#f1edfc] px-2.5 py-0.5 align-middle text-xs font-semibold text-[#6b5bd0]">
                  <Sparkles size={12} />
                  SuperAdmin
                </span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-[#64708a]">
                Resumen general del sistema para administración central. Datos
                en tiempo real.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#f5c6d6] bg-[#fdeef3] px-4 py-3 text-sm font-medium text-[#c94f7c]">
              {error}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.title}
                  title={`${kpi.title}: ${kpi.value}`}
                  className={cardCls("group")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#8b93ab]">
                        {kpi.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-[#0e1c3c] transition-transform duration-300 group-hover:scale-105 group-hover:text-[#6b5bd0]">
                        {kpi.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${kpi.tint}`}
                    >
                      <Icon size={22} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fila principal: gráfico + últimas organizaciones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={cardCls()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdeef3] text-[#e58ca9]">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-base font-semibold text-[#0e1c3c]">
                  Actividades por estado
                </h3>
              </div>
              {porEstado.counts.length === 0 ? (
                <p className="text-sm text-[#8b93ab]">
                  Sin actividades registradas.
                </p>
              ) : (
                <div className="space-y-4">
                  {porEstado.counts.map((c) => {
                    const st = estadoStyle[c.estado] ?? estadoStyle.Borrador;
                    const width = mounted
                      ? `${Math.max(6, (c.count / porEstado.max) * 100)}%`
                      : "0%";
                    return (
                      <div key={c.estado}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className={`font-medium ${st.text}`}>
                            {c.estado}
                          </span>
                          <span className="font-bold text-[#0e1c3c]">
                            {c.count}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#f4f1fe]">
                          <div
                            className={`h-full rounded-full ${st.dot} transition-all duration-700 ease-out`}
                            style={{ width }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f7f4ff] px-4 py-3">
                  <p className="text-xs font-medium text-[#8b93ab]">Inscritos</p>
                  <p className="text-xl font-bold text-[#6b5bd0]">
                    {totalInscritos}
                  </p>
                </div>
                <div className="rounded-xl bg-[#e6f6ef] px-4 py-3">
                  <p className="text-xs font-medium text-[#8b93ab]">
                    Sesiones
                  </p>
                  <p className="text-xl font-bold text-[#3fae85]">
                    {totalSesiones}
                  </p>
                </div>
              </div>
            </div>

            {/* Últimas Organizaciones */}
            <div className={cardCls("lg:col-span-2")}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1edfc] text-[#7c6ce0]">
                    <Building2 size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-[#0e1c3c]">
                    Últimas organizaciones
                  </h3>
                </div>
                <Link
                  href="/superadmin/organizaciones"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#7c6ce0] transition-colors hover:text-[#6b5bd0]"
                >
                  Ver todas <ArrowRight size={13} />
                </Link>
              </div>
              {ultimasOrganizaciones.length === 0 ? (
                <p className="text-sm text-[#8b93ab]">
                  Aún no hay organizaciones registradas.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ultimasOrganizaciones.map((org) => (
                    <Link
                      key={org.id}
                      href={`/superadmin/organizaciones/${org.id}`}
                      className="group flex items-start gap-3 rounded-xl border border-[#f0ecfb] px-4 py-3 transition-all duration-200 hover:border-[#dcd2f8] hover:bg-[#f7f4ff]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1edfc] text-[#7c6ce0] transition-transform duration-200 group-hover:scale-110">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0e1c3c]">
                          {org.nombre}
                        </p>
                        <p className="truncate text-xs text-[#8b93ab]">
                          {org.correo ?? "Sin correo"} ·{" "}
                          {org.cantidad_actividades}{" "}
                          {org.cantidad_actividades === 1
                            ? "actividad"
                            : "actividades"}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          org.activo
                            ? "bg-[#e6f6ef] text-[#3fae85]"
                            : "bg-[#f0f2f7] text-[#93a0b8]"
                        }`}
                      >
                        {org.activo ? "Activo" : "Inactivo"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila bento: actividades recientes + accesos rápidos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={cardCls("lg:col-span-2")}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f6ef] text-[#3fae85]">
                    <Clock size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-[#0e1c3c]">
                    Actividades recientes
                  </h3>
                </div>
                <Link
                  href="/superadmin/actividades"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#7c6ce0] transition-colors hover:text-[#6b5bd0]"
                >
                  Ver todas <ArrowRight size={13} />
                </Link>
              </div>
              {recientes.length === 0 ? (
                <p className="text-sm text-[#8b93ab]">
                  Aún no se registran actividades.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recientes.map((a) => (
                    <Link
                      key={a.id}
                      href={`/superadmin/actividades/${a.id}`}
                      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-[#f7f4ff]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7f4ff] text-[#7c6ce0] transition-transform duration-200 group-hover:scale-110">
                        <Sparkles size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0e1c3c]">
                          {a.titulo}
                        </p>
                        <p className="truncate text-xs text-[#8b93ab]">
                          {a.organizacion.nombre} · {a.tipo_actividad_nombre}
                        </p>
                      </div>
                      <EstadoBadge estado={a.estado} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Accesos rápidos */}
            <div className={cardCls()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf6e3] text-[#d9a536]">
                  <Plus size={16} />
                </div>
                <h3 className="text-base font-semibold text-[#0e1c3c]">
                  Accesos rápidos
                </h3>
              </div>
              <div className="space-y-2.5">
                {accesos.map((acc) => {
                  const Icon = acc.icon;
                  return (
                    <Link
                      key={acc.label}
                      href={acc.href}
                      className="group flex items-center gap-3 rounded-xl border border-[#f0ecfb] px-3.5 py-3 transition-all duration-200 hover:border-[#dcd2f8] hover:bg-[#f7f4ff]"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110 ${acc.tint}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0e1c3c]">
                          {acc.label}
                        </p>
                        <p className="truncate text-xs text-[#8b93ab]">
                          {acc.desc}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="ml-auto text-[#c4bdf0] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#7c6ce0]"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}