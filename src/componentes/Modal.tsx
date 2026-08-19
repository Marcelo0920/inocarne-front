import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Boton } from './Boton';
import { Icono } from './Icono';
import estilos from './Modal.module.css';

interface Props {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  /** Acciones del pie: normalmente el botón que confirma. */
  acciones?: ReactNode;
}

/**
 * Ventana modal para altas rápidas.
 *
 * Los formularios de creación no viven permanentemente en la pantalla: la
 * pantalla es la lista, y crear es una acción puntual. Se cierra con Escape,
 * tocando fuera o con la cruz, y al abrirse lleva el foco al primer campo para
 * que quien navega con teclado no quede atrás del contenido.
 */
export function Modal({ titulo, abierto, onCerrar, children, acciones }: Props) {
  const idTitulo = useId();
  const cuerpo = useRef<HTMLDivElement>(null);
  const enfocadoAntes = useRef<Element | null>(null);

  // El cierre se guarda en una referencia para que el efecto de apertura no
  // dependa de él: quien usa el modal suele pasar una función nueva en cada
  // render, y eso volvería a ejecutar el efecto con cada tecla.
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;

    enfocadoAntes.current = document.activeElement;

    // Se busca dentro del cuerpo, no del diálogo entero: el primer elemento
    // enfocable del diálogo es la cruz de cerrar, y el foco debe ir al
    // formulario.
    const primerCampo = cuerpo.current?.querySelector<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
    );
    primerCampo?.focus();

    function alPresionar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') cerrar.current();
    }
    document.addEventListener('keydown', alPresionar);

    // Con el modal abierto, el fondo no debe desplazarse.
    const desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.body.style.overflow = desbordeAnterior;
      (enfocadoAntes.current as HTMLElement | null)?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className={estilos.fondo}
      // Cerrar al tocar fuera, pero no cuando el clic nace dentro del panel.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div className={estilos.panel} role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <header className={estilos.encabezado}>
          <h2 className={estilos.titulo} id={idTitulo}>
            {titulo}
          </h2>
          <button type="button" className={estilos.cerrar} onClick={onCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </header>

        <div className={estilos.cuerpo} ref={cuerpo}>
          {children}
        </div>

        <footer className={estilos.pie}>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          {acciones}
        </footer>
      </div>
    </div>
  );
}
