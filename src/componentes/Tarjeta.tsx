import type { ReactNode } from 'react';
import estilos from './Tarjeta.module.css';

interface Props {
  children: ReactNode;
  destacada?: boolean;
  sinRelleno?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Superficie base de toda la aplicación.
 * Si recibe `onClick` se rinde como botón, para que funcione con teclado y
 * lectores de pantalla sin trabajo extra en cada pantalla.
 */
export function Tarjeta({ children, destacada, sinRelleno, onClick, className = '' }: Props) {
  const clases = [
    estilos.tarjeta,
    destacada ? estilos.destacada : '',
    sinRelleno ? estilos.sinRelleno : '',
    onClick ? estilos.pulsable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (onClick) {
    return (
      <button type="button" className={clases} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={clases}>{children}</div>;
}
