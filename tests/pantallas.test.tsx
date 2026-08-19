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
  horariosExhibicion: ['07:00', '10:30', '13:30'],
  horariosRefrigeracion: ['07:00', '13:30'],
  toleranciaMinutos: 15,
  diasAvisoPlagas: [7, 3, 1, 0],
  diasAvisoMantenimiento: 15,
  puntosLimpieza: ['Higiene del personal', 'Limpieza del piso'],
  puntosInspeccionMercado: ['Pasillos limpios'],
  puntosInspeccionPuesto: ['Limpieza — mesones'],
};

const diaVacio: DiaDeControles = {
  dia: '2026-08-18',
  franjas: [
    {
      tipo: 'exhibicion',
      franjaProgramada: '07:00',
      estado: 'no_realizado',
      semaforo: 'rojo',
      registro: null,
    },
    {
      tipo: 'exhibicion',
      franjaProgramada: '10:30',
      estado: 'pendiente',
      semaforo: 'gris',
      registro: null,
    },
    {
      tipo: 'exhibicion',
      franjaProgramada: '13:30',
      estado: 'pendiente',
      semaforo: 'gris',
      registro: null,
    },
    {
      tipo: 'refrigeracion',
      franjaProgramada: '07:00',
      estado: 'no_realizado',
      semaforo: 'rojo',
      registro: null,
    },
    {
      tipo: 'refrigeracion',
      franjaProgramada: '13:30',
      estado: 'pendiente',
      semaforo: 'gris',
      registro: null,
    },
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

  it('avisa cuando hay un control no realizado', async () => {
    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    expect(
      await screen.findByText('Hay un control no realizado o fuera de rango'),
    ).toBeInTheDocument();
  });

  it('destaca el control que toca ahora', async () => {
    // La franja se sitúa en la hora local actual, dentro de la tolerancia.
    const horaAhora = new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());

    vi.stubGlobal(
      'fetch',
      apiSimulada({
        '/api/controles/dia': {
          dia: '2026-08-18',
          franjas: [
            {
              tipo: 'exhibicion',
              franjaProgramada: horaAhora,
              estado: 'pendiente',
              semaforo: 'gris',
              registro: null,
            },
          ],
        },
      }),
    );

    renderizar(<App />, { ruta: '/inicio', estado: conSesion() });

    // El servidor devolvió "pendiente"; la interfaz lo afina a "le toca ahora".
    expect(await screen.findByText('Le toca ahora')).toBeInTheDocument();
  });
});

describe('control de exhibición', () => {
  it('lista las tres franjas con su estado', async () => {
    renderizar(<App />, { ruta: '/exhibicion', estado: conSesion() });

    expect(await screen.findByText('07:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('13:30')).toBeInTheDocument();
    expect(screen.getByText('No realizado')).toBeInTheDocument();
    expect(screen.getAllByText('Más tarde')).toHaveLength(2);
  });

  it('valida la temperatura mientras se escribe', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/refrigeracion/07%3A00', estado: conSesion() });

    const campo = await screen.findByLabelText('Temperatura de la cámara (°C)');

    await usuario.type(campo, '3.5');
    expect(await screen.findByText(/3,5 °C está dentro del rango/)).toBeInTheDocument();

    await usuario.clear(campo);
    await usuario.type(campo, '8');
    expect(await screen.findByText(/8 °C está FUERA del rango/)).toBeInTheDocument();
  });

  it('el control de refrigeración no pide pH', async () => {
    renderizar(<App />, { ruta: '/refrigeracion/07%3A00', estado: conSesion() });

    await screen.findByLabelText('Temperatura de la cámara (°C)');
    expect(screen.queryByLabelText('pH')).not.toBeInTheDocument();
  });

  it('el de exhibición pide pH y no lo deja escribir sin tipo de carne', async () => {
    renderizar(<App />, { ruta: '/exhibicion/10%3A30', estado: conSesion() });

    expect(await screen.findByLabelText('pH')).toBeDisabled();
    expect(screen.getByText('Elija primero el tipo de carne')).toBeInTheDocument();
  });

  it('avisa cómo quedará el registro antes de guardarlo', async () => {
    renderizar(<App />, { ruta: '/exhibicion/10%3A30', estado: conSesion() });

    expect(await screen.findByText(/quedará (A TIEMPO|CON RETRASO)/)).toBeInTheDocument();
  });

  it('enumera lo que falta en lugar de fallar sin explicación', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/exhibicion/10%3A30', estado: conSesion() });

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
