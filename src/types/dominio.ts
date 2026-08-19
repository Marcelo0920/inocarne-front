/**
 * Tipos del dominio, en correspondencia con los del backend.
 * Se mantienen aquí a mano para que el frontend no dependa del código del
 * servidor; cualquier cambio en la API debe reflejarse en este archivo.
 */

export type Rol = 'puesto' | 'supervisor' | 'coordinador' | 'admin';

/** Roles que ven la información de todos los puestos. */
export const ROLES_SUPERVISION: readonly Rol[] = ['supervisor', 'coordinador', 'admin'];

export type TipoCarne = 'res' | 'cerdo' | 'cordero' | 'pollo';
export type ResultadoRecepcion = 'aceptado' | 'rechazado';
export type TipoControl = 'exhibicion' | 'refrigeracion';
export type TurnoLimpieza = 'inicial' | 'final';

/** Estado de cumplimiento de un control programado. */
export type EstadoControl = 'a_tiempo' | 'con_retraso' | 'pendiente' | 'no_realizado';

/** `gris` significa que todavía no corresponde realizar el control. */
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris';

export type TipoMantenimiento = 'preventivo' | 'correctivo';
export type EstadoMantenimiento = 'realizado' | 'proximo' | 'vencido';
export type EstadoAccion = 'pendiente' | 'en_proceso' | 'realizado' | 'plazo_vencido';
export type EstadoCapacitacion = 'programada' | 'realizada' | 'pendiente' | 'reprogramada';
export type EstadoPlaga = 'programada' | 'realizada' | 'vencida';
export type TipoInspeccion = 'mercado' | 'puesto';

export type TipoNotificacion =
  | 'control_plagas'
  | 'capacitacion'
  | 'control_pendiente'
  | 'mantenimiento'
  | 'accion_correctiva'
  | 'recepcion_rechazada'
  | 'general';

/** Archivo almacenado en Cloudinary: la aplicación solo maneja su referencia. */
export interface Evidencia {
  url: string;
  publicId: string;
  subidoEn?: string;
}

export interface ItemChecklist {
  nombre: string;
  cumple: boolean;
  comentario?: string;
}

export interface Puesto {
  id: string;
  numero: number;
  nombre: string;
  responsable?: string | null;
  activo: boolean;
}

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  puestoId: string | null;
  activo?: boolean;
  puesto?: { id: string; numero: number; nombre: string } | null;
}

export interface Rango {
  min: number;
  max: number;
}

/** Parámetros del sistema: rangos aceptados, horarios y plantillas de checklist. */
export interface Configuracion {
  temperaturaMaxima: number;
  rangoPhRojas: Rango;
  rangoPhPollo: Rango;
  horariosExhibicion: string[];
  horariosRefrigeracion: string[];
  toleranciaMinutos: number;
  diasAvisoPlagas: number[];
  diasAvisoMantenimiento: number;
  puntosLimpieza: string[];
  puntosInspeccionMercado: string[];
  puntosInspeccionPuesto: string[];
}

export interface CondicionesOrganolepticas {
  color: boolean;
  olor: boolean;
  textura: boolean;
  grasa: boolean;
}

export interface Recepcion {
  id: string;
  puestoId: string;
  usuarioId: string;
  registradoEn: string;
  dia: string;
  proveedor: string;
  tipoCarne: TipoCarne;
  cantidad: number;
  unidad: string;
  temperatura: number;
  ph: number;
  organolepticas: CondicionesOrganolepticas;
  resultado: ResultadoRecepcion;
  motivoRechazo?: string | null;
  firma?: Evidencia | null;
  fotos: Evidencia[];
  observaciones?: string | null;
  dentroRango: boolean;
  desviaciones: string[];
}

export interface Control {
  id: string;
  puestoId: string;
  usuarioId: string;
  tipo: TipoControl;
  franjaProgramada: string;
  dia: string;
  registradoEn: string;
  temperatura: number;
  ph?: number | null;
  tipoCarne?: TipoCarne | null;
  dentroRango: boolean;
  desviaciones: string[];
  cumplimiento: EstadoControl;
  observaciones?: string | null;
}

/** Una franja programada del día, con o sin registro. */
export interface EstadoFranja {
  tipo: TipoControl;
  franjaProgramada: string;
  estado: EstadoControl;
  semaforo: Semaforo;
  registro: Control | null;
}

export interface DiaDeControles {
  dia: string;
  franjas: EstadoFranja[];
}

export interface Limpieza {
  id: string;
  puestoId: string;
  usuarioId: string;
  turno: TurnoLimpieza;
  dia: string;
  registradoEn: string;
  items: ItemChecklist[];
  observaciones?: string | null;
  fotos: Evidencia[];
  cumple: boolean;
  incumplimientos: string[];
}

export interface EstadoTurno {
  turno: TurnoLimpieza;
  registrado: boolean;
  cumple: boolean | null;
  registro: Limpieza | null;
}

export interface DiaDeLimpieza {
  dia: string;
  turnos: EstadoTurno[];
}

export interface Equipo {
  id: string;
  puestoId: string;
  codigo: string;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  ubicacion?: string | null;
  estado: string;
  ultimoMantenimiento?: string | null;
  tipoUltimoMantenimiento?: TipoMantenimiento | null;
  proximoMantenimiento?: string | null;
  observaciones?: string | null;
  foto?: Evidencia | null;
  documento?: Evidencia | null;
  activo: boolean;
  estadoMantenimiento: EstadoMantenimiento;
}

export interface Mantenimiento {
  id: string;
  equipoId: string | { id: string; codigo: string; nombre: string };
  puestoId: string;
  usuarioId: string;
  registradoEn: string;
  fecha: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  tecnico?: string | null;
  documentos: Evidencia[];
  fotos: Evidencia[];
  proximoMantenimiento?: string | null;
  noConformidadId?: string | null;
  observaciones?: string | null;
}

export interface MedicionInspeccion {
  temperatura?: number | null;
  ph?: number | null;
  tipoCarne?: TipoCarne | null;
  dentroRango: boolean;
  desviaciones: string[];
}

export interface Inspeccion {
  id: string;
  tipo: TipoInspeccion;
  supervisorId: string;
  puestoId?: string | null;
  registradoEn: string;
  dia: string;
  items: ItemChecklist[];
  medicion?: MedicionInspeccion | null;
  observaciones?: string | null;
  fotos: Evidencia[];
  cumple: boolean;
  incumplimientos: string[];
}

export interface NoConformidad {
  id: string;
  numero: number;
  inspeccionId?: string | null;
  puestoId?: string | null;
  supervisorId: string;
  hallazgo: string;
  origen: string;
  detectadaEn: string;
  evidencia: Evidencia[];
  accionCorrectiva?: string | null;
  responsable?: string | null;
  fechaLimite?: string | null;
  estado: EstadoAccion;
  /** Estado real al momento de consultar: incluye el plazo vencido. */
  estadoActual: EstadoAccion;
  /** El responsable ya adjuntó la evidencia: falta que el supervisor verifique. */
  listaParaVerificar: boolean;
  evidenciaCierre: Evidencia[];
  verificadaPor?: string | null;
  verificadaEn?: string | null;
  comentarioCierre?: string | null;
  equipoId?: string | null;
}

export interface Participante {
  puestoId?: string | null;
  nombre: string;
  asistio: boolean;
}

export interface Capacitacion {
  id: string;
  tema: string;
  fechaProgramada: string;
  hora: string;
  lugar?: string | null;
  capacitador?: string | null;
  puestos: string[];
  participantes: Participante[];
  fechaRealizada?: string | null;
  estado: EstadoCapacitacion;
  evidencia: Evidencia[];
  observaciones?: string | null;
}

export interface ControlPlagas {
  id: string;
  fechaProgramada: string;
  hora: string;
  tipoActividad: string;
  empresa?: string | null;
  areas: string[];
  puestos: string[];
  todosLosPuestos: boolean;
  estado: EstadoPlaga;
  estadoActual: EstadoPlaga;
  fechaRealizada?: string | null;
  evidencia: Evidencia[];
  observaciones?: string | null;
}

export interface Notificacion {
  id: string;
  puestoId?: string | null;
  paraSupervision: boolean;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  referencia?: { coleccion: string; documentoId: string } | null;
  programadaPara: string;
  enviada: boolean;
  leida: boolean;
  leidaEn?: string | null;
}

export interface CeldaDashboard {
  clave: string;
  etiqueta: string;
  semaforo: Semaforo;
  estado: EstadoControl | 'registrado' | 'sin_registro';
  detalle: string | null;
}

export interface FilaDashboard {
  puestoId: string;
  numero: number;
  nombre: string;
  celdas: CeldaDashboard[];
  semaforo: Semaforo;
  problemas: string[];
}

export interface ResumenDashboard {
  puestos: number;
  conformes: number;
  conAtencion: number;
  conIncumplimiento: number;
  noConformidadesAbiertas: number;
  noConformidadesVencidas: number;
  mantenimientosVencidos: number;
}

export interface Dashboard {
  dia: string;
  columnas: { clave: string; etiqueta: string; grupo: string }[];
  filas: FilaDashboard[];
  resumen: ResumenDashboard;
}

export interface DetallePuesto {
  puesto: { id: string; numero: number; nombre: string };
  dia: string;
  celdas: CeldaDashboard[];
  problemas: string[];
  semaforo: Semaforo;
}

export interface ResumenReporte {
  desde: string;
  hasta: string;
  recepciones: number;
  controles: number;
  limpiezas: number;
  inspecciones: number;
  noConformidades: number;
  mantenimientos: number;
}

/** Forma de todos los listados paginados de la API. */
export interface Paginado<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Forma de todos los errores de la API. */
export interface ErrorApi {
  codigo: string;
  mensaje: string;
  detalle?: Record<string, string> | Record<string, unknown>;
}
