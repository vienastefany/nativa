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
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Próximas / en curso",
      valor: actividadesProximas,
      icon: Calendar,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Finalizadas",
      valor: actividadesFinalizadas,
      icon: Shield,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/superadmin/organizaciones"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition"
          >
            <ArrowLeft size={16} />
            Volver a organizaciones
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2 flex items-center gap-3">
            {organizacion.logo_url ? (
              <img
                src={organizacion.logo_url}
                alt={organizacion.nombre}
                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
              />
            ) : (
              <span className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Building2 size={20} />
              </span>
            )}
            {organizacion.nombre}
          </h1>
        </div>
        <Link
          href={`/superadmin/organizaciones/${organizacion.id}/editar`}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition self-start"
        >
          <Pencil size={16} />
          Editar
        </Link>
      </div>

      {!organizacion.activo && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Esta organización está <strong>inactiva</strong>. Sus administradores
          no podrán operar normalmente hasta que se active.
        </div>
      )}

      {/* Información general */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Información general
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm text-gray-500">RUC</dt>
              <dd className="text-gray-800 font-medium mt-1">
                {organizacion.ruc || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Correo</dt>
              <dd className="text-gray-800 font-medium mt-1 flex items-center gap-1.5">
                {organizacion.correo ? (
                  <>
                    <Mail size={14} className="text-gray-400" />
                    {organizacion.correo}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Teléfono</dt>
              <dd className="text-gray-800 font-medium mt-1 flex items-center gap-1.5">
                {organizacion.telefono ? (
                  <>
                    <Phone size={14} className="text-gray-400" />
                    {organizacion.telefono}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Dirección</dt>
              <dd className="text-gray-800 font-medium mt-1 flex items-center gap-1.5">
                {organizacion.direccion ? (
                  <>
                    <MapPin size={14} className="text-gray-400" />
                    {organizacion.direccion}
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Fecha de registro</dt>
              <dd className="text-gray-800 font-medium mt-1">
                {formatFecha(organizacion.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Estado</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    organizacion.activo
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Administradores
          </h2>
          <NuevoAdministrador
            organizacionId={organizacion.id}
            organizacionNombre={organizacion.nombre}
          />
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {administradoresList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Users size={40} className="mb-3" />
              <p className="text-sm">
                Aún no hay administradores asignados a esta organización.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {administradoresList.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{u.correo}</p>
                        <p className="text-xs text-gray-400">ID: {u.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.rol.nombre === "Administrador"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          <Shield size={12} />
                          {u.rol.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.activo
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Actividades formativas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {resumenCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-lg shadow p-6 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {card.valor}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-full`}>
                  <Icon size={22} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {totalActividades === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <FileText size={40} className="mb-3" />
              <p className="text-sm">
                Esta organización aún no tiene actividades formativas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium">Actividad</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {organizacion.actividades.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {a.titulo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {estadoActividadLabel[a.estado] || a.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
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
