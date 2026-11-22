import { useNavigate } from 'react-router-dom';
import { useDiaDeControlesQuery } from '@/services/endpoints/registros';
import { Boton, CabeceraAtras, Cargando, Chip, Mensaje, Tarjeta } from '@/componentes';
import { etiquetaDeControl, horaLocal } from '@/domain/franjas';
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
 * Controles del día para un tipo de control.
 *
 * No tienen horario: el vendedor los hace cuando puede. Cada tarjeta dice si
 * está hecho y a qué hora lo marcó su teléfono, y solo se ofrece registrar el
 * siguiente que falta: un control ya guardado no se puede repetir ni corregir.
 */
export function Controles({ tipo }: Props) {
  const navegar = useNavigate();
  const { data: dia, isLoading, isError, refetch } = useDiaDeControlesQuery();

  const { titulo, ruta } = TITULOS[tipo];

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

  const controles = dia.controles.filter((control) => control.tipo === tipo);
  const siguiente = controles.find((control) => control.estado === 'pendiente')?.numero;
  const subtitulo =
    controles.length === 1
      ? 'Un control al día, a la hora que pueda'
      : `${controles.length} controles al día, a la hora que pueda`;

  return (
    <div>
      <CabeceraAtras titulo={titulo} volverA="/inicio" />
      <p className={estilos.subtitulo}>{subtitulo}</p>

      <div className={estilos.lista}>
        {controles.map((control) => {
          const etiqueta = etiquetaDeControl(control.estado, {
            dentroRango: control.registro?.dentroRango ?? true,
            horaRegistro: control.registro
              ? horaLocal(new Date(control.registro.horaDispositivo))
              : undefined,
            siguiente: control.numero === siguiente,
          });

          return (
            <Tarjeta key={control.numero} destacada={etiqueta.destacada}>
              <div className={estilos.filaFranja}>
                <div className={estilos.hora}>Control {control.numero}</div>
                <div className={estilos.franjaCentro}>
                  <Chip tono={etiqueta.tono}>{etiqueta.texto}</Chip>
                  <span className={estilos.franjaDetalle}>{etiqueta.detalle}</span>
                </div>
                {etiqueta.registrable && (
                  <Boton compacto onClick={() => navegar(`${ruta}/nuevo`)}>
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
