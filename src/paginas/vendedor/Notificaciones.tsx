import { useEffect } from 'react';
import { useMarcarTodasLeidasMutation, useNotificacionesQuery } from '@/services/endpoints/gestion';
import {
  CabeceraAtras,
  EsqueletoLista,
  Icono,
  Tarjeta,
  Vacio,
  type NombreIcono,
} from '@/componentes';
import type { TipoNotificacion } from '@/types/dominio';
import estilos from './Formulario.module.css';
import propios from './Notificaciones.module.css';

const ICONOS: Record<TipoNotificacion, NombreIcono> = {
  control_plagas: 'plagas',
  capacitacion: 'capacitacion',
  control_pendiente: 'reloj',
  mantenimiento: 'mantenimiento',
  accion_correctiva: 'acciones',
  recepcion_rechazada: 'recepcion',
  general: 'notificaciones',
};

/** Fecha relativa sencilla: "Hoy, 08:00" es más útil que la fecha completa. */
function cuando(iso: string): string {
  const fecha = new Date(iso);
  const formatoHora = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const hoy = dia.format(new Date());
  const ayer = dia.format(new Date(Date.now() - 86_400_000));
  const suDia = dia.format(fecha);

  if (suDia === hoy) return `Hoy, ${formatoHora.format(fecha)}`;
  if (suDia === ayer) return `Ayer, ${formatoHora.format(fecha)}`;
  return suDia.split('-').reverse().join('/');
}

/**
 * Avisos dirigidos al puesto.
 *
 * Se marcan como leídos al abrir la pantalla: el vendedor ya los vio, y dejar
 * el contador encendido solo lo confundiría.
 */
export function Notificaciones() {
  const { data, isLoading } = useNotificacionesQuery({ limit: 50 });
  const [marcarTodas] = useMarcarTodasLeidasMutation();

  const sinLeer = data?.data.some((aviso) => !aviso.leida) ?? false;

  useEffect(() => {
    if (sinLeer) void marcarTodas();
  }, [sinLeer, marcarTodas]);

  const avisos = data?.data ?? [];

  return (
    <div>
      <CabeceraAtras titulo="Notificaciones" volverA="/inicio" />

      {isLoading && <EsqueletoLista filas={3} />}

      {!isLoading && avisos.length === 0 && (
        <Vacio
          icono="notificaciones"
          titulo="No hay avisos"
          detalle="Aquí aparecerán las fumigaciones, las capacitaciones y los controles pendientes."
        />
      )}

      <div className={estilos.lista}>
        {avisos.map((aviso) => (
          <Tarjeta key={aviso.id} destacada={!aviso.leida}>
            <div className={propios.encabezado}>
              <Icono nombre={ICONOS[aviso.tipo]} tamano={24} className={propios.icono} />
              <div className={propios.centro}>
                <div className={propios.titulo}>{aviso.titulo}</div>
                <div className={estilos.franjaDetalle}>{cuando(aviso.programadaPara)}</div>
              </div>
              {!aviso.leida && <span className={propios.nueva}>NUEVA</span>}
            </div>
            <p className={propios.cuerpo}>{aviso.mensaje}</p>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
