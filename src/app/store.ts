import { combineReducers, configureStore, type Middleware } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authReducer } from '@/features/auth/authSlice';
import { colaReducer } from '@/features/conexion/colaSlice';
import { api } from '@/services/api';
import { listenerMiddleware } from './listeners';

// Los endpoints se registran por su efecto secundario: al importarlos aquí
// quedan inyectados en `api` antes de que cualquier pantalla los use.
import '@/services/endpoints/auth';
import '@/services/endpoints/catalogos';
import '@/services/endpoints/registros';
import '@/services/endpoints/equipos';
import '@/services/endpoints/supervision';
import '@/services/endpoints/gestion';
import '@/services/endpoints/archivos';

export const rootReducer = combineReducers({
  auth: authReducer,
  cola: colaReducer,
  [api.reducerPath]: api.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * La tienda se crea con una función para poder levantar una limpia en cada
 * prueba, con el estado inicial que haga falta.
 */
export function crearStore(estadoPrecargado?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: estadoPrecargado,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // La cola guarda el cuerpo tal cual se iba a enviar; puede contener
          // objetos que no son literales planos.
          ignoredActions: ['cola/encolado'],
          ignoredPaths: ['cola.pendientes'],
        },
      })
        .prepend(listenerMiddleware.middleware)
        .concat(api.middleware as Middleware),
    devTools: import.meta.env.DEV,
  });

  // Habilita `refetchOnFocus` y `refetchOnReconnect`.
  setupListeners(store.dispatch);

  return store;
}

export const store = crearStore();

export type AppStore = ReturnType<typeof crearStore>;
export type AppDispatch = AppStore['dispatch'];
