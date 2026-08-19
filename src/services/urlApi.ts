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

/**
 * De dónde salió esa dirección.
 *
 * `VITE_API_URL` se resuelve al compilar, no al abrir la página: si la carpeta
 * publicada se compiló sin esa variable, la aplicación termina pidiéndole la
 * API a su propio dominio y no hay forma de notarlo mirando la pantalla. Esto
 * lo deja escrito en la consola del navegador.
 */
export const diagnosticoApi = {
  variableDeCompilacion: import.meta.env.VITE_API_URL || '(vacía o sin definir)',
  modo: import.meta.env.MODE,
  compiladoParaProduccion: import.meta.env.PROD,
  origenDeLaPagina: typeof window === 'undefined' ? '(sin navegador)' : window.location.origin,
  direccionUsada: BASE_API_URL,
  esDelMismoDominio: !import.meta.env.VITE_API_URL,
};

if (typeof window !== 'undefined') {
  const marca = diagnosticoApi.esDelMismoDominio ? '⚠️ MISMO DOMINIO' : '✓ API externa';
  // eslint-disable-next-line no-console -- rastro de diagnóstico del despliegue
  console.info(`[INOCARNE] API → ${BASE_API_URL}  (${marca})`, diagnosticoApi);
  if (diagnosticoApi.esDelMismoDominio && diagnosticoApi.compiladoParaProduccion) {
    console.warn(
      '[INOCARNE] Esta compilación no lleva VITE_API_URL: las peticiones van al dominio de ' +
        'la propia página. Hay que volver a compilar con el .env.production y publicar esa carpeta.',
    );
  }
}
