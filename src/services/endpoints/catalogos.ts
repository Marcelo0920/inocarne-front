import type { Configuracion, Puesto, Usuario, Rol } from '@/types/dominio';
import { api } from '../api';

export interface NuevoPuesto {
  numero: number;
  nombre: string;
  responsable?: string;
}

export interface CambiosPuesto {
  id: string;
  nombre?: string;
  responsable?: string | null;
  activo?: boolean;
}

export interface NuevoUsuario {
  nombre: string;
  usuario: string;
  password: string;
  rol: Rol;
  puestoId?: string | null;
}

export interface CambiosUsuario {
  id: string;
  nombre?: string;
  rol?: Rol;
  puestoId?: string | null;
  activo?: boolean;
}

/**
 * Configuración, puestos y usuarios: los datos que casi no cambian y que el
 * resto de las pantallas da por sentados (rangos aceptados, horarios, lista de
 * puestos). Se consultan una vez y quedan en caché.
 */
export const catalogosApi = api.injectEndpoints({
  endpoints: (build) => ({
    configuracion: build.query<Configuracion, void>({
      query: () => '/configuracion',
      providesTags: ['Configuracion'],
      // Los rangos y horarios rara vez cambian: conviene no volver a pedirlos.
      keepUnusedDataFor: 3600,
    }),

    actualizarConfiguracion: build.mutation<Configuracion, Partial<Configuracion>>({
      query: (cambios) => ({ url: '/configuracion', method: 'PATCH', body: cambios }),
      // Cambiar horarios o tolerancia altera todos los estados calculados.
      invalidatesTags: ['Configuracion', 'Dashboard', 'DiaControles', 'Control'],
    }),

    puestos: build.query<Puesto[], { activo?: boolean } | void>({
      query: (parametros) => ({
        url: '/puestos',
        params:
          parametros && parametros.activo !== undefined ? { activo: parametros.activo } : undefined,
      }),
      providesTags: ['Puesto'],
    }),

    puesto: build.query<Puesto, string>({
      query: (id) => `/puestos/${id}`,
      providesTags: (_resultado, _error, id) => [{ type: 'Puesto', id }],
    }),

    crearPuesto: build.mutation<Puesto, NuevoPuesto>({
      query: (datos) => ({ url: '/puestos', method: 'POST', body: datos }),
      invalidatesTags: ['Puesto', 'Dashboard'],
    }),

    actualizarPuesto: build.mutation<Puesto, CambiosPuesto>({
      query: ({ id, ...cambios }) => ({ url: `/puestos/${id}`, method: 'PATCH', body: cambios }),
      invalidatesTags: ['Puesto', 'Dashboard'],
    }),

    usuarios: build.query<Usuario[], { rol?: Rol; puestoId?: string; activo?: boolean } | void>({
      query: (parametros) => ({ url: '/usuarios', params: parametros ?? undefined }),
      providesTags: ['Usuario'],
    }),

    crearUsuario: build.mutation<Usuario, NuevoUsuario>({
      query: (datos) => ({ url: '/usuarios', method: 'POST', body: datos }),
      invalidatesTags: ['Usuario'],
    }),

    actualizarUsuario: build.mutation<Usuario, CambiosUsuario>({
      query: ({ id, ...cambios }) => ({ url: `/usuarios/${id}`, method: 'PATCH', body: cambios }),
      invalidatesTags: ['Usuario'],
    }),

    restablecerPassword: build.mutation<{ mensaje: string }, { id: string; password: string }>({
      query: ({ id, password }) => ({
        url: `/usuarios/${id}/restablecer-password`,
        method: 'POST',
        body: { password },
      }),
    }),
  }),
});

export const {
  useConfiguracionQuery,
  useActualizarConfiguracionMutation,
  usePuestosQuery,
  usePuestoQuery,
  useCrearPuestoMutation,
  useActualizarPuestoMutation,
  useUsuariosQuery,
  useCrearUsuarioMutation,
  useActualizarUsuarioMutation,
  useRestablecerPasswordMutation,
} = catalogosApi;
