import type { NombreIcono } from '@/componentes/Icono';
import type { EstadoControl, Semaforo, TipoCarne } from '@/types/dominio';

/**
 * Zona horaria del mercado. El servidor manda instantes en UTC; aquí solo se
 * traducen para compararlos con los horarios programados, que son hora local.
 */
export const ZONA_HORARIA = 'America/La_Paz';

/**
 * Estado que ve el vendedor.
 *
 * Es el del servidor más un caso que la API no distingue: `ahora`. El servidor
 * responde `pendiente` tanto para "todavía falta" como para "le toca en este
 * momento", y para el vendedor no es lo mismo — uno se puede ignorar y el otro
 * hay que atenderlo ya. La diferencia se calcula aquí con la tolerancia
 * configurada, sin pedirle nada más al servidor.
 */
export type EstadoFranjaVista = EstadoControl | 'ahora';

export type Tono = Semaforo | 'azul';

/** `HH:mm` local a minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h = '0', m = '0'] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

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

/**
 * Afina el estado que devolvió la API.
 * Solo puede convertir `pendiente` en `ahora`; el resto se respeta tal cual,
 * porque los decide el servidor y son los que quedan registrados.
 */
export function afinarEstado(
  estadoDelServidor: EstadoControl,
  franjaProgramada: string,
  toleranciaMinutos: number,
  ahora: Date = new Date(),
): EstadoFranjaVista {
  if (estadoDelServidor !== 'pendiente') return estadoDelServidor;

  const minutosAhora = aMinutos(horaLocal(ahora));
  const minutosFranja = aMinutos(franjaProgramada);
  const dentroDeLaVentana =
    minutosAhora >= minutosFranja - toleranciaMinutos &&
    minutosAhora <= minutosFranja + toleranciaMinutos;

  return dentroDeLaVentana ? 'ahora' : 'pendiente';
}

export interface EtiquetaFranja {
  tono: Tono;
  texto: string;
  /** Icono del chip: refuerza el estado sin depender del color. */
  icono: NombreIcono;
  detalle: string;
  /** `true` cuando la tarjeta debe resaltarse: es lo que toca hacer ahora. */
  destacada: boolean;
  /** `true` si todavía se puede registrar. Un control ya hecho no se repite. */
  registrable: boolean;
}

/** Cómo se muestra una franja: chip, texto de apoyo y si acepta registro. */
export function etiquetaDeFranja(
  estado: EstadoFranjaVista,
  opciones: { dentroRango?: boolean; horaRegistro?: string; toleranciaMinutos: number },
): EtiquetaFranja {
  const { dentroRango = true, horaRegistro, toleranciaMinutos } = opciones;
  const registrado = `Registrado ${horaRegistro ?? ''}`.trim();

  // Una medición fuera de rango manda sobre la puntualidad: es lo grave.
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
    case 'a_tiempo':
      return {
        tono: 'verde',
        texto: 'A tiempo',
        icono: 'cumple',
        detalle: registrado,
        destacada: false,
        registrable: false,
      };
    case 'con_retraso':
      return {
        tono: 'amarillo',
        texto: 'Con retraso',
        icono: 'cumple',
        detalle: registrado,
        destacada: false,
        registrable: false,
      };
    case 'ahora':
      return {
        tono: 'azul',
        texto: 'Le toca ahora',
        icono: 'reloj',
        detalle: `Tolerancia: ±${toleranciaMinutos} min`,
        destacada: true,
        registrable: true,
      };
    case 'no_realizado':
      return {
        tono: 'rojo',
        texto: 'No realizado',
        icono: 'atencion',
        detalle: 'La ventana de tiempo ya pasó',
        destacada: false,
        registrable: true,
      };
    case 'pendiente':
      return {
        tono: 'gris',
        texto: 'Más tarde',
        icono: 'reloj',
        detalle: 'Todavía no le toca',
        destacada: false,
        registrable: true,
      };
  }
}

/** Cómo quedará el registro si se guarda en este momento. */
export function estadoPrevisto(
  franjaProgramada: string,
  toleranciaMinutos: number,
  ahora: Date = new Date(),
): string {
  const estado = afinarEstado('pendiente', franjaProgramada, toleranciaMinutos, ahora);
  return estado === 'ahora' ? 'quedará A TIEMPO' : 'quedará CON RETRASO';
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
