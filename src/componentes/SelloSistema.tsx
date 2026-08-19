import type { ReactNode } from 'react';
import estilos from './SelloSistema.module.css';

/**
 * Banda que deja claro qué datos pone el sistema y no el usuario.
 *
 * Está en cada formulario de registro a propósito: la regla R1 dice que la
 * fecha y la hora no se escriben, y el vendedor tiene que verlo, no deducirlo.
 */
export function SelloSistema({ children }: { children: ReactNode }) {
  return <div className={estilos.sello}>{children}</div>;
}
