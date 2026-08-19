/**
 * Compresión de fotografías en el navegador, antes de subirlas.
 *
 * Las fotos salen del teléfono con varios megabytes y el plan gratuito de
 * almacenamiento tiene cuota, así que se reducen aquí: sube menos, se sube más
 * rápido con la señal del mercado y la cuota rinde mucho más. La imagen sigue
 * siendo suficiente para documentar una evidencia.
 */
const LADO_MAXIMO = 1600;
const CALIDAD = 0.82;

export async function comprimirImagen(
  archivo: File,
  opciones: { ladoMaximo?: number; calidad?: number } = {},
): Promise<Blob> {
  const ladoMaximo = opciones.ladoMaximo ?? LADO_MAXIMO;
  const calidad = opciones.calidad ?? CALIDAD;

  // Un PDF de respaldo no se toca; solo se comprimen imágenes.
  if (!archivo.type.startsWith('image/')) return archivo;

  const mapa = await cargarImagen(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(mapa.width, mapa.height));

  // Si ya es pequeña, recomprimir solo empeoraría la calidad sin ganar nada.
  if (escala === 1 && archivo.size < 600_000) return archivo;

  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);

  const contexto = lienzo.getContext('2d');
  if (!contexto) return archivo;
  contexto.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);

  const comprimida = await new Promise<Blob | null>((resolver) => {
    lienzo.toBlob(resolver, 'image/jpeg', calidad);
  });

  // Si comprimir no ayudó, se manda el original.
  return comprimida && comprimida.size < archivo.size ? comprimida : archivo;
}

async function cargarImagen(archivo: File): Promise<HTMLImageElement | ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(archivo);
  }
  const url = URL.createObjectURL(archivo);
  try {
    return await new Promise<HTMLImageElement>((resolver, rechazar) => {
      const imagen = new Image();
      imagen.onload = () => resolver(imagen);
      imagen.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
      imagen.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tamaño legible, para poder avisar cuando un archivo es demasiado grande. */
export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
