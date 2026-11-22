import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import type { Configuracion, DiaDeControles } from '@/types/dominio';
import { conSesion, renderizar, SUPERVISORA } from './helpers/render';

const configuracion: Configuracion = {
  temperaturaMaxima: 5,
  rangoPhRojas: { min: 5.4, max: 5.8 },
  rangoPhPollo: { min: 5.8, max: 6.2 },
  controlesExhibicionPorDia: 3,
  controlesRefrigeracionPorDia: 2,
  diasAvisoPlagas: [7, 3, 1, 0],
  diasAvisoMantenimiento: 15,
  puntosLimpieza: ['Higiene del personal', 'Limpieza del piso'],
  puntosInspeccionMercado: ['Pasillos limpios'],
  puntosInspeccionPuesto: ['Limpieza — mesones'],
};

/** Un control del día, sin registro todavía. */
const pendiente = (tipo: 'exhibicion' | 'refrigeracion', numero: number) => ({
  tipo,
  numero,
  estado: 'pendiente' as const,
  semaforo: 'gris' as const,
  registro: null,
});

const diaVacio: DiaDeControles = {
  dia: '2026-08-18',
  controles: [
    pendiente('exhibicion', 1),
    pendiente('exhibicion', 2),
    pendiente('exhibicion', 3),
    pendiente('refrigeracion', 1),
    pendiente('refrigeracion', 2),
  ],
};

/** Control registrado: el teléfono marcó 10:05 (La Paz) y el servidor lo recibió 11:30. */
const registroFueraDeRango = {
  id: 'c1',
  puestoId: 'p1',
  usuarioId: 'u1',
  tipo: 'exhibicion' as const,
  numero: 1,
  dia: '2026-08-18',
  horaDispositivo: '2026-08-18T14:05:00.000Z',
  registradoEn: '2026-08-18T15:30:00.000Z',
  temperatura: 7.2,
  ph: 5.6,
  tipoCarne: 'res' as const,
  dentroRango: false,
  desviaciones: ['Temperatura 7,2 °C fuera de rango'],
};

const diaConUnRegistro: DiaDeControles = {
  dia: '2026-08-18',
  controles: [
    {
      ...pendiente('exhibicion', 1),
      estado: 'realizado',
      semaforo: 'rojo',
      registro: registroFueraDeRango,
    },
    pendiente('exhibicion', 2),
    pendiente('exhibicion', 3),
    pendiente('refrigeracion', 1),
    pendiente('refrigeracion', 2),
  ],
};

const vacioPaginado = { data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } };

/** Responde a cada ruta de la API con datos de prueba. */
function apiSimulada(respuestas: Record<string, unknown> = {}) {
  return vi.fn(async (entrada: Request | string) => {
    const url = entrada instanceof Request ? entrada.url : String(entrada);
    const ruta = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';

    const porDefecto: Record<string, unknown> = {
      '/api/configuracion': configuracion,
      '/api/controles/dia': diaVacio,
      '/api/limpiezas/dia': { dia: '2026-08-18', turnos: [] },
      '/api/limpiezas/plantilla': { puntos: configuracion.puntosLimpieza },
      '/api/recepciones': vacioPaginado,
      '/api/equipos': [],
      '/api/notificaciones/sin-leer': { total: 2 },
      '/api/no-conformidades': vacioPaginado,
      '/api/archivos/estado': { configurado: true },
    };

    const cuerpo = respuestas[ruta] ?? porDefecto[ruta] ?? {};
    return new Response(JSON.stringify(cuerpo), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', apiSimulada());
});

describe('acceso según el rol', () => {
  it('sin sesión muestra el ingreso', () => {
    renderizar(<App />, { ruta: '/inicio' });

    expect(screen.getByRole('heading', { name: 'INOCARNE' })).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument();
  });

  it('avisa que la sesión expiró en lugar de dejar al usuario a ciegas', () => {
    renderizar(<App />, {
      ruta: '/ingreso',
      estado: {
        auth: { token: null, usuario: null, motivoCierre: 'La sesión expiró. Vuelva a ingresar.' },
      },
    });

    expect(screen.getByText(/La sesión expiró/)).toBeInTheDocument();
  });

  it('el vendedor entra a su inicio', async () => {
    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    expect(await screen.findByText('Puesto 3')).toBeInTheDocument();
    expect(screen.getByText('Recepción de carne')).toBeInTheDocument();
    expect(screen.getByText('Mi historial')).toBeInTheDocument();
  });

  it('un vendedor que abre el panel del supervisor va a su propia pantalla', async () => {
    renderizar(<App />, { ruta: '/panel', estado: conSesion() });

    expect(await screen.findByText('Puesto 3')).toBeInTheDocument();
  });

  it('la supervisión entra al panel, no al inicio del vendedor', async () => {
    renderizar(<App />, { ruta: '/inicio', estado: conSesion(SUPERVISORA) });

    expect(await screen.findByText('Supervisión de calidad')).toBeInTheDocument();
  });
});

describe('inicio del vendedor', () => {
  it('muestra los avisos sin leer', async () => {
    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    expect(await screen.findByText('2 avisos sin leer')).toBeInTheDocument();
  });

  it('desde el inicio se llega a la cuenta y se cierra la sesión', async () => {
    const usuario = userEvent.setup();
    const { store } = renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    await usuario.click(await screen.findByRole('button', { name: /Juan Pérez/ }));

    await usuario.click(await screen.findByRole('button', { name: 'Salir' }));
    expect(store.getState().auth.token).not.toBeNull();

    // Salir se confirma: un toque de más no debe dejar al puesto fuera.
    await usuario.click(await screen.findByRole('button', { name: 'Sí, cerrar sesión' }));
    expect(store.getState().auth.token).toBeNull();
  });

  it('avisa cuando un control quedó fuera de rango', async () => {
    vi.stubGlobal('fetch', apiSimulada({ '/api/controles/dia': diaConUnRegistro }));
    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    expect(await screen.findByText('Hay un control fuera de rango')).toBeInTheDocument();
  });

  it('sin horarios: muestra cuántos controles faltan y nunca "Le toca ahora"', async () => {
    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    expect(await screen.findByText('0 de 3 hechos')).toBeInTheDocument();
    expect(screen.getByText('0 de 2 hechos')).toBeInTheDocument();
    expect(screen.queryByText('Le toca ahora')).not.toBeInTheDocument();
  });
});

describe('control de exhibición', () => {
  it('lista los controles del día sin horarios y ofrece registrar el siguiente', async () => {
    renderizar(<App />, { ruta: '/exhibicion', estado: conSesion() });

    expect(await screen.findByText('Control 1')).toBeInTheDocument();
    expect(screen.getByText('Control 2')).toBeInTheDocument();
    expect(screen.getByText('Control 3')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Registrar' })).toHaveLength(1);
    expect(
      screen.queryByText(/A tiempo|Con retraso|Más tarde|07:00|10:30/),
    ).not.toBeInTheDocument();
  });

  it('un control registrado muestra la hora del teléfono, no la del servidor', async () => {
    vi.stubGlobal('fetch', apiSimulada({ '/api/controles/dia': diaConUnRegistro }));
    renderizar(<App />, { ruta: '/exhibicion', estado: conSesion() });

    expect(await screen.findByText('Registrado 10:05')).toBeInTheDocument();
    expect(screen.getByText('Fuera de rango')).toBeInTheDocument();
    expect(screen.queryByText(/11:30/)).not.toBeInTheDocument();
  });

  it('valida la temperatura mientras se escribe', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/refrigeracion/nuevo', estado: conSesion() });

    const campo = await screen.findByLabelText('Temperatura de la cámara (°C)');

    await usuario.type(campo, '3.5');
    expect(await screen.findByText(/3,5 °C está dentro del rango/)).toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, '8');
    expect(await screen.findByText(/8 °C está FUERA del rango/)).toBeInTheDocument();
  });

  it('el control de refrigeración no pide pH', async () => {
    renderizar(<App />, { ruta: '/refrigeracion/nuevo', estado: conSesion() });

    await screen.findByLabelText('Temperatura de la cámara (°C)');
    expect(screen.queryByLabelText('pH')).not.toBeInTheDocument();
  });

  it('el de exhibición pide pH y no lo deja escribir sin tipo de carne', async () => {
    renderizar(<App />, { ruta: '/exhibicion/nuevo', estado: conSesion() });

    expect(await screen.findByLabelText('pH')).toBeDisabled();
    expect(screen.getByText('Elija primero el tipo de carne')).toBeInTheDocument();
  });

  it('avisa que se guardará con la hora de este teléfono, sin puntualidad', async () => {
    renderizar(<App />, { ruta: '/exhibicion/nuevo', estado: conSesion() });

    expect(await screen.findByText(/hora de este teléfono/)).toBeInTheDocument();
    expect(screen.queryByText(/A TIEMPO|CON RETRASO/)).not.toBeInTheDocument();
  });

  it('envía la hora del teléfono del momento de guardar', async () => {
    const usuario = userEvent.setup();
    const api = apiSimulada();
    vi.stubGlobal('fetch', api);
    renderizar(<App />, { ruta: '/refrigeracion/nuevo', estado: conSesion() });

    await usuario.type(await screen.findByLabelText('Temperatura de la cámara (°C)'), '3');
    const antes = Date.now();
    await usuario.click(screen.getByRole('button', { name: 'Guardar control' }));

    const envio = await waitFor(() => {
      const llamada = api.mock.calls.find(
        ([entrada]) => entrada instanceof Request && entrada.method === 'POST',
      );
      expect(llamada).toBeDefined();
      return llamada![0] as Request;
    });
    const cuerpo = (await envio.clone().json()) as Record<string, unknown>;

    expect(cuerpo).toMatchObject({ tipo: 'refrigeracion', temperatura: 3 });
    expect(Math.abs(new Date(String(cuerpo.horaDispositivo)).getTime() - antes)).toBeLessThan(5000);
    expect(cuerpo).not.toHaveProperty('registradoEn');
  });

  it('enumera lo que falta en lugar de fallar sin explicación', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/exhibicion/nuevo', estado: conSesion() });

    await usuario.click(await screen.findByRole('button', { name: 'Guardar control' }));

    expect(await screen.findByText('Antes de guardar falta completar:')).toBeInTheDocument();
    expect(screen.getByText('el tipo de carne')).toBeInTheDocument();
    expect(screen.getByText('la temperatura')).toBeInTheDocument();
    expect(screen.getByText('el pH')).toBeInTheDocument();
  });
});

describe('recepción de carne', () => {
  it('deja claro que la fecha y la hora las pone el sistema', async () => {
    renderizar(<App />, { ruta: '/recepcion', estado: conSesion() });

    expect(await screen.findByText(/Fecha y hora las pone el sistema/)).toBeInTheDocument();
  });

  it('pide el motivo solo cuando la carne se rechaza', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/recepcion', estado: conSesion() });

    await screen.findByLabelText('Proveedor');
    expect(screen.queryByLabelText('Motivo del rechazo')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Rechazado' }));
    expect(await screen.findByLabelText('Motivo del rechazo')).toBeInTheDocument();
  });

  it('exige la fotografía en cuanto una condición no cumple', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/recepcion', estado: conSesion() });

    const filaOlor = (await screen.findByText('Olor')).closest('div')!.parentElement!;
    await usuario.click(within(filaOlor).getByRole('button', { name: 'Mal' }));

    expect(await screen.findByText(/la fotografía es obligatoria/i)).toBeInTheDocument();
  });
});

describe('limpieza', () => {
  it('no guarda con puntos sin marcar y dice cuántos faltan', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/limpieza/inicial', estado: conSesion() });

    await usuario.click(await screen.findByRole('button', { name: 'Guardar checklist' }));

    expect(await screen.findByText('Faltan 2 puntos por marcar.')).toBeInTheDocument();
  });
});

describe('aviso de conexión', () => {
  it('aparece cuando no hay red', async () => {
    renderizar(<App />, {
      ruta: '/inicio',
      estado: {
        ...conSesion(),
        cola: { pendientes: [], enviando: false, enLinea: false },
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
    });
  });
});
