import { describe, expect, it } from 'vitest';
import {
  authReducer,
  avisoDeCierreLeido,
  perfilActualizado,
  selectEsAdmin,
  selectEsPuesto,
  selectEsSupervision,
  selectEtiquetaSesion,
  selectAutenticado,
  selectPuestoId,
  sesionCerrada,
  sesionIniciada,
  type EstadoAuth,
} from '@/features/auth/authSlice';
import { leerSesion } from '@/features/auth/sesionAlmacenada';
import type { Rol, Usuario } from '@/types/dominio';

const vendedor: Usuario = {
  id: 'u1',
  nombre: 'Juan Pérez',
  usuario: 'puesto7',
  rol: 'puesto',
  puestoId: 'p7',
  puesto: { id: 'p7', numero: 7, nombre: 'Puesto 7' },
};

const supervisora: Usuario = {
  id: 'u2',
  nombre: 'María Rojas',
  usuario: 'supervisor',
  rol: 'supervisor',
  puestoId: null,
};

const vacio: EstadoAuth = { token: null, usuario: null, motivoCierre: null };

const conEstado = (auth: EstadoAuth) => ({ auth });

describe('sesión', () => {
  it('guarda token y usuario al ingresar', () => {
    const estado = authReducer(vacio, sesionIniciada({ token: 'abc', usuario: vendedor }));

    expect(estado.token).toBe('abc');
    expect(estado.usuario).toEqual(vendedor);
    expect(estado.motivoCierre).toBeNull();
  });

  it('persiste la sesión para que el vendedor no reingrese al recargar', () => {
    authReducer(vacio, sesionIniciada({ token: 'abc', usuario: vendedor }));

    expect(leerSesion()).toEqual({ token: 'abc', usuario: vendedor });
  });

  it('borra la sesión guardada al salir', () => {
    const estado = authReducer(vacio, sesionIniciada({ token: 'abc', usuario: vendedor }));
    const cerrado = authReducer(estado, sesionCerrada());

    expect(cerrado.token).toBeNull();
    expect(cerrado.usuario).toBeNull();
    expect(leerSesion()).toBeNull();
  });

  it('conserva el motivo del cierre para avisarlo en el ingreso', () => {
    const estado = authReducer(vacio, sesionIniciada({ token: 'abc', usuario: vendedor }));
    const cerrado = authReducer(estado, sesionCerrada('La sesión expiró. Vuelva a ingresar.'));

    expect(cerrado.motivoCierre).toMatch(/expiró/);
    expect(authReducer(cerrado, avisoDeCierreLeido()).motivoCierre).toBeNull();
  });

  it('actualiza el perfil sin perder el token', () => {
    const estado = authReducer(vacio, sesionIniciada({ token: 'abc', usuario: vendedor }));
    const actualizado = authReducer(
      estado,
      perfilActualizado({ ...vendedor, nombre: 'Juan P. Pérez' }),
    );

    expect(actualizado.token).toBe('abc');
    expect(actualizado.usuario?.nombre).toBe('Juan P. Pérez');
    expect(leerSesion()?.usuario.nombre).toBe('Juan P. Pérez');
  });

  it('descarta una sesión guardada corrupta en lugar de romper el arranque', () => {
    localStorage.setItem('inocarne.sesion', '{ esto no es json');

    expect(leerSesion()).toBeNull();
    expect(localStorage.getItem('inocarne.sesion')).toBeNull();
  });
});

describe('permisos derivados del rol', () => {
  const estadoCon = (usuario: Usuario): EstadoAuth => ({
    token: 'abc',
    usuario,
    motivoCierre: null,
  });

  it('reconoce al usuario de puesto', () => {
    const estado = conEstado(estadoCon(vendedor));

    expect(selectAutenticado(estado)).toBe(true);
    expect(selectEsPuesto(estado)).toBe(true);
    expect(selectEsSupervision(estado)).toBe(false);
    expect(selectEsAdmin(estado)).toBe(false);
    expect(selectPuestoId(estado)).toBe('p7');
  });

  it('el supervisor y el coordinador HACCP tienen el mismo alcance', () => {
    for (const rol of ['supervisor', 'coordinador'] as Rol[]) {
      const estado = conEstado(estadoCon({ ...supervisora, rol }));

      expect(selectEsSupervision(estado)).toBe(true);
      expect(selectEsPuesto(estado)).toBe(false);
      expect(selectPuestoId(estado)).toBeNull();
    }
  });

  it('el administrador también ve todos los puestos', () => {
    const estado = conEstado(estadoCon({ ...supervisora, rol: 'admin' }));

    expect(selectEsSupervision(estado)).toBe(true);
    expect(selectEsAdmin(estado)).toBe(true);
  });

  it('sin sesión no hay permisos', () => {
    const estado = conEstado(vacio);

    expect(selectAutenticado(estado)).toBe(false);
    expect(selectEsSupervision(estado)).toBe(false);
    expect(selectEsPuesto(estado)).toBe(false);
    expect(selectEtiquetaSesion(estado)).toBe('');
  });

  it('la etiqueta de sesión muestra el puesto del vendedor', () => {
    expect(selectEtiquetaSesion(conEstado(estadoCon(vendedor)))).toBe('Puesto 7 — Juan Pérez');
    expect(selectEtiquetaSesion(conEstado(estadoCon(supervisora)))).toBe('María Rojas');
  });
});
