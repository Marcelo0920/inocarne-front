import { Icono, type NombreIcono } from './Icono';
import estilos from './Estados.module.css';

/**
 * Espera larga: la primera petición del día puede tardar cerca de un minuto
 * mientras el servidor del plan gratuito se despierta, así que conviene
 * explicarlo en lugar de dejar la pantalla en blanco.
 */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className={estilos.centro} role="status">
      <div className={estilos.girador} />
      <div className={estilos.detalle}>{texto}</div>
    </div>
  );
}

/** Marcador de lista mientras llegan los datos. */
export function EsqueletoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className={estilos.esqueleto} aria-hidden="true">
      {Array.from({ length: filas }, (_, indice) => (
        <div key={indice} className={estilos.barra} />
      ))}
    </div>
  );
}

interface PropsVacio {
  icono?: NombreIcono;
  titulo: string;
  detalle?: string;
  children?: React.ReactNode;
}

/** Lista sin resultados: se dice qué falta, no solo que está vacía. */
export function Vacio({ icono = 'vacio', titulo, detalle, children }: PropsVacio) {
  return (
    <div className={estilos.centro}>
      <Icono nombre={icono} tamano={40} className={estilos.icono} />
      <div className={estilos.titulo}>{titulo}</div>
      {detalle && <div className={estilos.detalle}>{detalle}</div>}
      {children}
    </div>
  );
}
