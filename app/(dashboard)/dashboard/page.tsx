"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  Users,
  CheckCircle2,
  CalendarClock,
  Clock,
  MapPin,
  Video,
  Smartphone,
  ArrowRight,
  Sparkles,
  Plus,
  ListChecks,
  ClipboardList,
  Building2,
  UserPlus,
} from "lucide-react";
import { dateToFechaStr, dateToHoraStr } from "@/lib/actividades";

interface Actividad {
  id: number;
  titulo: string;
  tipo_actividad_nombre: string;
  organizacion: { id: number; nombre: string };
  instructor_nombres: string | null;
  instructor_apellidos: string | null;
  capacidad: number | null;
  estado: string;
  inscripciones_abiertas: boolean;
  created_at: string;
  total_sesiones: number;
  total_inscritos: number;
}

interface Sesion {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar: string | null;
  enlace_virtual: string | null;
  estado: string;
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

const modalidadIcon: Record<string, typeof MapPin> = {
  Presencial: MapPin,
  Virtual: Video,
  Hibrida: Smartphone,
};

const fmtFecha = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtFechaCorta = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
});

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
              i === 0 ? "lg:col-span-2" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [nextSession, setNextSession] = useState<{
    act: Actividad;
    sesion: Sesion;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/actividades");
        if (!res.ok) throw new Error("No se pudieron cargar las actividades");
        const data: Actividad[] = await res.json();
        setActividades(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  useEffect(() => {
    if (loading || actividades.length === 0) return;

    let cancelled = false;

    async function findNextSession() {
      const candidatas = actividades
        .filter((a) => a.estado === "Publicada" || a.estado === "En_curso")
        .filter((a) => a.total_sesiones > 0)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        .slice(0, 6);

      const now = Date.now();
      let best: { act: Actividad; sesion: Sesion } | null = null;
      let bestTime = Infinity;

      for (const act of candidatas) {
        try {
          const res = await fetch(`/api/actividades/${act.id}/sesiones`);
          if (!res.ok) continue;
          const sesiones: Sesion[] = await res.json();
          for (const ses of sesiones) {
            if (ses.estado === "Cancelada") continue;
            const dt = new Date(
              `${dateToFechaStr(ses.fecha)}T${dateToHoraStr(ses.hora_inicio)}`
            ).getTime();
            if (dt >= now && dt < bestTime) {
              bestTime = dt;
              best = { act, sesion: ses };
            }
          }
        } catch {
          // Ignorar sesiones que no se puedan consultar
        }
        if (cancelled) return;
      }

      if (!cancelled) {
        setNextSession(best);
        setMounted(true);
      }
    }

    findNextSession();
    return () => {
      cancelled = true;
    };
  }, [loading, actividades]);

  const kpis = useMemo(() => {
    const total = actividades.length;
    const participantes = actividades.reduce(
      (acc, a) => acc + a.total_inscritos,
      0
    );
    const sesiones = actividades.reduce((acc, a) => acc + a.total_sesiones, 0);
    const proximas = actividades.filter(
      (a) => a.estado === "Publicada" || a.estado === "En_curso"
    ).length;
    return [
      {
        title: "Total Actividades",
        value: String(total),
        icon: Calendar,
        tint: "bg-[#f1edfc] text-[#7c6ce0]",
      },
      {
        title: "Participantes",
        value: String(participantes),
        icon: Users,
        tint: "bg-[#e6f6ef] text-[#3fae85]",
      },
      {
        title: "Sesiones",
        value: String(sesiones),
        icon: CalendarClock,
        tint: "bg-[#fdf6e3] text-[#d9a536]",
      },
      {
        title: "Próximas Actividades",
        value: String(proximas),
        icon: CheckCircle2,
        tint: "bg-[#fdeef3] text-[#e58ca9]",
      },
    ];
  }, [actividades]);

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

  const proximasActividades = useMemo(
    () =>
      actividades
        .filter((a) => a.estado === "Publicada" || a.estado === "En_curso")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 4),
    [actividades]
  );

  const nombreUsuario =
    session?.user?.correo?.split("@")[0] ?? "";

  const accesos = [
    {
      label: "Nueva actividad",
      desc: "Crear actividad formativa",
      href: "/dashboard/actividades",
      icon: Plus,
      tint: "bg-[#f1edfc] text-[#7c6ce0]",
    },
    {
      label: "Lista de actividades",
      desc: "Gestionar actividades",
      href: "/dashboard/actividades",
      icon: ListChecks,
      tint: "bg-[#e6f6ef] text-[#3fae85]",
    },
    {
      label: "Usuarios",
      desc: "Administrar miembros",
      href: "/dashboard/usuarios",
      icon: UserPlus,
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
                Hola, {nombreUsuario || "bienvenido"}
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#e6f6ef] px-2.5 py-0.5 align-middle text-xs font-semibold text-[#3fae85]">
                  <Sparkles size={12} />
                  {session?.user?.rol}
                </span>
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-[#64708a]">
                Este es el resumen de tus actividades formativas. Todo se
                actualiza en tiempo real.
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

          {/* Fila principal: próxima sesión + accesos rápidos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Próxima sesión */}
            <div className={cardCls("lg:col-span-2")}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1edfc] text-[#7c6ce0]">
                  <Clock size={16} />
                </div>
                <h3 className="text-base font-semibold text-[#0e1c3c]">
                  Próxima sesión
                </h3>
              </div>

              {nextSession ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-[#efeaf8] bg-[#fbfaff] px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#8b93ab]">
                      {fmtFechaCorta
                        .format(new Date(nextSession.sesion.fecha))
                        .split(" ")[1]}
                    </span>
                    <span className="text-2xl font-bold text-[#6b5bd0]">
                      {fmtFechaCorta
                        .format(new Date(nextSession.sesion.fecha))
                        .split(" ")[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#0e1c3c]">
                      {nextSession.act.titulo}
                    </p>
                    <p className="mt-0.5 text-sm text-[#64708a]">
                      {fmtFecha.format(new Date(nextSession.sesion.fecha))} ·{" "}
                      {dateToHoraStr(nextSession.sesion.hora_inicio)} –{" "}
                      {dateToHoraStr(nextSession.sesion.hora_fin)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(() => {
                        const IconMod =
                          modalidadIcon[nextSession.sesion.modalidad] ?? Video;
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ef] px-2.5 py-1 text-xs font-semibold text-[#2c8f6d]">
                            <IconMod size={13} />
                            {nextSession.sesion.modalidad}
                          </span>
                        );
                      })()}
                      {nextSession.sesion.lugar && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf6e3] px-2.5 py-1 text-xs font-semibold text-[#a67c11]">
                          <MapPin size={13} />
                          {nextSession.sesion.lugar}
                        </span>
                      )}
                      {nextSession.sesion.estado === "En_curso" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f6ef] px-2.5 py-1 text-xs font-semibold text-[#3fae85]">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3fae85]" />
                          En curso
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/actividades/${nextSession.act.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#f1edfc] px-3.5 py-2.5 text-sm font-semibold text-[#6b5bd0] transition-all duration-200 hover:bg-[#7c6ce0] hover:text-white"
                  >
                    Ver actividad
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-[#8b93ab]">
                  Aún no hay sesiones próximas programadas.
                </p>
              )}
            </div>

            {/* Accesos rápidos */}
            <div className={cardCls()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdf6e3] text-[#d9a536]">
                  <ClipboardList size={16} />
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

          {/* Fila bento: gráfico + listas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Gráfico por estado */}
            <div className={cardCls()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fdeef3] text-[#e58ca9]">
                  <Building2 size={16} />
                </div>
                <h3 className="text-base font-semibold text-[#0e1c3c]">
                  Por estado
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
            </div>

            {/* Actividades recientes */}
            <div className={cardCls()}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f6ef] text-[#3fae85]">
                    <Calendar size={16} />
                  </div>
                  <h3 className="text-base font-semibold text-[#0e1c3c]">
                    Actividades recientes
                  </h3>
                </div>
              </div>
              {recientes.length === 0 ? (
                <p className="text-sm text-[#8b93ab]">
                  Sin actividades aún. Crea la primera desde Actividades.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recientes.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/actividades/${a.id}`}
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
                          {a.tipo_actividad_nombre} ·{" "}
                          {new Date(a.created_at).toLocaleDateString("es-PE", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <EstadoBadge estado={a.estado} />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Próximas actividades */}
            <div className={cardCls()}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1edfc] text-[#7c6ce0]">
                  <CalendarClock size={16} />
                </div>
                <h3 className="text-base font-semibold text-[#0e1c3c]">
                  Próximas actividades
                </h3>
              </div>
              {proximasActividades.length === 0 ? (
                <p className="text-sm text-[#8b93ab]">
                  No hay actividades próximas por ahora.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {proximasActividades.map((a) => {
                    const Icon = a.inscripciones_abiertas ? Users : Calendar;
                    return (
                      <Link
                        key={a.id}
                        href={`/dashboard/actividades/${a.id}`}
                        className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-[#f7f4ff]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f1edfc] text-[#7c6ce0] transition-transform duration-200 group-hover:scale-110">
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#0e1c3c]">
                            {a.titulo}
                          </p>
                          <p className="truncate text-xs text-[#8b93ab]">
                            {a.total_sesiones}{" "}
                            {a.total_sesiones === 1 ? "sesión" : "sesiones"} ·{" "}
                            {a.total_inscritos} inscritos
                          </p>
                        </div>
                        {a.inscripciones_abiertas && (
                          <span className="inline-flex items-center rounded-full bg-[#e6f6ef] px-2 py-0.5 text-xs font-semibold text-[#3fae85]">
                            Inscripción abierta
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}