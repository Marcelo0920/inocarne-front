import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearStore } from '@/app/store';
import { conexionCambiada, encolado } from '@/features/conexion/colaSlice';
import { enviarPendientes } from '@/features/conexion/colaThunks';
import type { Usuario } from '@/types/dominio';

const vendedor: Usuario = {
  id: 'u1',
  nombre: 'Juan Pérez',
  usuario: 'puesto7',
  rol: 'puesto',
  puestoId: 'p7',
};

function respuesta(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const unControl = {
  tipo: 'control' as const,
  url: '/controles',
  cuerpo: { tipo: 'exhibicion', franjaProgramada: '10:30', temperatura: 4 },
  descripcion: 'Control de exhibición 10:30',
};

const unaLimpieza = {
  tipo: 'limpieza' as const,
  url: '/limpiezas',
  cuerpo: { turno: 'inicial', items: [] },
  descripcion: 'Limpieza inicial',
};

let fetchSimulado: ReturnType<typeof vi.fn>;

/** Tienda con sesión iniciada y sin listeners disparando envíos por su cuenta. */
function tiendaConSesion() {
  return crearStore({ auth: { token: 'tok-123', usuario: vendedor, motivoCierre: null } });
}

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
});

describe('envío de la cola', () => {
  it('envía el pendiente con el token de la sesión y lo saca de la cola', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    fetchSimulado.mockResolvedValue(respuesta({ id: 'c1' }, 201));

    const resultado = await store.dispatch(enviarPendientes()).unwrap();

    expect(resultado).toEqual({ enviados: 1, fallidos: 0 });
    expect(store.getState().cola.pendientes).toHaveLength(0);

    const [url, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/controles');
    expect((opciones.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
    expect(JSON.parse(String(opciones.body))).toEqual(unControl.cuerpo);
  });

  it('envía en serie y respeta el orden de llegada', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    store.dispatch(encolado(unaLimpieza));
    fetchSimulado.mockResolvedValue(respuesta({ id: 'x' }, 201));

    await store.dispatch(enviarPendientes()).unwrap();

    const urls = fetchSimulado.mock.calls.map(([url]) => String(url));
    expect(urls[0]).toContain('/controles');
    expect(urls[1]).toContain('/limpiezas');
    expect(store.getState().cola.pendientes).toHaveLength(0);
  });

  it('un 409 se da por enviado: el intento anterior sí había llegado', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    fetchSimulado.mockResolvedValue(
      respuesta(
        { error: { codigo: 'CONFLICT', mensaje: 'El control de 10:30 de hoy ya fue registrado.' } },
        409,
      ),
    );

    const resultado = await store.dispatch(enviarPendientes()).unwrap();

    expect(resultado.enviados).toBe(1);
    expect(store.getState().cola.pendientes).toHaveLength(0);
  });

  it('un rechazo de validación se descarta en lugar de reintentarse', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    fetchSimulado.mockResolvedValue(
      respuesta({ error: { codigo: 'BAD_REQUEST', mensaje: 'Los datos no son válidos.' } }, 400),
    );

    const resultado = await store.dispatch(enviarPendientes()).unwrap();

    expect(resultado.fallidos).toBe(1);
    expect(store.getState().cola.pendientes).toHaveLength(0);
  });

  it('un error del servidor deja el registro en la cola para otro intento', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    fetchSimulado.mockResolvedValue(respuesta({ error: { mensaje: 'Error interno.' } }, 500));

    await store.dispatch(enviarPendientes()).unwrap();

    const pendiente = store.getState().cola.pendientes[0];
    expect(pendiente).toBeDefined();
    expect(pendiente?.intentos).toBe(1);
    expect(pendiente?.ultimoError).toMatch(/Error interno/);
  });

  it('si se corta la conexión detiene el envío y conserva el resto', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    store.dispatch(encolado(unaLimpieza));
    fetchSimulado.mockRejectedValue(new TypeError('Failed to fetch'));

    await store.dispatch(enviarPendientes()).unwrap();

    // Se corta en el primero: no tiene sentido seguir intentando los demás.
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(store.getState().cola.pendientes).toHaveLength(2);
  });

  it('no intenta nada sin conexión', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    store.dispatch(conexionCambiada(false));

    const resultado = await store.dispatch(enviarPendientes()).unwrap();

    expect(resultado).toEqual({ enviados: 0, fallidos: 0 });
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(store.getState().cola.pendientes).toHaveLength(1);
  });

  it('no se solapa consigo mismo mientras hay un envío en curso', async () => {
    const store = tiendaConSesion();
    store.dispatch(encolado(unControl));
    fetchSimulado.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(respuesta({}, 201)), 50)),
    );

    const primero = store.dispatch(enviarPendientes());
    const segundo = await store.dispatch(enviarPendientes()).unwrap();

    expect(segundo).toEqual({ enviados: 0, fallidos: 0 });
    await primero.unwrap();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });
});

describe('reacción a la conexión', () => {
  it('al volver la red se vacía la cola sin intervención del usuario', async () => {
    const store = tiendaConSesion();
    store.dispatch(conexionCambiada(false));
    store.dispatch(encolado(unControl));
    fetchSimulado.mockResolvedValue(respuesta({ id: 'c1' }, 201));

    expect(fetchSimulado).not.toHaveBeenCalled();

    store.dispatch(conexionCambiada(true));

    await vi.waitFor(() => {
      expect(store.getState().cola.pendientes).toHaveLength(0);
    });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
  });

  it('cerrar sesión descarta los pendientes del usuario anterior', async () => {
    const store = tiendaConSesion();
    store.dispatch(conexionCambiada(false));
    store.dispatch(encolado(unControl));
    expect(store.getState().cola.pendientes).toHaveLength(1);

    const { sesionCerrada } = await import('@/features/auth/authSlice');
    store.dispatch(sesionCerrada());

    expect(store.getState().cola.pendientes).toHaveLength(0);
  });
});
