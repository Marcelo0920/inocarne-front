import { describe, expect, it } from 'vitest';
import {
  colaReducer,
  colaVaciada,
  conexionCambiada,
  descartado,
  encolado,
  enviado,
  envioIniciado,
  intentoFallido,
  MAXIMO_INTENTOS,
  selectAvisoPendientes,
  selectCantidadPendientes,
  selectHayPendientes,
  type EstadoCola,
} from '@/features/conexion/colaSlice';

const vacia: EstadoCola = { pendientes: [], enviando: false, enLinea: true };

const unControl = {
  tipo: 'control' as const,
  url: '/controles',
  cuerpo: { tipo: 'exhibicion', franjaProgramada: '10:30', temperatura: 4 },
  descripcion: 'Control de exhibición 10:30',
};

describe('cola de registros pendientes', () => {
  it('encola un registro que no se pudo enviar', () => {
    const estado = colaReducer(vacia, encolado(unControl));

    expect(estado.pendientes).toHaveLength(1);
    expect(estado.pendientes[0]).toMatchObject({
      tipo: 'control',
      url: '/controles',
      metodo: 'POST',
      intentos: 0,
      ultimoError: null,
    });
    expect(estado.pendientes[0]?.id).toEqual(expect.any(String));
    expect(estado.pendientes[0]?.creadoEn).toEqual(expect.any(Number));
  });

  it('no guarda fecha ni hora propias: las pone el servidor al recibirlo', () => {
    const estado = colaReducer(vacia, encolado(unControl));

    expect(JSON.stringify(estado.pendientes[0]?.cuerpo)).not.toMatch(/registradoEn|fecha|hora/i);
  });

  it('conserva el orden de llegada', () => {
    let estado = colaReducer(vacia, encolado({ ...unControl, descripcion: 'primero' }));
    estado = colaReducer(estado, encolado({ ...unControl, descripcion: 'segundo' }));

    expect(estado.pendientes.map((p) => p.descripcion)).toEqual(['primero', 'segundo']);
  });

  it('quita el registro cuando se envía', () => {
    const conUno = colaReducer(vacia, encolado(unControl));
    const id = conUno.pendientes[0]!.id;

    expect(colaReducer(conUno, enviado(id)).pendientes).toHaveLength(0);
  });

  it('mantiene en la cola un fallo reintentable y anota el motivo', () => {
    const conUno = colaReducer(vacia, encolado(unControl));
    const id = conUno.pendientes[0]!.id;

    const estado = colaReducer(
      conUno,
      intentoFallido({ id, error: 'No hay conexión.', reintentable: true }),
    );

    expect(estado.pendientes).toHaveLength(1);
    expect(estado.pendientes[0]?.intentos).toBe(1);
    expect(estado.pendientes[0]?.ultimoError).toBe('No hay conexión.');
  });

  it('descarta lo que el servidor rechazó: reintentarlo no cambiaría nada', () => {
    const conUno = colaReducer(vacia, encolado(unControl));
    const id = conUno.pendientes[0]!.id;

    const estado = colaReducer(
      conUno,
      intentoFallido({ id, error: 'Los datos enviados no son válidos.', reintentable: false }),
    );

    expect(estado.pendientes).toHaveLength(0);
  });

  it('abandona un registro tras demasiados intentos', () => {
    let estado = colaReducer(vacia, encolado(unControl));
    const id = estado.pendientes[0]!.id;

    for (let intento = 0; intento < MAXIMO_INTENTOS; intento += 1) {
      estado = colaReducer(estado, intentoFallido({ id, error: 'sin red', reintentable: true }));
    }

    expect(estado.pendientes).toHaveLength(0);
  });

  it('el vendedor puede descartar un pendiente', () => {
    const conUno = colaReducer(vacia, encolado(unControl));
    const id = conUno.pendientes[0]!.id;

    expect(colaReducer(conUno, descartado(id)).pendientes).toHaveLength(0);
  });

  it('registra los cambios de conexión', () => {
    expect(colaReducer(vacia, conexionCambiada(false)).enLinea).toBe(false);
    expect(colaReducer(vacia, conexionCambiada(true)).enLinea).toBe(true);
  });

  it('vaciar la cola también detiene el envío en curso', () => {
    let estado = colaReducer(vacia, encolado(unControl));
    estado = colaReducer(estado, envioIniciado());
    const vaciada = colaReducer(estado, colaVaciada());

    expect(vaciada.pendientes).toHaveLength(0);
    expect(vaciada.enviando).toBe(false);
  });
});

describe('avisos al vendedor', () => {
  const conCola = (cola: EstadoCola) => ({ cola });

  it('sin pendientes no muestra nada', () => {
    const estado = conCola(vacia);

    expect(selectHayPendientes(estado)).toBe(false);
    expect(selectAvisoPendientes(estado)).toBeNull();
  });

  it('sin conexión avisa que el envío es automático', () => {
    const cola = colaReducer(colaReducer(vacia, encolado(unControl)), conexionCambiada(false));
    const estado = conCola(cola);

    expect(selectCantidadPendientes(estado)).toBe(1);
    expect(selectAvisoPendientes(estado)).toMatch(/esperando conexión/i);
    expect(selectAvisoPendientes(estado)).toMatch(/se enviarán solos/i);
  });

  it('con conexión avisa que se están enviando', () => {
    const cola = colaReducer(vacia, encolado(unControl));

    expect(selectAvisoPendientes(conCola(cola))).toMatch(/Enviando 1 registro/);
  });
});
