import type {
  Capacitacion,
  ControlPlagas,
  EstadoCapacitacion,
  EstadoPlaga,
  Evidencia,
  Notificacion,
  Paginado,
  Participante,
  ResumenReporte,
} from '@/types/dominio';
import { api } from '../api';

export interface NuevaCapacitacion {
  tema: string;
  fechaProgramada: string;
  hora: string;
  lugar?: string;
  capacitador?: string;
  /** Sin lista de puestos se convoca a todos los activos. */
  puestos?: string[];
  participantes?: Participante[];
  observaciones?: string;
}

export interface CambiosCapacitacion {
  id: string;
  tema?: string;
  fechaProgramada?: string;
  hora?: string;
  lugar?: string;
  capacitador?: string;
  puestos?: string[];
  estado?: EstadoCapacitacion;
  evidencia?: Evidencia[];
  observaciones?: string;
}

export interface AsistenciaCapacitacion {
  id: string;
  participantes: Participante[];
  fechaRealizada?: string;
  evidencia?: Evidencia[];
  observaciones?: string;
}

export interface NuevaActividadPlagas {
  fechaProgramada: string;
  hora: string;
  tipoActividad?: string;
  empresa?: string;
  areas?: string[];
  puestos?: string[];
  todosLosPuestos?: boolean;
  observaciones?: string;
}

/** Al programar la actividad el servidor deja creados los avisos con antelación. */
export interface ResultadoActividadPlagas {
  actividad: ControlPlagas;
  avisosProgramados: number;
}

export const gestionApi = api.injectEndpoints({
  endpoints: (build) => ({
    // ── Capacitaciones ──────────────────────────────────────
    capacitaciones: build.query<
      Paginado<Capacitacion>,
      { estado?: EstadoCapacitacion; puestoId?: string; page?: number; limit?: number } | void
    >({
      query: (filtros) => ({ url: '/capacitaciones', params: filtros ?? undefined }),
      providesTags: ['Capacitacion'],
    }),

    capacitacion: build.query<Capacitacion, string>({
      query: (id) => `/capacitaciones/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'Capacitacion', id }],
    }),

    crearCapacitacion: build.mutation<Capacitacion, NuevaCapacitacion>({
      query: (datos) => ({ url: '/capacitaciones', method: 'POST', body: datos }),
      // Convocar avisa a cada puesto participante.
      invalidatesTags: ['Capacitacion', 'Notificacion'],
    }),

    actualizarCapacitacion: build.mutation<Capacitacion, CambiosCapacitacion>({
      query: ({ id, ...cambios }) => ({
        url: `/capacitaciones/${id}`,
        method: 'PATCH',
        body: cambios,
      }),
      invalidatesTags: ['Capacitacion', 'Notificacion'],
    }),

    registrarAsistencia: build.mutation<Capacitacion, AsistenciaCapacitacion>({
      query: ({ id, ...datos }) => ({
        url: `/capacitaciones/${id}/asistencia`,
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['Capacitacion'],
    }),

    // ── Control de plagas ───────────────────────────────────
    controlPlagas: build.query<
      Paginado<ControlPlagas>,
      { estado?: EstadoPlaga; puestoId?: string; page?: number; limit?: number } | void
    >({
      query: (filtros) => ({ url: '/control-plagas', params: filtros ?? undefined }),
      providesTags: ['ControlPlagas'],
    }),

    actividadPlagas: build.query<ControlPlagas, string>({
      query: (id) => `/control-plagas/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'ControlPlagas', id }],
    }),

    crearActividadPlagas: build.mutation<ResultadoActividadPlagas, NuevaActividadPlagas>({
      query: (datos) => ({ url: '/control-plagas', method: 'POST', body: datos }),
      invalidatesTags: ['ControlPlagas', 'Notificacion'],
    }),

    actualizarActividadPlagas: build.mutation<
      ControlPlagas,
      { id: string } & Partial<NuevaActividadPlagas>
    >({
      query: ({ id, ...cambios }) => ({
        url: `/control-plagas/${id}`,
        method: 'PATCH',
        body: cambios,
      }),
      invalidatesTags: ['ControlPlagas', 'Notificacion'],
    }),

    registrarPlagasRealizada: build.mutation<
      ControlPlagas,
      { id: string; fechaRealizada?: string; evidencia?: Evidencia[]; observaciones?: string }
    >({
      query: ({ id, ...datos }) => ({
        url: `/control-plagas/${id}/realizada`,
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['ControlPlagas'],
    }),

    // ── Notificaciones ──────────────────────────────────────
    notificaciones: build.query<
      Paginado<Notificacion>,
      { soloNoLeidas?: boolean; page?: number; limit?: number } | void
    >({
      query: (filtros) => ({ url: '/notificaciones', params: filtros ?? undefined }),
      providesTags: ['Notificacion'],
    }),

    /** Contador del indicador de avisos sin leer. */
    notificacionesSinLeer: build.query<{ total: number }, void>({
      query: () => '/notificaciones/sin-leer',
      providesTags: ['Notificacion'],
      keepUnusedDataFor: 60,
    }),

    marcarNotificacionLeida: build.mutation<Notificacion, string>({
      query: (id) => ({ url: `/notificaciones/${id}/leida`, method: 'POST' }),
      invalidatesTags: ['Notificacion'],
    }),

    marcarTodasLeidas: build.mutation<{ actualizadas: number }, void>({
      query: () => ({ url: '/notificaciones/leer-todas', method: 'POST' }),
      invalidatesTags: ['Notificacion'],
    }),

    // ── Reportes ────────────────────────────────────────────
    resumenReporte: build.query<
      ResumenReporte,
      { desde: string; hasta: string; puestoId?: string }
    >({
      query: (rango) => ({ url: '/reportes/resumen', params: rango }),
      providesTags: ['Reporte'],
    }),
  }),
});

export const {
  useCapacitacionesQuery,
  useCapacitacionQuery,
  useCrearCapacitacionMutation,
  useActualizarCapacitacionMutation,
  useRegistrarAsistenciaMutation,
  useControlPlagasQuery,
  useActividadPlagasQuery,
  useCrearActividadPlagasMutation,
  useActualizarActividadPlagasMutation,
  useRegistrarPlagasRealizadaMutation,
  useNotificacionesQuery,
  useNotificacionesSinLeerQuery,
  useMarcarNotificacionLeidaMutation,
  useMarcarTodasLeidasMutation,
  useResumenReporteQuery,
} = gestionApi;
