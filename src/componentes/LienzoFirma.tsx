import { useCallback, useRef, useState, type PointerEvent } from 'react';
import type { Evidencia } from '@/types/dominio';
import { useSubirArchivoMutation } from '@/services/endpoints/archivos';
import { normalizarError } from '@/services/baseQuery';
import { Boton } from './Boton';
import { Mensaje } from './Mensaje';
import estilos from './LienzoFirma.module.css';

interface Props {
  firma: Evidencia | null;
  onCambio: (firma: Evidencia | null) => void;
}

const ANCHO = 700;
const ALTO = 220;

/**
 * Firma del responsable, trazada con el dedo.
 *
 * Reemplaza a la huella dactilar del requisito original, que no es posible
 * desde un navegador. La firma se sube como imagen y queda asociada al usuario
 * que inició sesión, que es lo que da valor al registro.
 */
export function LienzoFirma({ firma, onCambio }: Props) {
  const lienzo = useRef<HTMLCanvasElement | null>(null);
  const contexto = useRef<CanvasRenderingContext2D | null>(null);
  const dibujando = useRef(false);
  const [hayTrazo, setHayTrazo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subirArchivo, { isLoading: subiendo }] = useSubirArchivoMutation();

  const montar = useCallback((elemento: HTMLCanvasElement | null) => {
    lienzo.current = elemento;
    if (!elemento) return;
    const ctx = elemento.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#17242F';
    contexto.current = ctx;
  }, []);

  /** El lienzo se dibuja a mayor resolución que su tamaño en pantalla. */
  function puntoDelEvento(evento: PointerEvent<HTMLCanvasElement>) {
    const elemento = lienzo.current!;
    const caja = elemento.getBoundingClientRect();
    return {
      x: (evento.clientX - caja.left) * (elemento.width / caja.width),
      y: (evento.clientY - caja.top) * (elemento.height / caja.height),
    };
  }

  function alBajar(evento: PointerEvent<HTMLCanvasElement>) {
    if (!contexto.current) return;
    dibujando.current = true;
    const punto = puntoDelEvento(evento);
    contexto.current.beginPath();
    contexto.current.moveTo(punto.x, punto.y);
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function alMover(evento: PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current || !contexto.current) return;
    const punto = puntoDelEvento(evento);
    contexto.current.lineTo(punto.x, punto.y);
    contexto.current.stroke();
    if (!hayTrazo) setHayTrazo(true);
  }

  async function alSoltar() {
    if (!dibujando.current) return;
    dibujando.current = false;
    if (!lienzo.current || !hayTrazo) return;

    // Se sube al levantar el dedo: cuando el vendedor guarda el registro, la
    // firma ya está en el servidor y no hay que esperarla.
    setError(null);
    const imagen = await new Promise<Blob | null>((resolver) =>
      lienzo.current!.toBlob(resolver, 'image/png'),
    );
    if (!imagen) return;

    try {
      const evidencia = await subirArchivo({
        archivo: imagen,
        subcarpeta: 'firmas',
        nombre: 'firma.png',
      }).unwrap();
      onCambio(evidencia);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  function limpiar() {
    contexto.current?.clearRect(0, 0, ANCHO, ALTO);
    setHayTrazo(false);
    setError(null);
    onCambio(null);
  }

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.etiqueta}>Firma del responsable</div>
      <canvas
        ref={montar}
        width={ANCHO}
        height={ALTO}
        className={`${estilos.lienzo} ${firma ? estilos.firmado : ''}`}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={() => void alSoltar()}
        onPointerLeave={() => void alSoltar()}
        aria-label="Área para firmar con el dedo"
      />
      <div className={estilos.pie}>
        <span className={`${estilos.ayuda} ${firma ? estilos.listo : ''}`}>
          {subiendo
            ? 'Guardando la firma…'
            : firma
              ? 'Firma registrada'
              : 'Dibuje su firma con el dedo'}
        </span>
        <Boton variante="texto" onClick={limpiar} type="button">
          Borrar firma
        </Boton>
      </div>
      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
