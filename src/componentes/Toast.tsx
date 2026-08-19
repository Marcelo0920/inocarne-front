import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import estilos from './Toast.module.css';

interface ContextoToast {
  mostrar: (mensaje: string) => void;
}

const Contexto = createContext<ContextoToast | null>(null);

const DURACION = 3500;

/**
 * Confirmaciones breves.
 *
 * Después de guardar, el vendedor necesita ver qué quedó registrado —incluida
 * la hora que puso el servidor— sin abandonar la pantalla en la que está.
 */
export function ProveedorToast({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string) => {
    setMensaje(texto);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setMensaje(null), DURACION);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <Contexto.Provider value={valor}>
      {children}
      {mensaje && (
        <div className={estilos.toast} role="status" aria-live="polite">
          {mensaje}
        </div>
      )}
    </Contexto.Provider>
  );
}

export function useToast(): ContextoToast {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useToast debe usarse dentro de ProveedorToast.');
  return contexto;
}
