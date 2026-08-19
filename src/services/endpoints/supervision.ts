import type {
  Dashboard,
  DetallePuesto,
  EstadoAccion,
  Evidencia,
  Inspeccion,
  ItemChecklist,
  NoConformidad,
  Paginado,
  TipoCarne,
  TipoInspeccion,
} from '@/types/dominio';
import { api } from '../api';

export interface NuevaInspeccion {
  tipo: TipoInspeccion;
  puestoId?: string;
  items: ItemChecklist[];
  medicion?: { temperatura?: number; ph?: number; tipoCarne?: TipoCarne };
  observaciones?: string;
  fotos?: Evidencia[];
}

/** La inspección devuelve las no conformidades que generó automáticamente. */
export interface ResultadoInspeccion {
  inspeccion: Inspeccion;
  noConformidades: NoConformidad[];
}

export interface NuevaNoConformidad {
  puestoId?: string;
  equipoId?: string;
  hallazgo: string;
  origen?: string;
  evidencia?: Evidencia[];
  accionCorrectiva?: string;
  responsable?: string;
  fechaLimite?: string;
}

export interface CambiosNoConformidad {
  id: string;
  accionCorrectiva?: string;
  responsable?: string;
  fechaLimite?: string;
  estado?: 'pendiente' | 'en_proceso';
  evidenciaCierre?: Evidencia[];
}

export interface EvidenciaDeCierre {
  id: string;
  evidenciaCierre: Evidencia[];
  comentario?: string;
}

export interface CierreNoConformidad {
  id: string;
  comentarioCierre?: string;
  evidenciaCierre?: Evidencia[];
}

/**
 * Inspecciones, acciones correctivas y panel general.
 *
 * Una inspección con incumplimientos crea no conformidades por su cuenta, así
 * que invalida también esa lista y las notificaciones del puesto afectado.
 */
export const supervisionApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Panel general ───────────────────────────────────────
    dashboard: build.query<Dashboard, { dia?: string } | void>({
      query: (parametros) => ({ url: '/dashboard', params: parametros ?? undefined }),
      providesTags: ['Dashboard'],
      // El semáforo se calcula al consultar: conviene mantenerlo fresco.
      keepUnusedDataFor: 30,
    }),

    detallePuesto: build.query<DetallePuesto, { puestoId: string; dia?: string }>({
      query: ({ puestoId, dia }) => ({
        url: `/dashboard/puesto/${puestoId}`,
        params: dia ? { dia } : undefined,
      }),
      providesTags: ['Dashboard'],
    }),

    // ── Inspecciones ────────────────────────────────────────
    plantillasInspeccion: build.query<{ mercado: string[]; puesto: string[] }, void>({
      query: () => '/inspecciones/plantillas',
      providesTags: ['Configuracion'],
      keepUnusedDataFor: 3600,
    }),

    registrarInspeccion: build.mutation<ResultadoInspeccion, NuevaInspeccion>({
      query: (datos) => ({ url: '/inspecciones', method: 'POST', body: datos }),
      invalidatesTags: ['Inspeccion', 'NoConformidad', 'Dashboard', 'Notificacion'],
    }),

    inspecciones: build.query<
      Paginado<Inspeccion>,
      {
        tipo?: TipoInspeccion;
        puestoId?: string;
        desde?: string;
        hasta?: string;
        cumple?: boolean;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (filtros) => ({ url: '/inspecciones', params: filtros ?? undefined }),
      providesTags: ['Inspeccion'],
    }),

    inspeccion: build.query<{ inspeccion: Inspeccion; noConformidades: NoConformidad[] }, string>({
      query: (id) => `/inspecciones/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'Inspeccion', id }],
    }),

    // ── Acciones correctivas ────────────────────────────────
    crearNoConformidad: build.mutation<NoConformidad, NuevaNoConformidad>({
      query: (datos) => ({ url: '/no-conformidades', method: 'POST', body: datos }),
      invalidatesTags: ['NoConformidad', 'Dashboard'],
    }),

    noConformidades: build.query<
      Paginado<NoConformidad>,
      {
        puestoId?: string;
        estado?: EstadoAccion;
        vencidas?: boolean;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (filtros) => ({ url: '/no-conformidades', params: filtros ?? undefined }),
      providesTags: ['NoConformidad'],
    }),

    noConformidad: build.query<NoConformidad, string>({
      query: (id) => `/no-conformidades/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'NoConformidad', id }],
    }),

    actualizarNoConformidad: build.mutation<NoConformidad, CambiosNoConformidad>({
      query: ({ id, ...cambios }) => ({
        url: `/no-conformidades/${id}`,
        method: 'PATCH',
        body: cambios,
      }),
      invalidatesTags: ['NoConformidad', 'Dashboard', 'Notificacion'],
    }),

    /**
     * El responsable del puesto adjunta la prueba de que ejecutó la acción.
     * No cierra nada: deja la acción lista para que el supervisor la verifique.
     */
    adjuntarEvidenciaCierre: build.mutation<NoConformidad, EvidenciaDeCierre>({
      query: ({ id, ...datos }) => ({
        url: `/no-conformidades/${id}/evidencia-cierre`,
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['NoConformidad', 'Notificacion'],
    }),

    /** Verificación y cierre: el último paso de la cadena. */
    cerrarNoConformidad: build.mutation<NoConformidad, CierreNoConformidad>({
      query: ({ id, ...datos }) => ({
        url: `/no-conformidades/${id}/cerrar`,
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['NoConformidad', 'Dashboard'],
    }),
  }),
});

export const {
  useDashboardQuery,
  useDetallePuestoQuery,
  usePlantillasInspeccionQuery,
  useRegistrarInspeccionMutation,
  useInspeccionesQuery,
  useInspeccionQuery,
  useCrearNoConformidadMutation,
  useNoConformidadesQuery,
  useNoConformidadQuery,
  useActualizarNoConformidadMutation,
  useAdjuntarEvidenciaCierreMutation,
  useCerrarNoConformidadMutation,
} = supervisionApi;
