import type { ReactNode } from 'react';
import estilos from './Mensaje.module.css';

interface Props {
  tipo?: 'error' | 'aviso' | 'exito' | 'info';
  children: ReactNode;
  /** Lista de campos o puntos que faltan, cuando el error los detalla. */
  detalle?: string[];
}

export function Mensaje({ tipo = 'error', children, detalle }: Props) {
  return (
    <div
      className={`${estilos.mensaje} ${estilos[tipo]}`}
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      {children}
      {detalle && detalle.length > 0 && (
        <ul className={estilos.detalle}>
          {detalle.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
