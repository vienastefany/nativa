export type EstadoActividad = "Borrador" | "Publicada" | "En_curso" | "Finalizada" | "Cancelada";
export type EstadoSesion = "Programada" | "En_curso" | "Finalizada" | "Cancelada";
export type EstadoInscripcion = "Inscrita" | "Cancelada";
export type Modalidad = "Presencial" | "Virtual" | "Hibrida";

interface Registro { id: number; created_at: Date; updated_at: Date }
export interface Organizacion extends Registro {
  nombre: string; ruc: string | null; direccion: string | null; telefono: string | null;
  correo: string | null; logo_url: string | null; activo: boolean;
}
export interface Rol extends Registro { nombre: string; descripcion: string | null; activo: boolean }
export interface Usuario extends Registro {
  rol_id: number; organizacion_id: number | null; correo: string; password: string;
  activo: boolean; ultimo_acceso: Date | null;
}
export interface Participante extends Registro {
  usuario_id: number | null; nombres: string; apellidos: string; dni: string;
  telefono: string | null; direccion: string | null;
}
export interface Actividad extends Registro {
  organizacion_id: number; tipo_actividad_id: number; titulo: string; descripcion: string | null;
  instructor_nombres: string | null; instructor_apellidos: string | null; instructor_profesion: string | null;
  capacidad: number | null; estado: EstadoActividad; inscripciones_abiertas: boolean;
  token_inscripcion: string | null; creado_por: number;
}
export interface Sesion extends Registro {
  actividad_formativa_id: number; fecha: Date; hora_inicio: Date; hora_fin: Date; modalidad: Modalidad;
  lugar: string | null; enlace_virtual: string | null; qr_token: string | null;
  qr_desde: Date | null; qr_hasta: Date | null; estado: EstadoSesion;
}
export interface Inscripcion extends Registro {
  actividad_formativa_id: number; participante_id: number; estado: EstadoInscripcion;
  fecha_inscripcion: Date; fecha_cancelacion: Date | null;
}
export type NuevaOrganizacion = Pick<Organizacion, "nombre" | "ruc" | "direccion" | "telefono" | "correo" | "logo_url" | "activo">;
export type NuevoUsuario = Pick<Usuario, "correo" | "password" | "rol_id" | "organizacion_id" | "activo">;
export type NuevaActividad = Omit<Actividad, keyof Registro>;
export type NuevaSesion = Pick<Sesion, "actividad_formativa_id" | "fecha" | "hora_inicio" | "hora_fin" | "modalidad" | "lugar" | "enlace_virtual" | "estado">;
export type NuevoParticipante = Pick<Participante, "nombres" | "apellidos" | "dni" | "telefono" | "direccion">;
