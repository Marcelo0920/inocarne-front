import type { Configuracion, TipoCarne } from '@/types/dominio';
import { conComa, rangoPh } from './franjas';

/**
 * Validación en vivo de las mediciones, mientras el vendedor escribe.
 *
 * Es la misma regla que aplica el servidor (R3). Aquí no se usa para decidir
 * nada —el registro lo evalúa la API— sino para que el vendedor vea el
 * resultado antes de guardar, sin esperar la respuesta.
 */
export interface ResultadoValidacion {
  /** `null` mientras el campo está vacío: todavía no hay nada que decir. */
  dentroRango: boolean | null;
  mensaje: string;
}

const VACIO: ResultadoValidacion = { dentroRango: null, mensaje: '' };

function comoNumero(valor: string): number | null {
  if (valor.trim() === '') return null;
  // El teclado del teléfono escribe coma; el navegador espera punto.
  const numero = Number(valor.replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

export function validarTemperatura(
  valor: string,
  configuracion: Pick<Configuracion, 'temperaturaMaxima'>,
): ResultadoValidacion {
  const numero = comoNumero(valor);
  if (numero === null) return VACIO;

  const dentroRango = numero <= configuracion.temperaturaMaxima;
  return {
    dentroRango,
    // El chip que lo muestra ya lleva su icono: el texto no repite el símbolo.
    mensaje: dentroRango
      ? `${conComa(numero)} °C está dentro del rango`
      : `${conComa(numero)} °C está FUERA del rango`,
  };
}

export function validarPh(
  valor: string,
  tipoCarne: TipoCarne | null,
  configuracion: Pick<Configuracion, 'rangoPhRojas' | 'rangoPhPollo'>,
): ResultadoValidacion {
  const numero = comoNumero(valor);
  const rango = rangoPh(tipoCarne, configuracion);
  if (numero === null || !rango) return VACIO;

  const dentroRango = numero >= rango.min && numero <= rango.max;
  return {
    dentroRango,
    mensaje: dentroRango
      ? `pH ${conComa(numero)} dentro del rango`
      : `pH ${conComa(numero)} FUERA del rango`,
  };
}

/** Texto de ayuda que acompaña al campo de pH. */
export function textoRangoPh(
  tipoCarne: TipoCarne | null,
  configuracion: Pick<Configuracion, 'rangoPhRojas' | 'rangoPhPollo'>,
): string {
  if (!tipoCarne) return 'Elija primero el tipo de carne';
  const rango = rangoPh(tipoCarne, configuracion)!;
  const cual = tipoCarne === 'pollo' ? 'pollo' : 'carnes rojas';
  return `Aceptado: ${conComa(rango.min)} – ${conComa(rango.max)} (${cual})`;
}

export const textoRangoTemperatura = (
  configuracion: Pick<Configuracion, 'temperaturaMaxima'>,
): string => `Aceptado: ${conComa(configuracion.temperaturaMaxima)} °C o menos`;

export interface CondicionesOrganolepticasParciales {
  color?: boolean;
  olor?: boolean;
  textura?: boolean;
  grasa?: boolean;
}

/**
 * ¿Hace falta adjuntar una fotografía?
 *
 * El servidor la exige cuando la carne se rechaza, cuando una medición sale de
 * rango o cuando falla alguna condición organoléptica. Se repite aquí con el
 * mismo criterio para que el vendedor no descubra el requisito recién al
 * recibir el error del servidor.
 */
export function fotoObligatoria(entrada: {
  resultado: 'aceptado' | 'rechazado' | null;
  temperatura: ResultadoValidacion;
  ph: ResultadoValidacion;
  organolepticas: CondicionesOrganolepticasParciales;
}): boolean {
  const rechazada = entrada.resultado === 'rechazado';
  const medicionFuera =
    entrada.temperatura.dentroRango === false || entrada.ph.dentroRango === false;
  const organolepticaMal = Object.values(entrada.organolepticas).some((valor) => valor === false);
  return rechazada || medicionFuera || organolepticaMal;
}

/** Convierte el texto de un campo numérico al número que espera la API. */
export function aNumero(valor: string): number | null {
  return comoNumero(valor);
}
