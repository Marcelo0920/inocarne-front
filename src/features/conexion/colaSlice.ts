import { createSelector, createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Cola local de registros pendientes de envío.
 *
 * La señal dentro del mercado es inestable y un control puede perderse al
 * enviarse. En lugar de descartarlo, el registro se guarda aquí y se reintenta
 * cuando vuelve la conexión. La fecha y la hora las sigue poniendo el servidor
 * al recibirlo, así que lo encolado nunca lleva marca de tiempo propia; sí se
 * guarda `creadoEn` para poder avisar al vendedor de cuánto lleva esperando.
 */

export type TipoPendiente = 'recepcion' | 'control' | 'limpieza' | 'mantenimiento' | 'inspeccion';

export interface RegistroPendiente {
  id: string;
  tipo: TipoPendiente;
  /** Ruta de la API, relativa a `/api`. */
  url: string;
  metodo: 'POST' | 'PATCH';
  cuerpo: unknown;
  /** Texto corto para mostrar en la lista de pendientes. */
  descripcion: string;
  creadoEn: number;
  intentos: number;
  ultimoError: string | null;
}

export interface EstadoCola {
  pendientes: RegistroPendiente[];
  enviando: boolean;
  /** `false` cuando el navegador informa que no hay red. */
  enLinea: boolean;
}

/** Un registro se descarta tras demasiados intentos fallidos, para no reintentar en vano. */
export const MAXIMO_INTENTOS = 5;

const estadoInicial: EstadoCola = {
  pendientes: [],
  enviando: false,
  enLinea: true,
};

export const colaSlice = createSlice({
  name: 'cola',
  initialState: estadoInicial,
  reducers: {
    /** Guarda un registro que no se pudo enviar. */
    encolado: {
      reducer: (state, action: PayloadAction<RegistroPendiente>) => {
        state.pendientes.push(action.payload);
      },
      prepare: (entrada: {
        tipo: TipoPendiente;
        url: string;
        metodo?: 'POST' | 'PATCH';
        cuerpo: unknown;
        descripcion: string;
      }) => ({
        payload: {
          id: nanoid(),
          tipo: entrada.tipo,
          url: entrada.url,
          metodo: entrada.metodo ?? ('POST' as const),
          cuerpo: entrada.cuerpo,
          descripcion: entrada.descripcion,
          creadoEn: Date.now(),
          intentos: 0,
          ultimoError: null,
        },
      }),
    },

    /** El registro llegó al servidor: sale de la cola. */
    enviado: (state, action: PayloadAction<string>) => {
      state.pendientes = state.pendientes.filter((registro) => registro.id !== action.payload);
    },

    /**
     * Falló un intento. Si el servidor rechazó el contenido (un 4xx que no sea
     * de conexión) no tiene sentido reintentar: se descarta con su motivo.
     */
    intentoFallido: (
      state,
      action: PayloadAction<{ id: string; error: string; reintentable: boolean }>,
    ) => {
      const registro = state.pendientes.find((p) => p.id === action.payload.id);
      if (!registro) return;

      registro.intentos += 1;
      registro.ultimoError = action.payload.error;

      const agotado = registro.intentos >= MAXIMO_INTENTOS;
      if (!action.payload.reintentable || agotado) {
        state.pendientes = state.pendientes.filter((p) => p.id !== action.payload.id);
      }
    },

    /** El vendedor descarta un pendiente que ya no corresponde enviar. */
    descartado: (state, action: PayloadAction<string>) => {
      state.pendientes = state.pendientes.filter((registro) => registro.id !== action.payload);
    },

    envioIniciado: (state) => {
      state.enviando = true;
    },

    envioTerminado: (state) => {
      state.enviando = false;
    },

    conexionCambiada: (state, action: PayloadAction<boolean>) => {
      state.enLinea = action.payload;
    },

    colaVaciada: (state) => {
      state.pendientes = [];
      state.enviando = false;
    },
  },
});

export const {
  encolado,
  enviado,
  intentoFallido,
  descartado,
  envioIniciado,
  envioTerminado,
  conexionCambiada,
  colaVaciada,
} = colaSlice.actions;

export const colaReducer = colaSlice.reducer;

// ── Selectores ────────────────────────────────────────────────

interface ConCola {
  cola: EstadoCola;
}

export const selectCola = (state: ConCola): EstadoCola => state.cola;
export const selectPendientes = (state: ConCola): RegistroPendiente[] => state.cola.pendientes;
export const selectEnLinea = (state: ConCola): boolean => state.cola.enLinea;
export const selectEnviando = (state: ConCola): boolean => state.cola.enviando;

export const selectCantidadPendientes = createSelector(
  [selectPendientes],
  (pendientes): number => pendientes.length,
);

export const selectHayPendientes = createSelector(
  [selectCantidadPendientes],
  (cantidad): boolean => cantidad > 0,
);

/** Aviso para la barra superior: "2 registros esperando conexión". */
export const selectAvisoPendientes = createSelector(
  [selectCantidadPendientes, selectEnLinea],
  (cantidad, enLinea): string | null => {
    if (cantidad === 0) return null;
    const plural = cantidad === 1 ? 'registro' : 'registros';
    return enLinea
      ? `Enviando ${cantidad} ${plural} pendiente(s)...`
      : `${cantidad} ${plural} esperando conexión. Se enviarán solos al recuperarla.`;
  },
);
