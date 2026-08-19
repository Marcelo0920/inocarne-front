import type { ButtonHTMLAttributes } from 'react';
import estilos from './Boton.module.css';

type Variante = 'primario' | 'verde' | 'secundario' | 'texto';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  compacto?: boolean;
  anchoCompleto?: boolean;
  /** Mientras se guarda, el botón se bloquea para no duplicar el registro. */
  cargando?: boolean;
}

export function Boton({
  variante = 'primario',
  compacto = false,
  anchoCompleto = false,
  cargando = false,
  disabled,
  children,
  className = '',
  ...resto
}: Props) {
  const clases = [
    estilos.boton,
    estilos[variante],
    compacto ? estilos.compacto : '',
    anchoCompleto ? estilos.anchoCompleto : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={clases} disabled={disabled || cargando} {...resto}>
      {cargando ? 'Guardando…' : children}
    </button>
  );
}
