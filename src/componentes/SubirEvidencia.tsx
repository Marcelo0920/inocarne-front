import { useRef, useState } from 'react';
import type { Evidencia } from '@/types/dominio';
import {
  useEstadoArchivosQuery,
  useSubirArchivoMutation,
  type SubcarpetaArchivo,
} from '@/services/endpoints/archivos';
import { normalizarError } from '@/services/baseQuery';
import { comprimirImagen } from '@/utils/imagen';
import { Icono } from './Icono';
import { Mensaje } from './Mensaje';
import estilos from './SubirEvidencia.module.css';

interface Props {
  subcarpeta: SubcarpetaArchivo;
  evidencias: Evidencia[];
  onCambio: (evidencias: Evidencia[]) => void;
  etiqueta?: string;
  /** Cuando la carne no cumple, la fotografía deja de ser opcional. */
  obligatoria?: boolean;
  maximo?: number;
}

/**
 * Adjuntar fotografías.
 *
 * La imagen se comprime en el navegador y se sube antes de guardar el
 * registro: la API devuelve una referencia y es esa la que viaja dentro del
 * registro. Así el formulario se envía como un JSON pequeño.
 */
export function SubirEvidencia({
  subcarpeta,
  evidencias,
  onCambio,
  etiqueta = 'Agregar fotografía',
  obligatoria = false,
  maximo = 5,
}: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [subirArchivo, { isLoading: subiendo }] = useSubirArchivoMutation();
  const { data: estado } = useEstadoArchivosQuery();

  const almacenamientoListo = estado?.configurado ?? true;
  const lleno = evidencias.length >= maximo;

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError(null);

    try {
      const comprimida = await comprimirImagen(archivo);
      const evidencia = await subirArchivo({
        archivo: comprimida,
        subcarpeta,
        nombre: archivo.name,
      }).unwrap();
      onCambio([...evidencias, evidencia]);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    } finally {
      if (entrada.current) entrada.current.value = '';
    }
  }

  if (!almacenamientoListo) {
    return (
      <Mensaje tipo="aviso">
        El almacenamiento de fotografías no está configurado. Avise al administrador.
      </Mensaje>
    );
  }

  return (
    <div className={estilos.contenedor}>
      <input
        ref={entrada}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className={estilos.oculto}
        onChange={(evento) => void alElegir(evento.target.files?.[0])}
      />

      <button
        type="button"
        className={`${estilos.boton} ${evidencias.length > 0 ? estilos.conAdjuntos : ''}`}
        onClick={() => entrada.current?.click()}
        disabled={subiendo || lleno}
      >
        {subiendo
          ? 'Subiendo la fotografía…'
          : evidencias.length > 0
            ? `${evidencias.length} ${evidencias.length === 1 ? 'adjunto' : 'adjuntos'} · agregar otro`
            : etiqueta}
      </button>

      {obligatoria && evidencias.length === 0 && (
        <Mensaje tipo="aviso">
          La carne no cumple alguna condición: la fotografía es obligatoria.
        </Mensaje>
      )}

      {evidencias.length > 0 && (
        <ul className={estilos.miniaturas}>
          {evidencias.map((evidencia) => (
            <li key={evidencia.publicId} className={estilos.miniatura}>
              <img src={evidencia.url} alt="Evidencia adjunta" />
              <button
                type="button"
                className={estilos.quitar}
                aria-label="Quitar la fotografía"
                onClick={() =>
                  onCambio(evidencias.filter((otra) => otra.publicId !== evidencia.publicId))
                }
              >
                <Icono nombre="cerrar" tamano={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
