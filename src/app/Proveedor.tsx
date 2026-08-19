import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { conexionCambiada } from '@/features/conexion/colaSlice';
import { store } from './store';

/**
 * Envuelve la aplicación con la tienda y mantiene sincronizado el estado de la
 * conexión: cuando el navegador avisa que volvió la red, el middleware de
 * escucha vacía la cola de registros pendientes.
 */
export function Proveedor({ children }: { children: ReactNode }) {
  useEffect(() => {
    const actualizar = () => {
      store.dispatch(conexionCambiada(navigator.onLine));
    };

    actualizar();
    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);

    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
