import type { Tono } from '@/domain/franjas';
import { Icono, type NombreIcono } from './Icono';
import estilos from './Chip.module.css';

interface Props {
  tono: Tono;
  children: React.ReactNode;
  grande?: boolean;
  /** Icono a la izquierda del texto: refuerza el estado sin depender del color. */
  icono?: NombreIcono;
}

/** Etiqueta de estado. El color nunca va solo: siempre acompaña a un texto. */
export function Chip({ tono, children, grande = false, icono }: Props) {
  return (
    <span className={`${estilos.chip} ${estilos[tono]} ${grande ? estilos.grande : ''}`}>
      {icono && <Icono nombre={icono} tamano={grande ? 15 : 13} className={estilos.icono} />}
      {children}
    </span>
  );
}
