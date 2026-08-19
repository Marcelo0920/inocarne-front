import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearStore } from '@/app/store';
import { authApi, cerrarSesion } from '@/services/endpoints/auth';
import { catalogosApi } from '@/services/endpoints/catalogos';
import { registrosApi } from '@/services/endpoints/registros';
import { leerSesion } from '@/features/auth/sesionAlmacenada';
import type { Configuracion, Usuario } from '@/types/dominio';

const vendedor: Usuario = {
  id: 'u1',
  nombre: 'Juan Pérez',
  usuario: 'puesto7',
  rol: 'puesto',
  puestoId: 'p7',
  puesto: { id: 'p7', numero: 7, nombre: 'Puesto 7' },
};

const configuracion: Configuracion = {
  temperaturaMaxima: 5,
  rangoPhRojas: { min: 5.4, max: 5.8 },
  rangoPhPollo: { min: 5.8, max: 6.2 },
  horariosExhibicion: ['07:00', '10:30', '13:30'],
  horariosRefrigeracion: ['07:00', '13:30'],
  toleranciaMinutos: 15,
  diasAvisoPlagas: [7, 3, 1, 0],
  diasAvisoMantenimiento: 15,
  puntosLimpieza: ['Higiene del personal'],
  puntosInspeccionMercado: ['Pasillos limpios'],
  puntosInspeccionPuesto: ['Limpieza — mesones'],
};

/** Respuesta JSON de la API. */
function respuesta(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchSimulado: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSimulado = vi.fn();
  vi.stubGlobal('fetch', fetchSimulado);
});

/** Última petición que recibió el fetch simulado, ya normalizada. */
async function ultimaPeticion() {
  const [entrada, opciones] = fetchSimulado.mock.calls.at(-1) as [
    Request | string,
    RequestInit | undefined,
  ];
  const peticion = entrada instanceof Request ? entrada : new Request(entrada, opciones);
  return {
    url: peticion.url,
    metodo: peticion.method,
    autorizacion: peticion.headers.get('Authorization'),
    cuerpo: await peticion
      .clone()
      .json()
      .catch(() => null),
  };
}

describe('ingreso', () => {
  it('guarda la sesión y usa el token en las peticiones siguientes', async () => {
    fetchSimulado.mockResolvedValueOnce(respuesta({ token: 'tok-123', usuario: vendedor }));
    const store = crearStore();

    await store
      .dispatch(authApi.endpoints.login.initiate({ usuario: 'puesto7', password: 'clave1234' }))
      .unwrap();

    expect(store.getState().auth.token).toBe('tok-123');
    expect(store.getState().auth.usuario).toEqual(vendedor);
    expect(leerSesion()?.token).toBe('tok-123');

    fetchSimulado.mockResolvedValueOnce(respuesta(configuracion));
    await store.dispatch(catalogosApi.endpoints.configuracion.initiate()).unwrap();

    const peticion = await ultimaPeticion();
    expect(peticion.autorizacion).toBe('Bearer tok-123');
    expect(peticion.url).toContain('/api/configuracion');
  });

  it('no guarda nada si las credenciales son incorrectas', async () => {
    fetchSimulado.mockResolvedValueOnce(
      respuesta(
        { error: { codigo: 'UNAUTHORIZED', mensaje: 'Usuario o contraseña incorrectos.' } },
        401,
      ),
    );
    const store = crearStore();

    await expect(
      store
        .dispatch(authApi.endpoints.login.initiate({ usuario: 'puesto7', password: 'mala' }))
        .unwrap(),
    ).rejects.toBeDefined();

    expect(store.getState().auth.token).toBeNull();
    expect(leerSesion()).toBeNull();
  });
});

describe('sesión expirada', () => {
  it('un 401 en cualquier consulta cierra la sesión y explica por qué', async () => {
    const store = crearStore({
      auth: { token: 'tok-viejo', usuario: vendedor, motivoCierre: null },
    });

    fetchSimulado.mockResolvedValueOnce(
      respuesta({ error: { codigo: 'UNAUTHORIZED', mensaje: 'La sesión expiró.' } }, 401),
    );

    await store.dispatch(catalogosApi.endpoints.configuracion.initiate());

    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.motivoCierre).toMatch(/expiró/i);
  });

  it('salir voluntariamente vacía además la caché de la API', async () => {
    const store = crearStore({
      auth: { token: 'tok-123', usuario: vendedor, motivoCierre: null },
    });

    fetchSimulado.mockResolvedValueOnce(respuesta(configuracion));
    await store.dispatch(catalogosApi.endpoints.configuracion.initiate()).unwrap();
    expect(Object.keys(store.getState().api.queries)).not.toHaveLength(0);

    store.dispatch(cerrarSesion());

    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().auth.motivoCierre).toBeNull();
    expect(Object.keys(store.getState().api.queries)).toHaveLength(0);
  });
});

describe('registro de un control', () => {
  const store = () =>
    crearStore({ auth: { token: 'tok-123', usuario: vendedor, motivoCierre: null } });

  it('envía solo lo que el vendedor completó: la hora la pone el servidor', async () => {
    const tienda = store();
    fetchSimulado.mockResolvedValueOnce(
      respuesta({ id: 'c1', cumplimiento: 'a_tiempo', dentroRango: true }, 201),
    );

    await tienda
      .dispatch(
        registrosApi.endpoints.registrarControl.initiate({
          tipo: 'exhibicion',
          franjaProgramada: '10:30',
          temperatura: 4,
          ph: 5.6,
          tipoCarne: 'res',
        }),
      )
      .unwrap();

    const peticion = await ultimaPeticion();
    expect(peticion.metodo).toBe('POST');
    expect(peticion.url).toContain('/api/controles');
    expect(peticion.cuerpo).toEqual({
      tipo: 'exhibicion',
      franjaProgramada: '10:30',
      temperatura: 4,
      ph: 5.6,
      tipoCarne: 'res',
    });
    expect(peticion.cuerpo).not.toHaveProperty('registradoEn');
    expect(peticion.cuerpo).not.toHaveProperty('dia');
  });

  it('vuelve a pedir el día y el panel después de registrar', async () => {
    const tienda = store();

    fetchSimulado.mockResolvedValueOnce(respuesta({ dia: '2026-02-09', franjas: [] }));
    await tienda.dispatch(registrosApi.endpoints.diaDeControles.initiate()).unwrap();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);

    fetchSimulado.mockResolvedValueOnce(respuesta({ id: 'c1' }, 201));
    // La recarga que dispara la invalidación.
    fetchSimulado.mockResolvedValueOnce(respuesta({ dia: '2026-02-09', franjas: [] }));

    await tienda
      .dispatch(
        registrosApi.endpoints.registrarControl.initiate({
          tipo: 'refrigeracion',
          franjaProgramada: '07:00',
          temperatura: 3,
        }),
      )
      .unwrap();

    await vi.waitFor(() => {
      expect(fetchSimulado.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
    const urls = await Promise.all(
      fetchSimulado.mock.calls.map(([entrada]) =>
        entrada instanceof Request ? entrada.url : String(entrada),
      ),
    );
    expect(urls.filter((url) => url.includes('/controles/dia'))).toHaveLength(2);
  });

  it('propaga el conflicto cuando el control ya fue registrado', async () => {
    const tienda = store();
    fetchSimulado.mockResolvedValueOnce(
      respuesta(
        { error: { codigo: 'CONFLICT', mensaje: 'El control de 10:30 de hoy ya fue registrado.' } },
        409,
      ),
    );

    await expect(
      tienda
        .dispatch(
          registrosApi.endpoints.registrarControl.initiate({
            tipo: 'exhibicion',
            franjaProgramada: '10:30',
            temperatura: 4,
            ph: 5.6,
            tipoCarne: 'res',
          }),
        )
        .unwrap(),
    ).rejects.toMatchObject({ status: 409 });

    // Un conflicto no cierra la sesión.
    expect(tienda.getState().auth.token).toBe('tok-123');
  });
});
