import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { ROLES_SUPERVISION, type Rol, type Usuario } from '@/types/dominio';
import { leerSesion, borrarSesion, guardarSesion } from './sesionAlmacenada';

export interface EstadoAuth {
  token: string | null;
  usuario: Usuario | null;
  /** Motivo por el que se cerró la sesión, para poder avisarlo al reingresar. */
  motivoCierre: string | null;
}

const sesionGuardada = leerSesion();

const estadoInicial: EstadoAuth = {
  token: sesionGuardada?.token ?? null,
  usuario: sesionGuardada?.usuario ?? null,
  motivoCierre: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState: estadoInicial,
  reducers: {
    /** Guarda la sesión tras un ingreso correcto. */
    sesionIniciada: (state, action: PayloadAction<{ token: string; usuario: Usuario }>) => {
      state.token = action.payload.token;
      state.usuario = action.payload.usuario;
      state.motivoCierre = null;
      guardarSesion(action.payload);
    },

    /** Actualiza los datos del usuario sin tocar el token. */
    perfilActualizado: (state, action: PayloadAction<Usuario>) => {
      state.usuario = action.payload;
      if (state.token) guardarSesion({ token: state.token, usuario: action.payload });
    },

    /**
     * Cierra la sesión. `motivo` permite distinguir la salida voluntaria del
     * token expirado, para mostrar el aviso correspondiente en el ingreso.
     */
    sesionCerrada: (state, action: PayloadAction<string | undefined>) => {
      state.token = null;
      state.usuario = null;
      state.motivoCierre = action.payload ?? null;
      borrarSesion();
    },

    avisoDeCierreLeido: (state) => {
      state.motivoCierre = null;
    },
  },
});

export const { sesionIniciada, perfilActualizado, sesionCerrada, avisoDeCierreLeido } =
  authSlice.actions;

export const authReducer = authSlice.reducer;

// ── Selectores ────────────────────────────────────────────────
// Cada pantalla pregunta por lo que necesita en lugar de leer el estado crudo.

interface ConAuth {
  auth: EstadoAuth;
}

export const selectAuth = (state: ConAuth): EstadoAuth => state.auth;
export const selectToken = (state: ConAuth): string | null => state.auth.token;
export const selectUsuario = (state: ConAuth): Usuario | null => state.auth.usuario;
export const selectMotivoCierre = (state: ConAuth): string | null => state.auth.motivoCierre;

export const selectAutenticado = (state: ConAuth): boolean => Boolean(state.auth.token);

export const selectRol = (state: ConAuth): Rol | null => state.auth.usuario?.rol ?? null;

/** El puesto al que pertenece el usuario, o `null` si es de supervisión. */
export const selectPuestoId = (state: ConAuth): string | null =>
  state.auth.usuario?.puestoId ?? null;

/** Supervisor, coordinador HACCP o administrador: ven todos los puestos. */
export const selectEsSupervision = createSelector(
  [selectRol],
  (rol): boolean => rol !== null && ROLES_SUPERVISION.includes(rol),
);

/** Solo el usuario de puesto registra los controles diarios. */
export const selectEsPuesto = createSelector([selectRol], (rol): boolean => rol === 'puesto');

export const selectEsAdmin = createSelector([selectRol], (rol): boolean => rol === 'admin');

/** Texto de bienvenida: nombre del vendedor y su puesto. */
export const selectEtiquetaSesion = createSelector([selectUsuario], (usuario): string => {
  if (!usuario) return '';
  return usuario.puesto ? `${usuario.puesto.nombre} — ${usuario.nombre}` : usuario.nombre;
});
