import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { sesionCerrada } from '@/features/auth/authSlice';
import type { ErrorApi } from '@/types/dominio';
import { BASE_API_URL } from './urlApi';

const consultaBase = fetchBaseQuery({
  baseUrl: BASE_API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { token: string | null } }).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/** Error ya listo para mostrar en pantalla. */
export interface ErrorConsulta {
  status: number | 'OFFLINE' | 'DESCONOCIDO';
  codigo: string;
  mensaje: string;
  /** Errores por campo, para señalar el campo del formulario que falló. */
  detalle?: Record<string, string>;
}

function esErrorApi(valor: unknown): valor is { error: ErrorApi } {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    'error' in valor &&
    typeof (valor as { error: unknown }).error === 'object'
  );
}

/**
 * Traduce cualquier fallo a un mensaje que el vendedor pueda entender.
 * La API ya responde en español; aquí se cubren los casos en los que ni
 * siquiera se llegó a hablar con ella.
 */
export function normalizarError(error: FetchBaseQueryError): ErrorConsulta {
  if (error.status === 'FETCH_ERROR') {
    return {
      status: 'OFFLINE',
      codigo: 'SIN_CONEXION',
      mensaje:
        'No se pudo conectar con el servidor. Verifique su conexión; el registro se guardará ' +
        'y se enviará automáticamente al recuperarla.',
    };
  }

  if (error.status === 'TIMEOUT_ERROR') {
    return {
      status: 'OFFLINE',
      codigo: 'TIEMPO_AGOTADO',
      mensaje: 'El servidor tardó demasiado en responder. Intente nuevamente en un momento.',
    };
  }

  if (error.status === 'PARSING_ERROR' || error.status === 'CUSTOM_ERROR') {
    return {
      status: 'DESCONOCIDO',
      codigo: 'RESPUESTA_INVALIDA',
      mensaje: 'La respuesta del servidor no pudo interpretarse.',
    };
  }

  const cuerpo = error.data;
  if (esErrorApi(cuerpo)) {
    const detalle = cuerpo.error.detalle;
    const esDetallePorCampo =
      detalle !== undefined && Object.values(detalle).every((valor) => typeof valor === 'string');

    return {
      status: error.status,
      codigo: cuerpo.error.codigo,
      mensaje: cuerpo.error.mensaje,
      ...(esDetallePorCampo ? { detalle: detalle as Record<string, string> } : {}),
    };
  }

  // El servidor del plan gratuito puede tardar en despertar y devolver 502/503.
  if (error.status === 502 || error.status === 503 || error.status === 504) {
    return {
      status: error.status,
      codigo: 'SERVIDOR_NO_DISPONIBLE',
      mensaje:
        'El servidor está iniciándose. La primera conexión del día puede demorar cerca de ' +
        'un minuto; vuelva a intentarlo.',
    };
  }

  return {
    status: error.status,
    codigo: 'ERROR',
    mensaje: 'Ocurrió un error inesperado. Intente nuevamente.',
  };
}

/**
 * Envoltura de la consulta base que cierra la sesión cuando el token deja de
 * ser válido: así el usuario vuelve al ingreso en lugar de quedarse en una
 * pantalla que ya no puede cargar nada.
 */
export const consultaConSesion: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, opciones) => {
  const resultado = await consultaBase(args, api, opciones);

  if (resultado.error?.status === 401) {
    const yaEstabaFuera = !(api.getState() as { auth: { token: string | null } }).auth.token;
    if (!yaEstabaFuera) {
      api.dispatch(sesionCerrada('La sesión expiró. Vuelva a ingresar.'));
    }
  }

  return resultado;
};
