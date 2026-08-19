import { createApi } from '@reduxjs/toolkit/query/react';
import { consultaConSesion } from './baseQuery';

/**
 * Punto único de acceso a la API.
 *
 * Los endpoints se declaran por módulo en `src/services/endpoints/*` mediante
 * `injectEndpoints`, de modo que cada funcionalidad quede junta y este archivo
 * solo defina la configuración común.
 *
 * Las etiquetas describen los datos que se guardan en caché: cuando una
 * operación de escritura invalida una etiqueta, RTK Query vuelve a pedir las
 * consultas que dependen de ella. Por eso, al registrar un control, el panel
 * del supervisor y el estado del día se actualizan solos.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: consultaConSesion,
  tagTypes: [
    'Configuracion',
    'Puesto',
    'Usuario',
    'Perfil',
    'Recepcion',
    'Control',
    'DiaControles',
    'Limpieza',
    'DiaLimpieza',
    'Equipo',
    'Mantenimiento',
    'Inspeccion',
    'NoConformidad',
    'Capacitacion',
    'ControlPlagas',
    'Notificacion',
    'Dashboard',
    'Reporte',
  ],
  // El vendedor deja el teléfono en el mostrador y vuelve: al reenfocar la
  // aplicación conviene refrescar, pero sin castigar una conexión lenta.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 120,
  endpoints: () => ({}),
});
