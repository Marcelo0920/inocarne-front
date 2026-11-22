import type { NombreIcono } from '@/componentes/Icono';
import type { EstadoControl, Semaforo, TipoCarne } from '@/types/dominio';

/**
 * Zona horaria del mercado. El servidor manda instantes en UTC; aquí se
 * traducen a la hora local para mostrarlos.
 */
export const ZONA_HORARIA = 'America/La_Paz';

export type Tono = Semaforo | 'azul';

/** Hora local del mercado, en `HH:mm`. */
export function horaLocal(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_HORARIA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(instante)
    .replace(/^24:/, '00:');
}

/** Día local del mercado, en `YYYY-MM-DD`. */
export function diaLocal(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

export interface EtiquetaControl {
  tono: Tono;
  texto: string;
  /** Icono del chip: refuerza el estado sin depender del color. */
  icono: NombreIcono;
  detalle: string;
  /** `true` en el siguiente control por hacer: es el que se ofrece registrar. */
  destacada: boolean;
  /** `true` si se ofrece registrarlo. Un control ya hecho no se repite. */
  registrable: boolean;
}

/**
 * Cómo se muestra un control del día. No hay horario ni puntualidad: solo si
 * está hecho, si su medición está en rango y cuál es el siguiente por hacer.
 */
export function etiquetaDeControl(
  estado: EstadoControl,
  opciones: { dentroRango?: boolean; horaRegistro?: string; siguiente?: boolean },
): EtiquetaControl {
  const { dentroRango = true, horaRegistro, siguiente = false } = opciones;
  const registrado = `Registrado ${horaRegistro ?? ''}`.trim();

  if (horaRegistro && !dentroRango) {
    return {
      tono: 'rojo',
      texto: 'Fuera de rango',
      icono: 'atencion',
      detalle: registrado,
      destacada: false,
      registrable: false,
    };
  }

  switch (estado) {
    case 'realizado':
      return {
        tono: 'verde',
        texto: 'Hecho',
        icono: 'cumple',
        detalle: registrado,
        destacada: false,
        registrable: false,
      };
    case 'no_realizado':
      return {
        tono: 'rojo',
        texto: 'No realizado',
        icono: 'atencion',
        detalle: 'El día terminó sin este control',
        destacada: false,
        registrable: false,
      };
    case 'pendiente':
      return siguiente
        ? {
            tono: 'azul',
            texto: 'Pendiente',
            icono: 'reloj',
            detalle: 'Regístrelo cuando pueda',
            destacada: true,
            registrable: true,
          }
        : {
            tono: 'gris',
            texto: 'Pendiente',
            icono: 'reloj',
            detalle: 'Después del anterior',
            destacada: false,
            registrable: false,
          };
  }
}

/** Rango de pH que corresponde al tipo de carne elegido. */
export function rangoPh(
  tipoCarne: TipoCarne | null,
  rangos: {
    rangoPhRojas: { min: number; max: number };
    rangoPhPollo: { min: number; max: number };
  },
): { min: number; max: number } | null {
  if (!tipoCarne) return null;
  return tipoCarne === 'pollo' ? rangos.rangoPhPollo : rangos.rangoPhRojas;
}

/** Coma decimal, como se escribe en Bolivia. */
export const conComa = (valor: number | string): string => String(valor).replace('.', ',');
