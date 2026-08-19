/**
 * Dirección base de la API.
 *
 * En desarrollo `VITE_API_URL` va vacía y Vite redirige `/api` al backend, así
 * que basta con el mismo origen; en producción se apunta al servidor desplegado.
 * Se resuelve a una URL absoluta porque `fetch` fuera del navegador —las
 * pruebas— no admite rutas relativas.
 */
function calcularBase(): string {
  const configurada = import.meta.env.VITE_API_URL;
  if (configurada) return `${configurada.replace(/\/$/, '')}/api`;

  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origen}/api`;
}

export const BASE_API_URL = calcularBase();
