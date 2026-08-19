import type {
  Equipo,
  EstadoMantenimiento,
  Evidencia,
  Mantenimiento,
  Paginado,
  TipoMantenimiento,
} from '@/types/dominio';
import { api } from '../api';

export interface NuevoEquipo {
  puestoId?: string;
  /** Opcional: si no se envía, el servidor asigna `EQ-P{puesto}-{correlativo}`. */
  codigo?: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacion?: string;
  estado?: string;
  ultimoMantenimiento?: string;
  tipoUltimoMantenimiento?: TipoMantenimiento;
  proximoMantenimiento?: string;
  observaciones?: string;
  foto?: Evidencia;
  documento?: Evidencia;
}

export type CambiosEquipo = { id: string } & Partial<Omit<NuevoEquipo, 'puestoId' | 'codigo'>> & {
    activo?: boolean;
  };

export interface NuevoMantenimiento {
  equipoId: string;
  fecha: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  tecnico?: string;
  documentos?: Evidencia[];
  fotos?: Evidencia[];
  proximoMantenimiento?: string;
  noConformidadId?: string;
  observaciones?: string;
}

/**
 * Inventario de equipos y su mantenimiento.
 *
 * El estado (`realizado`, `proximo`, `vencido`) lo calcula el servidor a partir
 * de la fecha del próximo mantenimiento, así que al registrar uno hay que
 * volver a pedir la lista para que las alertas queden al día.
 */
export const equiposApi = api.injectEndpoints({
  endpoints: (build) => ({
    equipos: build.query<
      Equipo[],
      { puestoId?: string; estado?: EstadoMantenimiento; activo?: boolean } | void
    >({
      query: (parametros) => ({ url: '/equipos', params: parametros ?? undefined }),
      providesTags: ['Equipo'],
    }),

    equipo: build.query<Equipo, string>({
      query: (id) => `/equipos/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'Equipo', id }],
    }),

    crearEquipo: build.mutation<Equipo, NuevoEquipo>({
      query: (datos) => ({ url: '/equipos', method: 'POST', body: datos }),
      invalidatesTags: ['Equipo', 'Dashboard'],
    }),

    actualizarEquipo: build.mutation<Equipo, CambiosEquipo>({
      query: ({ id, ...cambios }) => ({ url: `/equipos/${id}`, method: 'PATCH', body: cambios }),
      invalidatesTags: ['Equipo', 'Dashboard'],
    }),

    registrarMantenimiento: build.mutation<Mantenimiento, NuevoMantenimiento>({
      query: ({ equipoId, ...datos }) => ({
        url: `/equipos/${equipoId}/mantenimientos`,
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['Mantenimiento', 'Equipo', 'Dashboard', 'Notificacion'],
    }),

    /** Base general de mantenimientos de todos los puestos. */
    mantenimientos: build.query<
      Paginado<Mantenimiento>,
      {
        puestoId?: string;
        equipoId?: string;
        tipo?: TipoMantenimiento;
        desde?: string;
        hasta?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (filtros) => ({ url: '/mantenimientos', params: filtros ?? undefined }),
      providesTags: ['Mantenimiento'],
    }),
  }),
});

export const {
  useEquiposQuery,
  useEquipoQuery,
  useCrearEquipoMutation,
  useActualizarEquipoMutation,
  useRegistrarMantenimientoMutation,
  useMantenimientosQuery,
} = equiposApi;
