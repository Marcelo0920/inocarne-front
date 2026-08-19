import { useNavigate } from 'react-router-dom';
import { useConfiguracionQuery } from '@/services/endpoints/catalogos';
import { useDiaDeControlesQuery } from '@/services/endpoints/registros';
import { Boton, CabeceraAtras, Cargando, Chip, Mensaje, Tarjeta } from '@/componentes';
import { afinarEstado, etiquetaDeFranja } from '@/domain/franjas';
import type { TipoControl } from '@/types/dominio';
import estilos from './Formulario.module.css';

interface Props {
  tipo: TipoControl;
}

const TITULOS: Record<TipoControl, { titulo: string; ruta: string }> = {
  exhibicion: { titulo: 'Control de exhibición', ruta: '/exhibicion' },
  refrigeracion: { titulo: 'Refrigeración', ruta: '/refrigeracion' },
};

/**
 * Franjas del día para un tipo de control.
 *
 * Cada tarjeta dice en qué estado está y solo ofrece registrar lo que todavía
 * no se registró: un control ya guardado no se puede repetir ni corregir.
 */
export function Controles({ tipo }: Props) {
  const navegar = useNavigate();
  const { data: configuracion } = useConfiguracionQuery();
  const { data: dia, isLoading, isError, refetch } = useDiaDeControlesQuery();

  const { titulo, ruta } = TITULOS[tipo];
  const tolerancia = configuracion?.toleranciaMinutos ?? 15;

  const horarios =
    tipo === 'exhibicion'
      ? (configuracion?.horariosExhibicion ?? [])
      : (configuracion?.horariosRefrigeracion ?? []);

  const subtitulo =
    horarios.length > 0
      ? `${horarios.length === 1 ? 'Un control' : `${horarios.length} controles`} al día: ${horarios.join(', ')}`
      : '';

  if (isLoading) {
    return (
      <div>
        <CabeceraAtras titulo={titulo} volverA="/inicio" />
        <Cargando />
      </div>
    );
  }

  if (isError || !dia) {
    return (
      <div>
        <CabeceraAtras titulo={titulo} volverA="/inicio" />
        <Mensaje tipo="error">No se pudieron cargar los controles del día.</Mensaje>
        <Boton variante="secundario" anchoCompleto onClick={() => void refetch()}>
          Reintentar
        </Boton>
      </div>
    );
  }

  const franjas = dia.franjas.filter((franja) => franja.tipo === tipo);

  return (
    <div>
      <CabeceraAtras titulo={titulo} volverA="/inicio" />
      <p className={estilos.subtitulo}>{subtitulo}</p>

      <div className={estilos.lista}>
        {franjas.map((franja) => {
          const estado = afinarEstado(franja.estado, franja.franjaProgramada, tolerancia);
          const etiqueta = etiquetaDeFranja(estado, {
            dentroRango: franja.registro?.dentroRango ?? true,
            horaRegistro: franja.registro
              ? new Intl.DateTimeFormat('es-BO', {
                  timeZone: 'America/La_Paz',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(new Date(franja.registro.registradoEn))
              : undefined,
            toleranciaMinutos: tolerancia,
          });

          return (
            <Tarjeta key={franja.franjaProgramada} destacada={etiqueta.destacada}>
              <div className={estilos.filaFranja}>
                <div className={estilos.hora}>{franja.franjaProgramada}</div>
                <div className={estilos.franjaCentro}>
                  <Chip tono={etiqueta.tono}>{etiqueta.texto}</Chip>
                  <span className={estilos.franjaDetalle}>{etiqueta.detalle}</span>
                </div>
                {etiqueta.registrable && (
                  <Boton
                    compacto
                    onClick={() =>
                      navegar(`${ruta}/${encodeURIComponent(franja.franjaProgramada)}`)
                    }
                  >
                    Registrar
                  </Boton>
                )}
              </div>
            </Tarjeta>
          );
        })}
      </div>
    </div>
  );
}
