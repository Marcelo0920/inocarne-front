import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import type { Configuracion, Dashboard, NoConformidad } from '@/types/dominio';
import { conSesion, renderizar, SUPERVISORA } from './helpers/render';

const configuracion: Configuracion = {
  temperaturaMaxima: 5,
  rangoPhRojas: { min: 5.4, max: 5.8 },
  rangoPhPollo: { min: 5.8, max: 6.2 },
  horariosExhibicion: ['07:00', '10:30'],
  horariosRefrigeracion: ['07:00'],
  toleranciaMinutos: 15,
  diasAvisoPlagas: [7, 3, 1, 0],
  diasAvisoMantenimiento: 15,
  puntosLimpieza: ['Higiene del personal'],
  puntosInspeccionMercado: ['Pasillos limpios', 'Sanitarios limpios'],
  puntosInspeccionPuesto: ['Limpieza — mesones', 'Utensilios — cuchillos'],
};

const dashboard: Dashboard = {
  dia: '2026-08-18',
  columnas: [
    { clave: 'recepcion', etiqueta: 'Recep.', grupo: 'Recepción' },
    { clave: 'exhibicion-07:00', etiqueta: '07:00', grupo: 'Exhibición' },
  ],
  filas: [
    {
      puestoId: 'p1',
      numero: 1,
      nombre: 'Puesto 1',
      semaforo: 'verde',
      problemas: [],
      celdas: [
        {
          clave: 'recepcion',
          etiqueta: 'Recepción',
          semaforo: 'verde',
          estado: 'registrado',
          detalle: 'Aceptada 05:20 · 3,1 °C',
        },
        {
          clave: 'exhibicion-07:00',
          etiqueta: '07:00',
          semaforo: 'verde',
          estado: 'a_tiempo',
          detalle: 'A tiempo 07:05',
        },
      ],
    },
    {
      puestoId: 'p5',
      numero: 5,
      nombre: 'Puesto 5',
      semaforo: 'rojo',
      problemas: ['Recepción rechazada: olor no característico', 'Control de 07:00 no realizado'],
      celdas: [
        {
          clave: 'recepcion',
          etiqueta: 'Recepción',
          semaforo: 'rojo',
          estado: 'registrado',
          detalle: 'RECHAZADA 05:35',
        },
        {
          clave: 'exhibicion-07:00',
          etiqueta: '07:00',
          semaforo: 'rojo',
          estado: 'no_realizado',
          detalle: 'No realizado',
        },
      ],
    },
  ],
  resumen: {
    puestos: 2,
    conformes: 1,
    conAtencion: 0,
    conIncumplimiento: 1,
    noConformidadesAbiertas: 2,
    noConformidadesVencidas: 1,
    mantenimientosVencidos: 1,
  },
};

const noConformidad: NoConformidad = {
  id: 'nc1',
  numero: 15,
  puestoId: 'p5',
  supervisorId: 'u2',
  hallazgo: 'Limpieza — piso: piso con residuos',
  origen: 'Inspección de puesto',
  detectadaEn: '2026-08-18T12:05:00.000Z',
  evidencia: [],
  accionCorrectiva: null,
  responsable: null,
  fechaLimite: '2026-08-21T04:00:00.000Z',
  estado: 'pendiente',
  estadoActual: 'pendiente',
  listaParaVerificar: false,
  evidenciaCierre: [],
};

const paginado = <T,>(datos: T[]) => ({
  data: datos,
  meta: { page: 1, limit: 50, total: datos.length, totalPages: 1 },
});

function apiSimulada(respuestas: Record<string, unknown> = {}) {
  return vi.fn(async (entrada: Request | string) => {
    const url = entrada instanceof Request ? entrada.url : String(entrada);
    const ruta = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? '';

    const porDefecto: Record<string, unknown> = {
      '/api/configuracion': configuracion,
      '/api/dashboard': dashboard,
      '/api/no-conformidades': paginado([noConformidad]),
      '/api/no-conformidades/nc1': noConformidad,
      '/api/equipos': [],
      '/api/inspecciones/plantillas': {
        mercado: configuracion.puntosInspeccionMercado,
        puesto: configuracion.puntosInspeccionPuesto,
      },
      '/api/archivos/estado': { configurado: true },
      '/api/historial': paginado([]),
      '/api/capacitaciones': paginado([]),
      '/api/control-plagas': paginado([]),
      '/api/puestos': [
        { id: 'p1', numero: 1, nombre: 'Puesto 1', activo: true },
        { id: 'p5', numero: 5, nombre: 'Puesto 5', activo: true },
      ],
      '/api/usuarios': [
        {
          id: 'u2',
          nombre: 'María Rojas',
          usuario: 'supervisora',
          rol: 'supervisor',
          puestoId: null,
          activo: true,
        },
        {
          id: 'u9',
          nombre: 'Juan Pérez',
          usuario: 'puesto5',
          rol: 'puesto',
          puestoId: 'p5',
          activo: true,
        },
      ],
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

const comoSupervisora = { estado: conSesion(SUPERVISORA) };

describe('panel general', () => {
  it('muestra el resumen y los puestos', async () => {
    renderizar(<App />, { ruta: '/panel', ...comoSupervisora });

    expect(await screen.findByText('Panel general de control')).toBeInTheDocument();
    expect(screen.getAllByText('Puesto 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Puesto 5').length).toBeGreaterThan(0);
    expect(screen.getByText('Puestos en regla')).toBeInTheDocument();
  });

  it('el color nunca va solo: cada punto lleva su explicación', async () => {
    renderizar(<App />, { ruta: '/panel', ...comoSupervisora });

    await screen.findByText('Panel general de control');
    expect(screen.getAllByLabelText(/Todo en regla: Aceptada 05:20/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Incumplimiento: RECHAZADA 05:35/).length).toBeGreaterThan(0);
  });

  it('al abrir un puesto explica exactamente qué falla', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/panel', ...comoSupervisora });

    await screen.findByText('Panel general de control');
    const filas = screen.getAllByRole('button', { name: /Puesto 5/ });
    await usuario.click(filas[0]!);

    expect(await screen.findByText('Puesto 5 — detalle del día')).toBeInTheDocument();
    expect(screen.getByText('Recepción rechazada: olor no característico')).toBeInTheDocument();
    expect(screen.getByText('Control de 07:00 no realizado')).toBeInTheDocument();
  });
});

describe('inspección por puesto', () => {
  it('avisa que un "No cumple" generará la acción correctiva', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/inspeccion/puesto', ...comoSupervisora });

    const fila = (await screen.findByText('Limpieza — mesones')).closest('div')!.parentElement!;
    await usuario.click(within(fila).getByRole('button', { name: 'No cumple' }));

    expect(
      await screen.findByText(/generarán su acción correctiva al guardar/),
    ).toBeInTheDocument();
  });

  it('marcar "No cumple" abre el campo del hallazgo', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/inspeccion/puesto', ...comoSupervisora });

    const fila = (await screen.findByText('Limpieza — mesones')).closest('div')!.parentElement!;
    await usuario.click(within(fila).getByRole('button', { name: 'No cumple' }));

    expect(await screen.findByLabelText('Descripción de la no conformidad')).toBeInTheDocument();
  });

  it('arranca con el primer puesto ya elegido', async () => {
    renderizar(<App />, { ruta: '/inspeccion/puesto', ...comoSupervisora });

    const primero = await screen.findByRole('radio', { name: 'Puesto 1' });
    expect(primero).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Puesto 5' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('no deja guardar con el checklist a medias', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/inspeccion/puesto', ...comoSupervisora });

    await usuario.click(await screen.findByRole('button', { name: /Guardar inspección/ }));

    expect(
      await screen.findByText('marcar los 2 puntos que faltan del checklist'),
    ).toBeInTheDocument();
    expect(screen.queryByText('el puesto a inspeccionar')).toBeNull();
  });

  it('la inspección del mercado no pide puesto', async () => {
    renderizar(<App />, { ruta: '/inspeccion/mercado', ...comoSupervisora });

    expect(
      await screen.findByText('Inspección de condiciones generales del mercado'),
    ).toBeInTheDocument();
    expect(screen.getByText('Pasillos limpios')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Puesto a inspeccionar' })).toBeNull();
  });
});

describe('acciones correctivas', () => {
  it('lista las acciones con su número legible', async () => {
    renderizar(<App />, { ruta: '/acciones', ...comoSupervisora });

    expect(await screen.findByText('NC-2026-015')).toBeInTheDocument();
    expect(screen.getByText(/Limpieza — piso/)).toBeInTheDocument();
  });

  it('no permite cerrar antes de registrar la acción correctiva', async () => {
    renderizar(<App />, { ruta: '/acciones/nc1', ...comoSupervisora });

    const cerrar = await screen.findByRole('button', { name: /Verificar y cerrar/ });
    expect(cerrar).toBeDisabled();
    expect(screen.getByText(/hay que registrar cuál fue la acción correctiva/)).toBeInTheDocument();
  });

  it('avisa cuando el responsable ya adjuntó la evidencia', async () => {
    vi.stubGlobal(
      'fetch',
      apiSimulada({
        '/api/no-conformidades/nc1': {
          ...noConformidad,
          accionCorrectiva: 'Limpieza profunda del piso',
          estado: 'en_proceso',
          estadoActual: 'en_proceso',
          listaParaVerificar: true,
          evidenciaCierre: [{ url: 'https://x/y.jpg', publicId: 'y' }],
        },
      }),
    );

    renderizar(<App />, { ruta: '/acciones/nc1', ...comoSupervisora });

    expect(
      await screen.findByText(/El responsable adjuntó una evidencia de la ejecución/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verificar y cerrar/ })).toBeEnabled();
  });
});

describe('puestos y vendedores', () => {
  it('un supervisor que abre la configuración vuelve al panel', async () => {
    renderizar(<App />, { ruta: '/admin/configuracion', ...comoSupervisora });

    expect(await screen.findByText('Panel general de control')).toBeInTheDocument();
  });

  it('abre en la pestaña de puestos y muestra quién atiende cada uno', async () => {
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    expect(await principal.findByText('Puesto 5')).toBeInTheDocument();
    // El vínculo puesto ↔ vendedor tiene que verse.
    expect(principal.getByText('Juan Pérez · puesto5')).toBeInTheDocument();
    expect(principal.getByText('Sin vendedor asignado')).toBeInTheDocument();
    expect(principal.getByText('Atendido')).toBeInTheDocument();
    expect(principal.getByText('Libre')).toBeInTheDocument();
  });

  it('la pestaña de vendedores lista solo vendedores', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Vendedores/ }));

    expect(await principal.findByText('Juan Pérez')).toBeInTheDocument();
    // La supervisora no es vendedora: no pertenece a esta lista.
    expect(principal.queryByText('María Rojas')).toBeNull();
  });

  it('al supervisor no le muestra la pestaña de supervisión', async () => {
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await principal.findByRole('tab', { name: /Puestos/ });
    expect(principal.queryByRole('tab', { name: /Supervisión/ })).toBeNull();
  });

  it('el administrador sí tiene la pestaña de supervisión', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', estado: conSesion({ ...SUPERVISORA, rol: 'admin' }) });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Supervisión/ }));

    expect(await principal.findByText('María Rojas')).toBeInTheDocument();
    expect(principal.queryByText('Juan Pérez')).toBeNull();
  });

  it('los formularios no ocupan la pantalla hasta que se piden', async () => {
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    await screen.findByRole('main');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByLabelText('Contraseña inicial')).toBeNull();
  });

  it('el botón abre el alta de puesto en un modal y Escape lo cierra', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo puesto' }));

    const modal = within(await screen.findByRole('dialog'));
    expect(modal.getByLabelText('Número')).toBeInTheDocument();

    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('solo ofrece los puestos que no tienen vendedor', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Vendedores/ }));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo vendedor' }));

    const modal = within(await screen.findByRole('dialog'));
    const opciones = modal.getByRole('radiogroup', { name: 'Puesto asignado' });
    // El puesto 5 ya está atendido; solo queda el 1.
    expect(within(opciones).getByRole('radio', { name: 'Puesto 1' })).toBeInTheDocument();
    expect(within(opciones).queryByRole('radio', { name: 'Puesto 5' })).toBeNull();
  });

  it('explica qué hacer cuando todos los puestos están atendidos', async () => {
    vi.stubGlobal(
      'fetch',
      apiSimulada({
        '/api/puestos': [{ id: 'p5', numero: 5, nombre: 'Puesto 5', activo: true }],
      }),
    );
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Vendedores/ }));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo vendedor' }));

    const modal = within(await screen.findByRole('dialog'));
    expect(modal.getByText(/Todos los puestos activos ya tienen vendedor/)).toBeInTheDocument();
  });

  it('al supervisor no le ofrece elegir el rol', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Vendedores/ }));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo vendedor' }));

    const modal = within(await screen.findByRole('dialog'));
    expect(modal.queryByRole('radiogroup', { name: 'Rol del usuario' })).toBeNull();
  });
});

describe('foco dentro del modal', () => {
  it('al abrirse enfoca el primer campo, no la cruz de cerrar', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo puesto' }));

    const modal = within(await screen.findByRole('dialog'));
    expect(modal.getByLabelText('Número')).toHaveFocus();
  });

  it('escribir no roba el foco: se puede tipear de corrido', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo puesto' }));

    const modal = within(await screen.findByRole('dialog'));
    const nombre = modal.getByLabelText('Nombre');

    await usuario.click(nombre);
    await usuario.type(nombre, 'Puesto del fondo');

    // Antes el foco saltaba a la cruz tras la primera tecla y se perdía el resto.
    expect(nombre).toHaveFocus();
    expect(nombre).toHaveValue('Puesto del fondo');
  });

  it('lo mismo en el alta de vendedor', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    await usuario.click(await principal.findByRole('tab', { name: /Vendedores/ }));
    await usuario.click(await principal.findByRole('button', { name: 'Nuevo vendedor' }));

    const modal = within(await screen.findByRole('dialog'));
    const nombre = modal.getByLabelText('Nombre completo');

    expect(nombre).toHaveFocus();
    await usuario.type(nombre, 'Ana Quispe');

    expect(nombre).toHaveFocus();
    expect(nombre).toHaveValue('Ana Quispe');
  });

  it('al cerrar devuelve el foco al botón que lo abrió', async () => {
    const usuario = userEvent.setup();
    renderizar(<App />, { ruta: '/usuarios', ...comoSupervisora });

    const principal = within(await screen.findByRole('main'));
    const abrir = await principal.findByRole('button', { name: 'Nuevo puesto' });
    await usuario.click(abrir);
    await screen.findByRole('dialog');

    await usuario.keyboard('{Escape}');

    expect(abrir).toHaveFocus();
  });
});
