/**
 * Dirección base de la API.
 *
 * `VITE_API_URL` se resuelve al compilar, no al abrir la página, y una
 * compilación que sale sin ella deja la aplicación pidiéndole la API a su
 * propio dominio —donde no hay ninguna—. Por eso la dirección del servidor
 * desplegado vive acá como respaldo: la variable sigue mandando cuando está,
 * pero ya no hace falta que esté.
 */
const API_DESPLEGADA = 'https://inocarne.onrender.com';

type Origen = 'variable de compilación' | 'respaldo del código' | 'mismo dominio';

function resolver(): { base: string; origen: Origen } {
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) {
    return { base: `${configurada.replace(/\/$/, '')}/api`, origen: 'variable de compilación' };
  }

  // Compilado para publicar: la API está en otro servidor.
  if (import.meta.env.PROD) {
    return { base: `${API_DESPLEGADA}/api`, origen: 'respaldo del código' };
  }

  // Desarrollo: Vite redirige /api al backend local.
  const origenDeLaPagina = typeof window === 'undefined' ? '' : window.location.origin;
  return { base: `${origenDeLaPagina}/api`, origen: 'mismo dominio' };
}

const resuelta = resolver();

export const BASE_API_URL = resuelta.base;

/** De dónde salió la dirección, para poder verlo desde el navegador. */
export const diagnosticoApi = {
  direccionUsada: BASE_API_URL,
  vieneDe: resuelta.origen,
  variableDeCompilacion: import.meta.env.VITE_API_URL || '(vacía o sin definir)',
  modo: import.meta.env.MODE,
  origenDeLaPagina: typeof window === 'undefined' ? '(sin navegador)' : window.location.origin,
};

if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console -- rastro de diagnóstico del despliegue
  console.info(`[INOCARNE] API → ${BASE_API_URL}  (${resuelta.origen})`, diagnosticoApi);
}
