import imagen from '@/assets/logo-256.jpg';

/**
 * Marca de INOCARNE.
 *
 * `logo-256.jpg` es una reducción del original `assets/logo.jpeg`: en pantalla
 * el logo nunca pasa de 96 px y el archivo grande pesaba más que toda la
 * aplicación junta. Si el logo cambia, hay que volver a reducirlo —y rehacer
 * también los iconos de `public/`, que salen de la misma imagen—.
 *
 * El dibujo es un círculo sobre fondo blanco; el recorte redondo lo resuelve
 * cada pantalla con su propio CSS.
 */
interface Props {
  /** Lado en píxeles: el mismo valor va al atributo, para que no salte el diseño al cargar. */
  tamano: number;
  className?: string;
  /** Solo cuando el logo no va acompañado del nombre escrito. */
  etiqueta?: string;
}

export function Logo({ tamano, className, etiqueta }: Props) {
  return (
    <img
      src={imagen}
      alt={etiqueta ?? ''}
      width={tamano}
      height={tamano}
      className={className}
      {...(etiqueta ? {} : { 'aria-hidden': true })}
    />
  );
}
