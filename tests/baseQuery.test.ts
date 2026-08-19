import { describe, expect, it } from 'vitest';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { normalizarError } from '@/services/baseQuery';

describe('mensajes de error para el vendedor', () => {
  it('un fallo de red explica que el registro no se pierde', () => {
    const error = normalizarError({ status: 'FETCH_ERROR', error: 'Failed to fetch' });

    expect(error.status).toBe('OFFLINE');
    expect(error.codigo).toBe('SIN_CONEXION');
    expect(error.mensaje).toMatch(/se enviará automáticamente/i);
  });

  it('un tiempo agotado invita a reintentar', () => {
    const error = normalizarError({ status: 'TIMEOUT_ERROR', error: 'timeout' });

    expect(error.status).toBe('OFFLINE');
    expect(error.mensaje).toMatch(/tardó demasiado/i);
  });

  it('conserva el mensaje en español que envía la API', () => {
    const respuesta: FetchBaseQueryError = {
      status: 409,
      data: {
        error: {
          codigo: 'CONFLICT',
          mensaje: 'El control de 10:30 de hoy ya fue registrado.',
        },
      },
    };

    const error = normalizarError(respuesta);

    expect(error.status).toBe(409);
    expect(error.codigo).toBe('CONFLICT');
    expect(error.mensaje).toBe('El control de 10:30 de hoy ya fue registrado.');
  });

  it('rescata el detalle por campo para señalar el formulario', () => {
    const respuesta: FetchBaseQueryError = {
      status: 400,
      data: {
        error: {
          codigo: 'BAD_REQUEST',
          mensaje: 'Los datos enviados no son válidos.',
          detalle: { ph: 'Ingrese el pH', motivoRechazo: 'Indique el motivo' },
        },
      },
    };

    const error = normalizarError(respuesta);

    expect(error.detalle).toEqual({ ph: 'Ingrese el pH', motivoRechazo: 'Indique el motivo' });
  });

  it('ignora un detalle que no sea campo → mensaje', () => {
    const respuesta: FetchBaseQueryError = {
      status: 400,
      data: {
        error: {
          codigo: 'BAD_REQUEST',
          mensaje: 'El checklist está incompleto.',
          detalle: { faltantes: ['Higiene del personal', 'Limpieza del piso'] },
        },
      },
    };

    expect(normalizarError(respuesta).detalle).toBeUndefined();
  });

  it('explica la espera del servidor dormido del plan gratuito', () => {
    for (const status of [502, 503, 504]) {
      const error = normalizarError({ status, data: null });

      expect(error.codigo).toBe('SERVIDOR_NO_DISPONIBLE');
      expect(error.mensaje).toMatch(/iniciándose/i);
    }
  });

  it('cae en un mensaje genérico ante una respuesta inesperada', () => {
    const error = normalizarError({ status: 500, data: 'algo salió mal' });

    expect(error.codigo).toBe('ERROR');
    expect(error.mensaje).toMatch(/error inesperado/i);
  });
});
