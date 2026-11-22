import { useState } from 'react';
import {
  useActualizarConfiguracionMutation,
  useConfiguracionQuery,
} from '@/services/endpoints/catalogos';
import { normalizarError } from '@/services/baseQuery';
import { Boton, CampoTexto, Cargando, Mensaje, useToast } from '@/componentes';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

/** Rangos y controles por día: lo que el resto del sistema da por sentado. */
export function AdminConfiguracion() {
  const { mostrar } = useToast();
  const { data: configuracion, isLoading } = useConfiguracionQuery();
  const [actualizar, { isLoading: guardando }] = useActualizarConfiguracionMutation();

  const [temperatura, setTemperatura] = useState<string | null>(null);
  const [porDiaExhibicion, setPorDiaExhibicion] = useState<string | null>(null);
  const [porDiaRefrigeracion, setPorDiaRefrigeracion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !configuracion) return <Cargando />;

  const valorTemperatura = temperatura ?? String(configuracion.temperaturaMaxima);
  const valorExhibicion = porDiaExhibicion ?? String(configuracion.controlesExhibicionPorDia);
  const valorRefrigeracion =
    porDiaRefrigeracion ?? String(configuracion.controlesRefrigeracionPorDia);

  async function guardar() {
    setError(null);
    try {
      await actualizar({
        temperaturaMaxima: Number(valorTemperatura.replace(',', '.')),
        controlesExhibicionPorDia: Number(valorExhibicion),
        controlesRefrigeracionPorDia: Number(valorRefrigeracion),
      }).unwrap();
      mostrar('Configuración actualizada · los estados se recalculan solos');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  return (
    <div>
      <h1 className={estilos.titulo}>Configuración</h1>
      <p className={estilos.bajada}>
        Cambiar estos valores afecta a todos los registros que se evalúen desde ahora.
      </p>

      <div className={propios.formulario} style={{ maxWidth: 560 }}>
        <CampoTexto
          etiqueta="Temperatura máxima aceptada (°C)"
          type="number"
          value={valorTemperatura}
          onChange={(evento) => setTemperatura(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Controles de exhibición por día"
          ayuda="Sin horario fijo: el puesto los hace cuando puede"
          type="number"
          value={valorExhibicion}
          onChange={(evento) => setPorDiaExhibicion(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Controles de refrigeración por día"
          ayuda="Sin horario fijo: el puesto los hace cuando puede"
          type="number"
          value={valorRefrigeracion}
          onChange={(evento) => setPorDiaRefrigeracion(evento.target.value)}
        />

        <div>
          <div className={estilos.apagado}>Rangos de pH</div>
          <p>
            Carnes rojas: {configuracion.rangoPhRojas.min} – {configuracion.rangoPhRojas.max} ·
            Pollo: {configuracion.rangoPhPollo.min} – {configuracion.rangoPhPollo.max}
          </p>
        </div>

        {error && <Mensaje tipo="error">{error}</Mensaje>}

        <Boton anchoCompleto cargando={guardando} onClick={() => void guardar()}>
          Guardar la configuración
        </Boton>
      </div>
    </div>
  );
}
