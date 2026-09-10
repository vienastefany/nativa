"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  BookOpen,
  User,
  Users,
  CalendarDays,
  MapPin,
  Video,
  Clock,
  Loader2,
  Plus,
  Trash2,
  X,
  Save,
  Copy,
  Check,
  ClipboardList,
  Share2,
} from "lucide-react";
import {
  dateToFechaStr,
  dateToHoraStr,
} from "@/lib/actividades";

interface Sesion {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string;
  lugar: string | null;
  enlace_virtual: string | null;
  estado: string;
  qr_token: string | null;
}

interface ActividadDetalle {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo_actividad: { id: number; nombre: string };
  organizacion: { id: number; nombre: string };
  creador: { id: number; correo: string };
  instructor_nombres: string | null;
  instructor_apellidos: string | null;
  instructor_profesion: string | null;
  capacidad: number | null;
  estado: string;
  inscripciones_abiertas: boolean;
  token_inscripcion: string | null;
  created_at: string;
  sesiones: Sesion[];
  total_inscritos: number;
}

interface Inscrito {
  id: number;
  estado: string;
  fecha_inscripcion: string;
  fecha_cancelacion: string | null;
  participante: {
    id: number;
    nombres: string;
    apellidos: string;
    dni: string;
    telefono: string | null;
  };
}

interface ActividadDetalleProps {
  actividadId: number;
  basePath: string;
  mostrarOrganizacion?: boolean;
}

const ESTADO_LABELS: Record<string, string> = {
  Borrador: "Borrador",
  Publicada: "Publicada",
  En_curso: "En curso",
  Finalizada: "Finalizada",
  Cancelada: "Cancelada",
};

const ESTADO_SELECT: Record<string, string> = {
  Borrador: "bg-slate-50 text-slate-600",
  Publicada: "bg-primary-50 text-primary-700",
  En_curso: "bg-sky-50 text-sky-700",
  Finalizada: "bg-emerald-50 text-emerald-700",
  Cancelada: "bg-red-50 text-red-600",
};

const ESTADO_SESION_LABELS: Record<string, string> = {
  Programada: "Programada",
  En_curso: "En curso",
  Finalizada: "Finalizada",
  Cancelada: "Cancelada",
};

const ESTADO_SESION_BADGE: Record<string, string> = {
  Programada: "badge-muted",
  En_curso: "badge-info",
  Finalizada: "badge-success",
  Cancelada: "badge-danger",
};

const ESTADO_SESION_SELECT: Record<string, string> = {
  Programada: "bg-slate-50 text-slate-600",
  En_curso: "bg-sky-50 text-sky-700",
  Finalizada: "bg-emerald-50 text-emerald-700",
  Cancelada: "bg-red-50 text-red-600",
};

const inputCls = "input";
const labelCls = "label";

export default function ActividadDetalle({
  actividadId,
  basePath,
  mostrarOrganizacion = false,
}: ActividadDetalleProps) {
  const [actividad, setActividad] = useState<ActividadDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [inscritos, setInscritos] = useState<Inscrito[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [accionInscritoId, setAccionInscritoId] = useState<number | null>(null);
  const [enlaceInscripcion, setEnlaceInscripcion] = useState("");

  // Gestión de sesiones
  const [formAbierto, setFormAbierto] = useState(false);
  const [sesionEditando, setSesionEditando] = useState<Sesion | null>(null);
  const [formError, setFormError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [accionId, setAccionId] = useState<number | null>(null);
  const [form, setForm] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    modalidad: "Presencial",
    lugar: "",
    enlace_virtual: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/actividades/${actividadId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar");
      setActividad(data);
      setError("");
    } catch {
      setError("No se pudo cargar la actividad.");
    } finally {
      setLoading(false);
    }
    try {
      const res = await fetch(`/api/actividades/${actividadId}/inscripciones`);
      const data = await res.json();
      if (res.ok) setInscritos(data);
    } catch {
      setInscritos([]);
    }
  }, [actividadId]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (actividad?.token_inscripcion) {
        setEnlaceInscripcion(
          `${window.location.origin}/inscribirse/${actividad.token_inscripcion}`
        );
      }
    }, 0);
    return () => clearTimeout(t);
  }, [actividad?.token_inscripcion]);

  const setField = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const abrirNuevaSesion = () => {
    setSesionEditando(null);
    setFormError("");
    setForm({
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      modalidad: "Presencial",
      lugar: "",
      enlace_virtual: "",
    });
    setFormAbierto(true);
  };

  const abrirEditarSesion = (s: Sesion) => {
    setSesionEditando(s);
    setFormError("");
    setForm({
      fecha: dateToFechaStr(s.fecha),
      hora_inicio: dateToHoraStr(s.hora_inicio),
      hora_fin: dateToHoraStr(s.hora_fin),
      modalidad: s.modalidad,
      lugar: s.lugar ?? "",
      enlace_virtual: s.enlace_virtual ?? "",
    });
    setFormAbierto(true);
  };

  const cerrarForm = () => {
    setFormAbierto(false);
    setSesionEditando(null);
    setFormError("");
  };

  const guardarSesion = async () => {
    if (!form.fecha || !form.hora_inicio || !form.hora_fin) {
      setFormError("Completa la fecha y las horas.");
      return;
    }
    if (form.modalidad === "Presencial" && !form.lugar.trim()) {
      setFormError("Ingresa el lugar de la sesión presencial.");
      return;
    }
    if (form.modalidad === "Virtual" && !form.enlace_virtual.trim()) {
      setFormError("Ingresa el enlace de la sesión virtual.");
      return;
    }

    setEnviando(true);
    setFormError("");
    try {
      const payload = {
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        modalidad: form.modalidad,
        lugar: form.lugar.trim() || null,
        enlace_virtual: form.enlace_virtual.trim() || null,
      };
      const url = sesionEditando
        ? `/api/sesiones/${sesionEditando.id}`
        : `/api/actividades/${actividadId}/sesiones`;
      const method = sesionEditando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");

      setToast(
        sesionEditando
          ? "Sesión actualizada"
          : "Sesión creada"
      );
      cerrarForm();
      await load();
    } catch (e) {
      setFormError((e as Error).message || "Ocurrió un error.");
    } finally {
      setEnviando(false);
    }
  };

  const cambiarEstadoSesion = async (s: Sesion, nuevoEstado: string) => {
    if (nuevoEstado === s.estado) return;
    setAccionId(s.id);
    try {
      const res = await fetch(`/api/sesiones/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setToast(`Sesión marcada como ${ESTADO_SESION_LABELS[nuevoEstado] ?? nuevoEstado}`);
      await load();
    } catch (e) {
      setFormError((e as Error).message || "No se pudo actualizar el estado.");
    } finally {
      setAccionId(null);
    }
  };

  const eliminarSesion = async (s: Sesion) => {
    if (!window.confirm("¿Eliminar esta sesión?")) return;
    setAccionId(s.id);
    try {
      const res = await fetch(`/api/sesiones/${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      setToast("Sesión eliminada");
      await load();
    } catch (e) {
      setFormError((e as Error).message || "No se pudo eliminar la sesión.");
    } finally {
      setAccionId(null);
    }
  };

  const cambiarEstadoActividad = async (nuevoEstado: string) => {
    if (nuevoEstado === actividad?.estado) return;
    setCambiandoEstado(true);
    try {
      const res = await fetch(`/api/actividades/${actividadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setToast(`Actividad marcada como ${ESTADO_LABELS[nuevoEstado] ?? nuevoEstado}`);
      await load();
    } catch (e) {
      setFormError((e as Error).message || "No se pudo actualizar el estado.");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const copiarEnlace = async () => {
    if (!enlaceInscripcion) return;
    try {
      await navigator.clipboard.writeText(enlaceInscripcion);
      setCopiado(true);
      setToast("Enlace de inscripción copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setToast("No se pudo copiar el enlace");
    }
  };

  const cambiarEstadoInscrito = async (i: Inscrito, nuevoEstado: string) => {
    setAccionInscritoId(i.id);
    setFormError("");
    try {
      const res = await fetch(`/api/inscripciones/${i.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      setToast(
        nuevoEstado === "Cancelada"
          ? `Inscripción de ${i.participante.nombres} cancelada`
          : `Inscripción de ${i.participante.nombres} reactivada`
      );
      await load();
    } catch (e) {
      setFormError((e as Error).message || "No se pudo actualizar la inscripción.");
    } finally {
      setAccionInscritoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !actividad) {
    return (
      <div className="alert alert-error">
        {error || "Actividad no encontrada."}
      </div>
    );
  }

  const fmtFecha = new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formatFecha = (f: string) => fmtFecha.format(new Date(f));

  const hoy = dateToFechaStr(new Date());

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={basePath}
            className="back-link"
          >
            <ArrowLeft size={16} />
            Volver a actividades
          </Link>
          <h1 className="page-title mt-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <BookOpen size={20} />
            </span>
            {actividad.titulo}
          </h1>
        </div>
        <Link
          href={`${basePath}/${actividad.id}/editar`}
          className="btn btn-secondary self-start"
        >
          <Pencil size={16} />
          Editar
        </Link>
      </div>

      {toast && <div className="alert alert-success mb-6">{toast}</div>}

      <section className="mb-8">
        <h2 className="section-title">Información general</h2>
        <div className="card p-6">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">Tipo</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {actividad.tipo_actividad.nombre}
              </dd>
            </div>
            {mostrarOrganizacion && (
              <div>
                <dt className="text-sm text-slate-500">Organización</dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {actividad.organizacion.nombre}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-slate-500">Estado</dt>
              <dd className="mt-1 flex items-center gap-2">
                <select
                  value={actividad.estado}
                  onChange={(e) => cambiarEstadoActividad(e.target.value)}
                  disabled={cambiandoEstado}
                  className={`select px-2 py-1.5 pr-7 text-xs ${
                    ESTADO_SELECT[actividad.estado] ?? "text-slate-600"
                  }`}
                  title="Cambiar estado de la actividad"
                >
                  {Object.keys(ESTADO_LABELS).map((k) => (
                    <option key={k} value={k}>
                      {ESTADO_LABELS[k]}
                    </option>
                  ))}
                </select>
                {cambiandoEstado && (
                  <Loader2 size={16} className="animate-spin text-primary-600" />
                )}
              </dd>
              <dd className="mt-1">
                {actividad.inscripciones_abiertas ? (
                  <span className="badge badge-success">
                    Inscripciones abiertas
                  </span>
                ) : (
                  <span className="badge badge-muted">
                    Inscripciones cerradas
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Capacidad</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                <Users size={14} className="text-slate-400" />
                {actividad.capacidad ?? "Sin límite"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Inscritos</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-medium text-slate-800">
                <Users size={14} className="text-slate-400" />
                {actividad.total_inscritos}
                {actividad.capacidad ? ` / ${actividad.capacidad}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Creado por</dt>
              <dd className="mt-1 truncate font-medium text-slate-800">
                {actividad.creador.correo}
              </dd>
            </div>
          </dl>

          {actividad.descripcion && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {actividad.descripcion}
              </p>
            </div>
          )}

          {(actividad.instructor_nombres || actividad.instructor_profesion) && (
            <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-6">
              <span className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                <User size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-800">
                  {actividad.instructor_nombres || "Instructor no asignado"}{" "}
                  {actividad.instructor_apellidos ?? ""}
                </p>
                {actividad.instructor_profesion && (
                  <p className="text-sm text-slate-500">
                    {actividad.instructor_profesion}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enlace de inscripción */}
      <section className="mb-8">
        <h2 className="section-title flex items-center gap-2">
          <Share2 size={18} className="text-slate-400" />
          Enlace de inscripción
        </h2>
        <div className="card p-6">
          <p className="mb-3 text-sm text-slate-500">
            Comparte este enlace para que los participantes se inscriban sin
            necesidad de cuenta.
            {actividad.estado !== "Publicada" &&
              " El enlace solo funcionará cuando la actividad tenga estado \"Publicada\"."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
              {enlaceInscripcion || "Cargando..."}
            </code>
            <button
              onClick={copiarEnlace}
              disabled={!enlaceInscripcion}
              className="btn btn-secondary shrink-0"
              title="Copiar enlace"
            >
              {copiado ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      {/* Inscritos */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title mb-0 flex items-center gap-2">
            <ClipboardList size={18} className="text-slate-400" />
            Inscritos
            <span className="text-sm font-normal text-slate-400">
              ({actividad.total_inscritos}
              {actividad.capacidad ? ` / ${actividad.capacidad}` : ""})
            </span>
          </h2>
        </div>

        <div className="card overflow-hidden">
          {inscritos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={24} />
              </div>
              <p className="font-medium text-slate-600">
                {actividad.inscripciones_abiertas && actividad.estado === "Publicada"
                  ? "Aún no hay inscritos"
                  : "Las inscripciones no están abiertas todavía"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {actividad.inscripciones_abiertas && actividad.estado === "Publicada"
                  ? "Comparte el enlace de inscripción para empezar a recibir participantes."
                  : "Las inscripciones se habilitarán cuando la actividad esté publicada."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>DNI</th>
                    <th>Teléfono</th>
                    <th>Fecha de inscripción</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((i) => (
                    <tr key={i.id} className={i.estado === "Cancelada" ? "opacity-60" : ""}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                            {i.participante.nombres.charAt(0)}
                            {i.participante.apellidos.charAt(0)}
                          </span>
                          <span className="font-medium text-slate-800">
                            {i.participante.nombres} {i.participante.apellidos}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono">{i.participante.dni}</td>
                      <td>{i.participante.telefono ?? "—"}</td>
                      <td>{formatFecha(i.fecha_inscripcion)}</td>
                      <td>
                        <span
                          className={`badge ${
                            i.estado === "Inscrita" ? "badge-success" : "badge-muted"
                          }`}
                        >
                          {i.estado === "Inscrita" ? "Inscrito" : "Cancelado"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end">
                          {accionInscritoId === i.id ? (
                            <Loader2 size={16} className="animate-spin text-primary-600" />
                          ) : (
                            <button
                              onClick={() =>
                                cambiarEstadoInscrito(
                                  i,
                                  i.estado === "Inscrita" ? "Cancelada" : "Inscrita"
                                )
                              }
                              className={`btn btn-sm ${
                                i.estado === "Inscrita" ? "btn-danger" : "btn-success"
                              }`}
                            >
                              {i.estado === "Inscrita" ? "Cancelar" : "Reactivar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Sesiones */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title mb-0">
            Sesiones
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({actividad.sesiones.length})
            </span>
          </h2>
          {!formAbierto && (
            <button
              onClick={abrirNuevaSesion}
              className="btn btn-primary"
            >
              <Plus size={16} />
              Nueva sesión
            </button>
          )}
        </div>

        {formError && (
          <div className="alert alert-error mb-4">{formError}</div>
        )}

        {/* Formulario crear/editar sesión */}
        {formAbierto && (
          <div className="card mb-6 border-primary-100 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {sesionEditando ? "Editar sesión" : "Nueva sesión"}
              </h3>
              <button
                onClick={cerrarForm}
                className="icon-btn"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  min={hoy}
                  onChange={(e) => setField("fecha", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Hora inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.hora_inicio}
                  onChange={(e) => setField("hora_inicio", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  Hora fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.hora_fin}
                  onChange={(e) => setField("hora_fin", e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>
                  Modalidad <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.modalidad}
                  onChange={(e) => setField("modalidad", e.target.value)}
                  className={inputCls}
                >
                  <option value="Presencial">Presencial</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Hibrida">Híbrida</option>
                </select>
              </div>
              {form.modalidad !== "Virtual" && (
                <div className="sm:col-span-1">
                  <label className={labelCls}>
                    Lugar {form.modalidad === "Presencial" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={form.lugar}
                    onChange={(e) => setField("lugar", e.target.value)}
                    placeholder="Auditorio, aula, local..."
                    className={inputCls}
                  />
                </div>
              )}
              {form.modalidad !== "Presencial" && (
                <div className="sm:col-span-1">
                  <label className={labelCls}>
                    Enlace virtual {form.modalidad === "Virtual" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={form.enlace_virtual}
                    onChange={(e) => setField("enlace_virtual", e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={cerrarForm}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={guardarSesion}
                disabled={enviando}
                className="btn btn-primary"
              >
                {enviando ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {sesionEditando ? "Guardar cambios" : "Crear sesión"}
              </button>
            </div>
          </div>
        )}

        <div className="card overflow-hidden">
          {actividad.sesiones.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <CalendarDays size={24} />
              </div>
              <p className="font-medium text-slate-600">
                Esta actividad aún no tiene sesiones programadas
              </p>
              {!formAbierto && (
                <button
                  onClick={abrirNuevaSesion}
                  className="btn btn-secondary mt-4"
                >
                  <Plus size={16} />
                  Agregar la primera sesión
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Horario</th>
                    <th>Modalidad</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {actividad.sesiones.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium text-slate-700">
                        {formatFecha(s.fecha)}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {dateToHoraStr(s.hora_inicio)} -{" "}
                          {dateToHoraStr(s.hora_fin)}
                        </span>
                      </td>
                      <td>
                        <span className="text-slate-700">{s.modalidad}</span>
                      </td>
                      <td>
                        {s.modalidad === "Virtual" || s.modalidad === "Hibrida" ? (
                          s.enlace_virtual ? (
                            <a
                              href={s.enlace_virtual}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary-600 hover:underline"
                            >
                              <Video size={14} />
                              Enlace virtual
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )
                        ) : s.lugar ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-slate-400" />
                            {s.lugar}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            ESTADO_SESION_BADGE[s.estado] ?? "badge-muted"
                          }`}
                        >
                          {ESTADO_SESION_LABELS[s.estado] || s.estado}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={s.estado}
                            onChange={(e) =>
                              cambiarEstadoSesion(s, e.target.value)
                            }
                            disabled={accionId === s.id}
                            className={`select px-2 py-1.5 pr-7 text-xs ${
                              ESTADO_SESION_SELECT[s.estado] ?? "text-slate-600"
                            }`}
                            title="Cambiar estado"
                          >
                            {Object.keys(ESTADO_SESION_LABELS).map((k) => (
                              <option key={k} value={k}>
                                {ESTADO_SESION_LABELS[k]}
                              </option>
                            ))}
                          </select>
                          {accionId === s.id ? (
                            <Loader2 size={16} className="ml-1 animate-spin text-primary-600" />
                          ) : null}
                          <button
                            onClick={() => abrirEditarSesion(s)}
                            title="Editar sesión"
                            className="icon-btn hover:text-primary-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => eliminarSesion(s)}
                            disabled={accionId === s.id}
                            title="Eliminar sesión"
                            className="icon-btn hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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