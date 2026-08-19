import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/services/api';
import { BASE_API_URL } from '@/services/urlApi';
import {
  enviado,
  envioIniciado,
  envioTerminado,
  intentoFallido,
  selectCola,
  type RegistroPendiente,
} from './colaSlice';

interface EstadoParcial {
  auth: { token: string | null };
  cola: { pendientes: RegistroPendiente[]; enviando: boolean; enLinea: boolean };
}

/** Etiquetas de caché que hay que invalidar según lo que se acaba de enviar. */
const ETIQUETAS_POR_TIPO = {
  recepcion: ['Recepcion', 'Dashboard'],
  control: ['Control', 'DiaControles', 'Dashboard'],
  limpieza: ['Limpieza', 'DiaLimpieza', 'Dashboard'],
  mantenimiento: ['Mantenimiento', 'Equipo', 'Dashboard'],
  inspeccion: ['Inspeccion', 'NoConformidad', 'Dashboard'],
} as const;

/**
 * Reintenta los registros pendientes, uno por uno y en orden de llegada.
 *
 * Se envían en serie a propósito: dos controles del mismo puesto y la misma
 * franja chocarían con el índice único del servidor, y en serie el segundo
 * recibe un 409 claro en lugar de una condición de carrera.
 */
export const enviarPendientes = createAsyncThunk<
  { enviados: number; fallidos: number },
  void,
  { state: EstadoParcial }
>('cola/enviarPendientes', async (_argumento, { getState, dispatch }) => {
  const estado = getState();
  const { pendientes, enviando, enLinea } = selectCola(estado);

  if (enviando || !enLinea || pendientes.length === 0) {
    return { enviados: 0, fallidos: 0 };
  }

  dispatch(envioIniciado());
  let enviados = 0;
  let fallidos = 0;

  try {
    for (const registro of pendientes) {
      try {
        const respuesta = await fetch(`${BASE_API_URL}${registro.url}`, {
          method: registro.metodo,
          headers: {
            'Content-Type': 'application/json',
            ...(estado.auth.token ? { Authorization: `Bearer ${estado.auth.token}` } : {}),
          },
          body: JSON.stringify(registro.cuerpo),
        });

        if (respuesta.ok) {
          dispatch(enviado(registro.id));
          enviados += 1;
          continue;
        }

        // Un 409 significa que el registro ya existía: el envío anterior sí
        // llegó, así que se da por cumplido en lugar de reintentarlo.
        if (respuesta.status === 409) {
          dispatch(enviado(registro.id));
          enviados += 1;
          continue;
        }

        const cuerpo = (await respuesta.json().catch(() => null)) as {
          error?: { mensaje?: string };
        } | null;

        // Los errores del servidor (5xx) merecen otro intento; los del cliente no.
        dispatch(
          intentoFallido({
            id: registro.id,
            error: cuerpo?.error?.mensaje ?? `El servidor respondió ${respuesta.status}.`,
            reintentable: respuesta.status >= 500,
          }),
        );
        fallidos += 1;
      } catch (error) {
        // Se cortó otra vez la conexión: el registro sigue en la cola.
        dispatch(
          intentoFallido({
            id: registro.id,
            error: error instanceof Error ? error.message : 'No hay conexión.',
            reintentable: true,
          }),
        );
        fallidos += 1;
        break;
      }
    }

    if (enviados > 0) {
      const tipos = new Set(pendientes.map((registro) => registro.tipo));
      const etiquetas = [...tipos].flatMap((tipo) => [...ETIQUETAS_POR_TIPO[tipo]]);
      dispatch(api.util.invalidateTags([...new Set(etiquetas)]));
    }

    return { enviados, fallidos };
  } finally {
    dispatch(envioTerminado());
  }
});
