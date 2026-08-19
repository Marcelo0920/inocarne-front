import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { crearStore, type RootState } from '@/app/store';
import { ProveedorToast } from '@/componentes';
import type { Usuario } from '@/types/dominio';

export const VENDEDOR: Usuario = {
  id: 'u1',
  nombre: 'Juan Pérez',
  usuario: 'puesto3',
  rol: 'puesto',
  puestoId: 'p3',
  puesto: { id: 'p3', numero: 3, nombre: 'Puesto 3' },
};

export const SUPERVISORA: Usuario = {
  id: 'u2',
  nombre: 'María Rojas',
  usuario: 'supervisora',
  rol: 'supervisor',
  puestoId: null,
};

interface Opciones extends Omit<RenderOptions, 'wrapper'> {
  estado?: Partial<RootState>;
  ruta?: string;
}

/** Renderiza con la tienda real, el router y el proveedor de avisos. */
export function renderizar(elemento: ReactElement, opciones: Opciones = {}) {
  const { estado, ruta = '/', ...resto } = opciones;
  const store = crearStore(estado);

  function Envoltura({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[ruta]}>
          <ProveedorToast>{children}</ProveedorToast>
        </MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(elemento, { wrapper: Envoltura, ...resto }) };
}

/** Estado con sesión iniciada, para las pantallas que la exigen. */
export function conSesion(usuario: Usuario = VENDEDOR): Partial<RootState> {
  return { auth: { token: 'tok-prueba', usuario, motivoCierre: null } };
}
