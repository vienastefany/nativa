import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SUPERADMIN } from "@/lib/auth-guard";
import NuevoAdministrador from "@/components/organizaciones/NuevoAdministrador";
import {
  ArrowLeft,
  Pencil,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Users,
  Activity,
  Shield,
} from "lucide-react";

export default async function DetalleOrganizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.rol !== SUPERADMIN) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const organizacionId = Number(id);
  if (!Number.isInteger(organizacionId)) {
    notFound();
  }

  const organizacion = await prisma.organizacion.findUnique({
    where: { id: organizacionId },
    include: {
      usuarios: {
        include: {
          rol: true,
        },
        orderBy: { id: "asc" },
      },
      actividades: {
        select: { id: true, titulo: true, estado: true, created_at: true },
        orderBy: { id: "desc" },
      },
    },
  });

  if (!organizacion) {
    notFound();
  }

  const administradores = organizacion.usuarios.filter(
    (u) => u.rol.nombre === "Administrador"
  );
  const subadministradores = organizacion.usuarios.filter(
    (u) => u.rol.nombre === "Subadministrador"
  );
  const administradoresList = [...administradores, ...subadministradores];

  const totalActividades = organizacion.actividades.length;
  const actividadesProximas = organizacion.actividades.filter((a) =>
    ["Borrador", "Publicada", "En_curso"].includes(a.estado)
  ).length;
  const actividadesFinalizadas = organizacion.actividades.filter(
    (a) => a.estado === "Finalizada"
  ).length;

  const formatFecha = (fecha: Date) =>
    new Date(fecha).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const estadoActividadLabel: Record<string, string> = {
    Borrador: "Borrador",
    Publicada: "Publicada",
    En_curso: "En curso",
    Finalizada: "Finalizada",
    Cancelada: "Cancelada",
  };

  const resumenCards = [
    {
      label: "Total actividades",
      valor: totalActividades,
      icon: Activity,
      tint: "bg-primary-50 text-primary-600",
    },
    {
      label: "Próximas / en curso",
      valor: actividadesProximas,
      icon: Calendar,
      tint: "bg-sky-50 text-sky-600",
    },
    {
      label: "Finalizadas",
      valor: actividadesFinalizadas,
      icon: Shield,
      tint: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/superadmin/organizaciones"
            className="back-link"
          >
            <ArrowLeft size={16} />
            Volver a organizaciones
          </Link>
          <h1 className="page-title mt-2 flex items-center gap-3">
            {organizacion.logo_url ? (
              <img
                src={organizacion.logo_url}
                alt={organizacion.nombre}
                className="h-10 w-10 rounded-xl border border-slate-100 object-cover bg-slate-100"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <Building2 size={20} />
              </span>
            )}
            {organizacion.nombre}
          </h1>
        </div>
        <Link
          href={`/superadmin/organizaciones/${organizacion.id}/editar`}
          className="btn btn-secondary self-start"
        >
          <Pencil size={16} />
          Editar
        </Link>
      </div>

      {!organizacion.activo && (
        <div className="alert alert-warning mb-6">
          Esta organización está <strong>inactiva</strong>. Sus administradores
          no podrán operar normalmente hasta que se active.
        </div>
      )}

      {/* Información general */}
      <section className="mb-8">
        <h2 className="section-title">Información general</h2>
        <div className="card p-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">RUC</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {organizacion.ruc || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Correo</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                {organizacion.correo ? (
                  <>
                    <Mail size={14} className="text-slate-400" />
                    {organizacion.correo}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Teléfono</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                {organizacion.telefono ? (
                  <>
                    <Phone size={14} className="text-slate-400" />
                    {organizacion.telefono}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Dirección</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                {organizacion.direccion ? (
                  <>
                    <MapPin size={14} className="text-slate-400" />
                    {organizacion.direccion}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Fecha de registro</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {formatFecha(organizacion.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Estado</dt>
              <dd className="mt-1">
                <span
                  className={`badge ${
                    organizacion.activo ? "badge-success" : "badge-danger"
                  }`}
                >
                  {organizacion.activo ? "Activa" : "Inactiva"}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Administradores */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title mb-0">Administradores</h2>
          <NuevoAdministrador
            organizacionId={organizacion.id}
            organizacionNombre={organizacion.nombre}
          />
        </div>

        <div className="card overflow-hidden">
          {administradoresList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={24} />
              </div>
              <p className="font-medium text-slate-600">
                Aún no hay administradores asignados a esta organización
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Usa el botón &quot;Nuevo administrador&quot; para asignar uno.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {administradoresList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <p className="font-medium text-slate-800">{u.correo}</p>
                        <p className="text-xs text-slate-400">ID: {u.id}</p>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.rol.nombre === "Administrador"
                              ? "badge-primary"
                              : "badge-info"
                          }`}
                        >
                          <Shield size={12} />
                          {u.rol.nombre}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.activo ? "badge-success" : "badge-muted"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-slate-500">
                        {formatFecha(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Resumen de actividades */}
      <section>
        <h2 className="section-title">Actividades formativas</h2>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {resumenCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card card-hover p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                      {card.valor}
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

        <div className="card overflow-hidden">
          {totalActividades === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FileText size={24} />
              </div>
              <p className="font-medium text-slate-600">
                Esta organización aún no tiene actividades formativas
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Las actividades se podrán crear desde el módulo correspondiente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th>Estado</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {organizacion.actividades.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium text-slate-800">
                        {a.titulo}
                      </td>
                      <td>
                        <span className="badge badge-muted">
                          {estadoActividadLabel[a.estado] || a.estado}
                        </span>
                      </td>
                      <td className="text-slate-500">
                        {formatFecha(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}