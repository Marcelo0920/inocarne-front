import type { NombreIcono } from '@/componentes/Icono';
import type { Paginado, Semaforo } from '@/types/dominio';
import { api } from '../api';

export type TipoHistorial =
  'recepcion' | 'exhibicion' | 'refrigeracion' | 'limpieza' | 'inspeccion' | 'mantenimiento';

/** Fila ya normalizada por la API: sirve igual para la lista del vendedor y la tabla del supervisor. */
export interface EntradaHistorial {
  id: string;
  tipo: TipoHistorial;
  titulo: string;
  puestoId: string | null;
  puestoNumero: number | null;
  puestoNombre: string | null;
  registradoEn: string;
  dia: string;
  hora: string;
  usuario: string;
  semaforo: Semaforo;
  estadoTexto: string;
  detalle: string | null;
}

/** Cada tipo de registro tiene su icono; el servidor solo manda el tipo. */
export const ICONO_POR_TIPO: Record<TipoHistorial, NombreIcono> = {
  recepcion: 'recepcion',
  exhibicion: 'exhibicion',
  refrigeracion: 'refrigeracion',
  limpieza: 'limpieza',
  inspeccion: 'inspeccion',
  mantenimiento: 'mantenimiento',
};

export interface FiltrosHistorialUnificado {
  puestoId?: string;
  tipo?: TipoHistorial;
  semaforo?: Semaforo;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export const historialApi = api.injectEndpoints({
  endpoints: (build) => ({
    historial: build.query<Paginado<EntradaHistorial>, FiltrosHistorialUnificado | void>({
      query: (filtros) => ({ url: '/historial', params: filtros ?? undefined }),
      // Cualquier registro nuevo cambia el historial, sea del tipo que sea.
      providesTags: ['Recepcion', 'Control', 'Limpieza', 'Inspeccion', 'Mantenimiento'],
    }),
  }),
});

export const { useHistorialQuery } = historialApi;
