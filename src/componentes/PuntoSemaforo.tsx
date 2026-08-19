import type { Tono } from '@/domain/franjas';
import estilos from './PuntoSemaforo.module.css';

const DESCRIPCION: Record<Tono, string> = {
  verde: 'Todo en regla',
  amarillo: 'Atención',
  rojo: 'Incumplimiento',
  gris: 'Aún no corresponde',
  azul: 'Le toca ahora',
};

interface Props {
  tono: Tono;
  chico?: boolean;
  /** Texto que explica la celda; se muestra al pasar el cursor y lo lee el lector de pantalla. */
  titulo?: string;
}

/**
 * Punto de color del semáforo.
 * Lleva siempre una descripción accesible: el color por sí solo no comunica
 * nada a quien no lo distingue.
 */
export function PuntoSemaforo({ tono, chico = false, titulo }: Props) {
  const descripcion = titulo ? `${DESCRIPCION[tono]}: ${titulo}` : DESCRIPCION[tono];
  return (
    <span
      className={`${estilos.punto} ${estilos[tono]} ${chico ? estilos.chico : ''}`}
      title={descripcion}
      role="img"
      aria-label={descripcion}
    />
  );
}
