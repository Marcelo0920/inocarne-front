import estilos from './GrupoPildoras.module.css';

export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface Props<T extends string> {
  opciones: readonly Opcion<T>[];
  elegida: T | null;
  onElegir: (valor: T) => void;
  compacto?: boolean;
  etiquetaGrupo: string;
}

/**
 * Selección única en forma de píldoras.
 *
 * Se usa en lugar de un desplegable porque en un teléfono, con guantes, tocar
 * una opción visible es mucho más rápido que abrir una lista y buscar.
 */
export function GrupoPildoras<T extends string>({
  opciones,
  elegida,
  onElegir,
  compacto = false,
  etiquetaGrupo,
}: Props<T>) {
  return (
    <div className={estilos.grupo} role="radiogroup" aria-label={etiquetaGrupo}>
      {opciones.map((opcion) => {
        const activa = elegida === opcion.valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onElegir(opcion.valor)}
            className={`${estilos.pildora} ${activa ? estilos.elegida : ''} ${
              compacto ? estilos.compacta : ''
            }`}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
