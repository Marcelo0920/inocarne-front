import { useState } from 'react';
import {
  useActualizarConfiguracionMutation,
  useConfiguracionQuery,
} from '@/services/endpoints/catalogos';
import { normalizarError } from '@/services/baseQuery';
import { Boton, CampoTexto, Cargando, Mensaje, useToast } from '@/componentes';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

/** Rangos, horarios y tolerancia: lo que el resto del sistema da por sentado. */
export function AdminConfiguracion() {
  const { mostrar } = useToast();
  const { data: configuracion, isLoading } = useConfiguracionQuery();
  const [actualizar, { isLoading: guardando }] = useActualizarConfiguracionMutation();

  const [temperatura, setTemperatura] = useState<string | null>(null);
  const [tolerancia, setTolerancia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !configuracion) return <Cargando />;

  const valorTemperatura = temperatura ?? String(configuracion.temperaturaMaxima);
  const valorTolerancia = tolerancia ?? String(configuracion.toleranciaMinutos);

  async function guardar() {
    setError(null);
    try {
      await actualizar({
        temperaturaMaxima: Number(valorTemperatura.replace(',', '.')),
        toleranciaMinutos: Number(valorTolerancia),
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
          etiqueta="Tolerancia horaria (minutos)"
          ayuda="Antes y después del horario programado"
          type="number"
          value={valorTolerancia}
          onChange={(evento) => setTolerancia(evento.target.value)}
        />

        <div>
          <div className={estilos.apagado}>Rangos de pH</div>
          <p>
            Carnes rojas: {configuracion.rangoPhRojas.min} – {configuracion.rangoPhRojas.max} ·
            Pollo: {configuracion.rangoPhPollo.min} – {configuracion.rangoPhPollo.max}
          </p>
        </div>

        <div>
          <div className={estilos.apagado}>Horarios programados</div>
          <p>
            Exhibición: {configuracion.horariosExhibicion.join(', ')} · Refrigeración:{' '}
            {configuracion.horariosRefrigeracion.join(', ')}
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
