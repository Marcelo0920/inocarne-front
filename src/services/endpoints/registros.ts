import type {
  CondicionesOrganolepticas,
  Control,
  DiaDeControles,
  DiaDeLimpieza,
  Evidencia,
  ItemChecklist,
  Limpieza,
  Paginado,
  Recepcion,
  ResultadoRecepcion,
  TipoCarne,
  TipoControl,
  TurnoLimpieza,
} from '@/types/dominio';
import { api } from '../api';

export interface FiltrosHistorial {
  puestoId?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export interface NuevaRecepcion {
  puestoId?: string;
  proveedor: string;
  tipoCarne: TipoCarne;
  cantidad: number;
  unidad?: string;
  temperatura: number;
  ph: number;
  organolepticas: CondicionesOrganolepticas;
  resultado: ResultadoRecepcion;
  motivoRechazo?: string;
  firma: Evidencia;
  fotos?: Evidencia[];
  observaciones?: string;
}

export interface NuevoControl {
  puestoId?: string;
  tipo: TipoControl;
  franjaProgramada: string;
  temperatura: number;
  ph?: number;
  tipoCarne?: TipoCarne;
  observaciones?: string;
}

export interface NuevaLimpieza {
  puestoId?: string;
  turno: TurnoLimpieza;
  items: ItemChecklist[];
  observaciones?: string;
  fotos?: Evidencia[];
}

/**
 * Registros diarios del puesto: recepción, controles horarios y limpieza.
 *
 * Ninguna de estas operaciones envía la fecha ni la hora: las pone el servidor.
 * Tras cada registro se invalida el día correspondiente y el panel del
 * supervisor, que son las vistas que muestran el estado de cumplimiento.
 */
export const registrosApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Recepción de carne ──────────────────────────────────
    registrarRecepcion: build.mutation<Recepcion, NuevaRecepcion>({
      query: (datos) => ({ url: '/recepciones', method: 'POST', body: datos }),
      invalidatesTags: ['Recepcion', 'Dashboard', 'Notificacion'],
    }),

    recepciones: build.query<
      Paginado<Recepcion>,
      FiltrosHistorial & { resultado?: ResultadoRecepcion }
    >({
      query: (filtros) => ({ url: '/recepciones', params: filtros }),
      providesTags: ['Recepcion'],
    }),

    recepcion: build.query<Recepcion, string>({
      query: (id) => `/recepciones/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'Recepcion', id }],
    }),

    // ── Controles horarios ──────────────────────────────────
    registrarControl: build.mutation<Control, NuevoControl>({
      query: (datos) => ({ url: '/controles', method: 'POST', body: datos }),
      invalidatesTags: ['Control', 'DiaControles', 'Dashboard'],
    }),

    /** Estado de las franjas del día: la pantalla de inicio del vendedor. */
    diaDeControles: build.query<DiaDeControles, { puestoId?: string; dia?: string } | void>({
      query: (parametros) => ({ url: '/controles/dia', params: parametros ?? undefined }),
      providesTags: ['DiaControles'],
      // Es la vista que decide si un control sigue a tiempo: no debe quedar vieja.
      keepUnusedDataFor: 30,
    }),

    controles: build.query<
      Paginado<Control>,
      FiltrosHistorial & {
        tipo?: TipoControl;
        cumplimiento?: 'a_tiempo' | 'con_retraso';
        dentroRango?: boolean;
      }
    >({
      query: (filtros) => ({ url: '/controles', params: filtros }),
      providesTags: ['Control'],
    }),

    // ── Limpieza y desinfección ─────────────────────────────
    registrarLimpieza: build.mutation<Limpieza, NuevaLimpieza>({
      query: (datos) => ({ url: '/limpiezas', method: 'POST', body: datos }),
      invalidatesTags: ['Limpieza', 'DiaLimpieza', 'Dashboard', 'Notificacion'],
    }),

    /** Puntos que debe contener el checklist, según la configuración vigente. */
    plantillaLimpieza: build.query<{ puntos: string[] }, void>({
      query: () => '/limpiezas/plantilla',
      providesTags: ['Configuracion'],
      keepUnusedDataFor: 3600,
    }),

    diaDeLimpieza: build.query<DiaDeLimpieza, { puestoId?: string; dia?: string } | void>({
      query: (parametros) => ({ url: '/limpiezas/dia', params: parametros ?? undefined }),
      providesTags: ['DiaLimpieza'],
      keepUnusedDataFor: 30,
    }),

    limpiezas: build.query<
      Paginado<Limpieza>,
      FiltrosHistorial & { turno?: TurnoLimpieza; cumple?: boolean }
    >({
      query: (filtros) => ({ url: '/limpiezas', params: filtros }),
      providesTags: ['Limpieza'],
    }),
  }),
});

export const {
  useRegistrarRecepcionMutation,
  useRecepcionesQuery,
  useRecepcionQuery,
  useRegistrarControlMutation,
  useDiaDeControlesQuery,
  useControlesQuery,
  useRegistrarLimpiezaMutation,
  usePlantillaLimpiezaQuery,
  useDiaDeLimpiezaQuery,
  useLimpiezasQuery,
} = registrosApi;
