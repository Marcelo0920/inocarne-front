import type { ReactNode } from 'react';
import estilos from './FilaChecklist.module.css';

interface PropsFila {
  nombre: string;
  /** Lo que se espera encontrar; se muestra bajo el nombre. */
  esperado?: string;
  valor: boolean | null;
  onMarcar: (cumple: boolean) => void;
  etiquetaSi?: string;
  etiquetaNo?: string;
  children?: ReactNode;
}

/**
 * Punto de un checklist con sus dos botones.
 *
 * Sin marcar, los dos botones se ven neutros: así el vendedor distingue de un
 * vistazo lo que todavía no revisó de lo que ya marcó.
 */
export function FilaChecklist({
  nombre,
  esperado,
  valor,
  onMarcar,
  etiquetaSi = 'Cumple',
  etiquetaNo = 'No cumple',
  children,
}: PropsFila) {
  return (
    <div className={estilos.bloque}>
      <div className={estilos.fila}>
        <div className={estilos.nombre}>
          {nombre}
          {esperado && <div className={estilos.esperado}>{esperado}</div>}
        </div>
        <button
          type="button"
          aria-pressed={valor === true}
          onClick={() => onMarcar(true)}
          className={`${estilos.boton} ${valor === true ? estilos.si : ''}`}
        >
          {etiquetaSi}
        </button>
        <button
          type="button"
          aria-pressed={valor === false}
          onClick={() => onMarcar(false)}
          className={`${estilos.boton} ${valor === false ? estilos.no : ''}`}
        >
          {etiquetaNo}
        </button>
      </div>
      {children}
    </div>
  );
}

export function ListaChecklist({ children }: { children: ReactNode }) {
  return <div className={estilos.lista}>{children}</div>;
}

/** Campo de descripción que aparece al marcar "No cumple" en una inspección. */
export function CampoHallazgo({
  valor,
  onCambio,
  children,
}: {
  valor: string;
  onCambio: (valor: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className={estilos.hallazgo}>
      <textarea
        className={estilos.campoHallazgo}
        placeholder="Descripción de la no conformidad…"
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        aria-label="Descripción de la no conformidad"
      />
      {children}
    </div>
  );
}

export function PuntosPendientes({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <div className={estilos.pendientes}>
      Faltan {cantidad} {cantidad === 1 ? 'punto' : 'puntos'} por marcar.
    </div>
  );
}
