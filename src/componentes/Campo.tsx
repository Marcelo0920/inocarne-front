import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { ResultadoValidacion } from '@/domain/validacion';
import { Chip } from './Chip';
import estilos from './Campo.module.css';

interface PropsTexto extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  etiqueta: string;
  ayuda?: string;
  error?: string;
}

export function CampoTexto({ etiqueta, ayuda, error, ...resto }: PropsTexto) {
  const id = useId();
  return (
    <div className={estilos.grupo}>
      <div className={estilos.encabezado}>
        <label className={estilos.etiqueta} htmlFor={id}>
          {etiqueta}
        </label>
        {ayuda && <span className={estilos.ayuda}>{ayuda}</span>}
      </div>
      <input
        id={id}
        className={`${estilos.campo} ${error ? estilos.conError : ''}`}
        aria-invalid={Boolean(error)}
        {...resto}
      />
      {error && <div className={estilos.error}>{error}</div>}
    </div>
  );
}

interface PropsArea extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  etiqueta: string;
  error?: string;
}

export function CampoArea({ etiqueta, error, ...resto }: PropsArea) {
  const id = useId();
  return (
    <div className={estilos.grupo}>
      <label className={estilos.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      <textarea
        id={id}
        className={`${estilos.campo} ${estilos.area} ${error ? estilos.conError : ''}`}
        aria-invalid={Boolean(error)}
        {...resto}
      />
      {error && <div className={estilos.error}>{error}</div>}
    </div>
  );
}

interface PropsMedicion {
  etiqueta: string;
  /** Rango aceptado, siempre a la vista junto al campo (regla R3). */
  ayuda: string;
  valor: string;
  onCambio: (valor: string) => void;
  validacion: ResultadoValidacion;
  error?: string;
  deshabilitado?: boolean;
}

/**
 * Campo de temperatura o pH.
 *
 * Valida mientras se escribe y lo dice con palabras además del color, para que
 * el vendedor sepa en el momento si el valor sirve — sin esperar a guardar.
 */
export function CampoMedicion({
  etiqueta,
  ayuda,
  valor,
  onCambio,
  validacion,
  error,
  deshabilitado,
}: PropsMedicion) {
  const id = useId();
  const estadoBorde =
    validacion.dentroRango === null ? '' : validacion.dentroRango ? estilos.dentro : estilos.fuera;

  return (
    <div className={estilos.grupo}>
      <div className={estilos.encabezado}>
        <label className={estilos.etiqueta} htmlFor={id}>
          {etiqueta}
        </label>
        <span className={estilos.ayuda}>{ayuda}</span>
      </div>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="0,0"
        value={valor}
        disabled={deshabilitado}
        onChange={(evento) => onCambio(evento.target.value)}
        className={`${estilos.campo} ${estilos.medicion} ${estadoBorde} ${error ? estilos.conError : ''}`}
        aria-invalid={Boolean(error) || validacion.dentroRango === false}
      />
      {validacion.dentroRango !== null && (
        <div className={estilos.resultado}>
          <Chip tono={validacion.dentroRango ? 'verde' : 'rojo'} grande>
            {validacion.mensaje}
          </Chip>
        </div>
      )}
      {error && <div className={estilos.error}>{error}</div>}
    </div>
  );
}
