import type { CSSProperties } from 'react';

/**
 * Color propio de cada módulo de supervisión.
 *
 * La mayoría comparte el azul institucional: son funciones de registro y
 * consulta, y teñirlas de distintos colores solo haría ruido. Se distinguen
 * las cuatro que el supervisor busca por lo que significan —una alerta, un
 * trabajo técnico, una formación, un control sanitario— para que se
 * reconozcan por el color antes de leer la etiqueta.
 *
 * Los valores viven en `styles/tokens.css`; acá solo se decide cuál le toca a
 * cada ruta.
 */
const ACENTOS: Record<string, string> = {
  '/acciones': 'acciones',
  '/mantenimientos': 'mantenimientos',
  '/capacitaciones': 'capacitaciones',
  '/plagas': 'plagas',
};

const INSTITUCIONAL = 'institucional';

/** Nombre del acento de una ruta; el institucional es el que manda por defecto. */
export function acentoDe(ruta: string): string {
  return ACENTOS[ruta] ?? INSTITUCIONAL;
}

/**
 * Variables que consume el CSS del módulo: `--acento` para el trazo y
 * `--acento-suave` para el fondo teñido.
 */
export function estiloDeAcento(ruta: string): CSSProperties {
  const nombre = acentoDe(ruta);
  return {
    '--acento': `var(--mod-${nombre})`,
    '--acento-suave': `var(--mod-${nombre}-suave)`,
  } as CSSProperties;
}
