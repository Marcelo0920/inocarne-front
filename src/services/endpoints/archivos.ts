import type { Evidencia } from '@/types/dominio';
import { api } from '../api';

/** Carpetas admitidas por la API, según el tipo de registro al que acompaña la evidencia. */
export type SubcarpetaArchivo =
  | 'recepciones'
  | 'limpiezas'
  | 'inspecciones'
  | 'equipos'
  | 'mantenimientos'
  | 'no-conformidades'
  | 'capacitaciones'
  | 'plagas'
  | 'firmas';

export interface SubidaArchivo {
  archivo: File | Blob;
  subcarpeta: SubcarpetaArchivo;
  /** Nombre con el que se envía; útil cuando se sube un Blob de la cámara o la firma. */
  nombre?: string;
}

/**
 * Subida de evidencias.
 *
 * La fotografía no viaja dentro del registro: primero se sube aquí, la API
 * devuelve `{ url, publicId }` y esa referencia es la que se adjunta al
 * registro. Así cada registro se crea con una sola petición JSON y la base de
 * datos nunca guarda imágenes.
 */
export const archivosApi = api.injectEndpoints({
  endpoints: (build) => ({
    subirArchivo: build.mutation<Evidencia, SubidaArchivo>({
      query: ({ archivo, subcarpeta, nombre }) => {
        const cuerpo = new FormData();
        cuerpo.append('archivo', archivo, nombre ?? 'evidencia.jpg');
        cuerpo.append('subcarpeta', subcarpeta);
        // Sin `Content-Type`: el navegador debe fijar el boundary del multipart.
        return { url: '/archivos', method: 'POST', body: cuerpo };
      },
    }),

    /** Permite saber si Cloudinary está configurado antes de ofrecer la cámara. */
    estadoArchivos: build.query<{ configurado: boolean }, void>({
      query: () => '/archivos/estado',
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useSubirArchivoMutation, useEstadoArchivosQuery } = archivosApi;
