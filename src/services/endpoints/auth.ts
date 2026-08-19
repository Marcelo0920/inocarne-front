import { sesionCerrada, sesionIniciada, perfilActualizado } from '@/features/auth/authSlice';
import type { Usuario } from '@/types/dominio';
import { api } from '../api';

export interface CredencialesLogin {
  usuario: string;
  password: string;
}

export interface RespuestaLogin {
  token: string;
  usuario: Usuario;
}

export interface CambioPassword {
  passwordActual: string;
  passwordNueva: string;
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<RespuestaLogin, CredencialesLogin>({
      query: (credenciales) => ({ url: '/auth/login', method: 'POST', body: credenciales }),
      // La sesión se guarda en cuanto el servidor la concede, para que el
      // resto de las peticiones ya salgan con el token.
      onQueryStarted: async (_credenciales, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(sesionIniciada(data));
        } catch {
          // Credenciales incorrectas: el componente ya recibe el error por el
          // hook. Aquí solo hay que evitar que el rechazo quede sin atender.
        }
      },
      invalidatesTags: ['Perfil'],
    }),

    perfil: build.query<Usuario, void>({
      query: () => '/auth/yo',
      providesTags: ['Perfil'],
      // El perfil manda sobre lo guardado en el navegador: si el administrador
      // cambió el rol o el puesto, la aplicación lo refleja al abrirse.
      onQueryStarted: async (_argumento, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(perfilActualizado(data));
        } catch {
          // Un 401 ya cierra la sesión en la consulta base.
        }
      },
    }),

    cambiarPassword: build.mutation<{ mensaje: string }, CambioPassword>({
      query: (datos) => ({ url: '/auth/cambiar-password', method: 'POST', body: datos }),
    }),
  }),
});

export const { useLoginMutation, usePerfilQuery, useCambiarPasswordMutation } = authApi;

/** Cierre de sesión voluntario: limpia el estado y toda la caché de la API. */
export const cerrarSesion = () => (dispatch: (accion: unknown) => void) => {
  dispatch(sesionCerrada());
  dispatch(api.util.resetApiState());
};
