import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import estilos from './CabeceraAtras.module.css';

interface Props {
  titulo: ReactNode;
  subtitulo?: string;
  /** Destino del botón de volver. Sin él, vuelve a la pantalla anterior. */
  volverA?: string;
  acciones?: ReactNode;
}

export function CabeceraAtras({ titulo, subtitulo, volverA, acciones }: Props) {
  const navegar = useNavigate();

  return (
    <div>
      <div className={estilos.cabecera}>
        <button
          type="button"
          className={estilos.atras}
          onClick={() => (volverA ? navegar(volverA) : navegar(-1))}
          aria-label="Volver"
        >
          ‹
        </button>
        <div className={estilos.titulo}>{titulo}</div>
        {acciones}
      </div>
      {subtitulo && <div className={estilos.subtitulo}>{subtitulo}</div>}
    </div>
  );
}
