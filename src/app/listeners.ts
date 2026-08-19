import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { sesionCerrada } from '@/features/auth/authSlice';
import { colaVaciada, conexionCambiada, encolado } from '@/features/conexion/colaSlice';
import { enviarPendientes } from '@/features/conexion/colaThunks';
import type { AppDispatch, RootState } from './store';

/**
 * Efectos que no pertenecen a ninguna pantalla: reaccionan a lo que ocurre en
 * el estado, para que ningún componente tenga que acordarse de dispararlos.
 */
export const listenerMiddleware = createListenerMiddleware();

const escuchar = listenerMiddleware.startListening.withTypes<RootState, AppDispatch>();

/** Al recuperar la conexión se vacía la cola de registros pendientes. */
escuchar({
  actionCreator: conexionCambiada,
  effect: async (accion, api) => {
    if (!accion.payload) return;
    if (api.getState().cola.pendientes.length === 0) return;
    await api.dispatch(enviarPendientes());
  },
});

/** Si se encola algo estando en línea, se intenta enviarlo de inmediato. */
escuchar({
  actionCreator: encolado,
  effect: async (_accion, api) => {
    const estado = api.getState();
    if (!estado.cola.enLinea || estado.cola.enviando) return;
    // Un respiro antes de reintentar: lo habitual es que se haya encolado
    // justo porque la petición acaba de fallar.
    await api.delay(2000);
    await api.dispatch(enviarPendientes());
  },
});

/**
 * Al cerrar sesión se descarta la cola: los pendientes pertenecen al usuario
 * que los creó y no deben enviarse con el token de otro.
 */
escuchar({
  matcher: isAnyOf(sesionCerrada),
  effect: (_accion, api) => {
    if (api.getState().cola.pendientes.length > 0) {
      api.dispatch(colaVaciada());
    }
  },
});
