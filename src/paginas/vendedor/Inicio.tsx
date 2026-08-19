import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectUsuario } from '@/features/auth/authSlice';
import { useConfiguracionQuery } from '@/services/endpoints/catalogos';
import {
  useDiaDeControlesQuery,
  useDiaDeLimpiezaQuery,
  useRecepcionesQuery,
} from '@/services/endpoints/registros';
import { useEquiposQuery } from '@/services/endpoints/equipos';
import { useNotificacionesSinLeerQuery } from '@/services/endpoints/gestion';
import { afinarEstado, diaLocal, horaLocal, type Tono } from '@/domain/franjas';
import { Chip, Icono, type NombreIcono } from '@/componentes';
import type { EstadoFranja, TipoControl } from '@/types/dominio';
import estilos from './Inicio.module.css';

interface Resumen {
  tono: Tono;
  texto: string;
  detalle: string;
  destacada: boolean;
}

/** Fecha legible: "Martes 18/08". */
function fechaLegible(): string {
  const hoy = new Date();
  const diaSemana = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
  }).format(hoy);
  const [, mes = '', numero = ''] = diaLocal(hoy).split('-');
  return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)} ${numero}/${mes}`;
}

/**
 * Pantalla de inicio del vendedor.
 *
 * Responde una sola pregunta: qué me falta hacer hoy. Cada tarjeta lleva su
 * estado, y lo que toca en este momento se destaca sobre el resto.
 */
export function Inicio() {
  const navegar = useNavigate();
  const usuario = useAppSelector(selectUsuario);

  const { data: configuracion } = useConfiguracionQuery();
  const { data: dia } = useDiaDeControlesQuery();
  const { data: limpieza } = useDiaDeLimpiezaQuery();
  const { data: recepciones } = useRecepcionesQuery({ desde: diaLocal(), hasta: diaLocal() });
  const { data: equipos } = useEquiposQuery();
  const { data: sinLeer } = useNotificacionesSinLeerQuery();

  const tolerancia = configuracion?.toleranciaMinutos ?? 15;

  /** Estado de las franjas de un tipo, ya afinado con el caso "le toca ahora". */
  const franjasDe = (tipo: TipoControl): EstadoFranja[] =>
    (dia?.franjas ?? []).filter((franja) => franja.tipo === tipo);

  function resumenDeControles(tipo: TipoControl): Resumen {
    const franjas = franjasDe(tipo);
    if (franjas.length === 0) {
      return { tono: 'gris', texto: 'Sin horarios', detalle: '', destacada: false };
    }

    const estados = franjas.map((franja) =>
      afinarEstado(franja.estado, franja.franjaProgramada, tolerancia),
    );
    const hechos = franjas.filter((franja) => franja.registro !== null).length;
    const total = franjas.length;

    const hayProblema = franjas.some(
      (franja, indice) =>
        estados[indice] === 'no_realizado' || franja.registro?.dentroRango === false,
    );
    if (hayProblema) {
      return {
        tono: 'rojo',
        texto: 'Revisar',
        detalle: `${hechos} de ${total} hechos`,
        destacada: false,
      };
    }

    if (estados.includes('ahora')) {
      return {
        tono: 'azul',
        texto: 'Le toca ahora',
        detalle: `${hechos} de ${total} hechos`,
        destacada: true,
      };
    }

    if (hechos === total) {
      return { tono: 'verde', texto: 'Hecho', detalle: `${total} de ${total}`, destacada: false };
    }

    return {
      tono: 'gris',
      texto: `${hechos} de ${total}`,
      detalle: 'Siguiente más tarde',
      destacada: false,
    };
  }

  const recepcionesHoy = recepciones?.data ?? [];
  const resumenRecepcion: Resumen = recepcionesHoy.length
    ? recepcionesHoy.some((r) => r.resultado === 'rechazado' || !r.dentroRango)
      ? { tono: 'rojo', texto: 'Revisar', detalle: 'Hubo un rechazo', destacada: false }
      : {
          tono: 'verde',
          texto: 'Hecho',
          detalle:
            recepcionesHoy.length === 1 ? '1 registrada' : `${recepcionesHoy.length} registradas`,
          destacada: false,
        }
    : { tono: 'gris', texto: 'Sin registro', detalle: 'Registre cada entrega', destacada: false };

  const turnos = limpieza?.turnos ?? [];
  const inicial = turnos.find((turno) => turno.turno === 'inicial');
  const final = turnos.find((turno) => turno.turno === 'final');
  const resumenLimpieza: Resumen = final?.registrado
    ? { tono: 'verde', texto: 'Completa', detalle: 'Inicial y final', destacada: false }
    : inicial?.registrado
      ? { tono: 'verde', texto: 'Inicial', detalle: 'Falta la final', destacada: false }
      : { tono: 'gris', texto: 'Pendiente', detalle: 'Falta la inicial', destacada: false };

  const vencidos = equipos?.filter((e) => e.estadoMantenimiento === 'vencido').length ?? 0;
  const noLeidas = sinLeer?.total ?? 0;
  const textoAvisos =
    noLeidas === 0
      ? 'No hay avisos nuevos'
      : noLeidas === 1
        ? '1 aviso sin leer'
        : `${noLeidas} avisos sin leer`;

  const exhibicion = resumenDeControles('exhibicion');
  const refrigeracion = resumenDeControles('refrigeracion');

  const aviso = exhibicion.destacada
    ? 'Le toca el control de exhibición'
    : refrigeracion.destacada
      ? 'Le toca el control de refrigeración'
      : exhibicion.tono === 'rojo' || refrigeracion.tono === 'rojo'
        ? 'Hay un control no realizado o fuera de rango'
        : null;

  const tarjetas = [
    {
      icono: 'recepcion' as NombreIcono,
      titulo: 'Recepción de carne',
      ruta: '/recepcion',
      resumen: resumenRecepcion,
    },
    {
      icono: 'exhibicion' as NombreIcono,
      titulo: 'Control de exhibición',
      ruta: '/exhibicion',
      resumen: exhibicion,
    },
    {
      icono: 'refrigeracion' as NombreIcono,
      titulo: 'Equipos de refrigeración',
      ruta: '/refrigeracion',
      resumen: refrigeracion,
    },
    {
      icono: 'limpieza' as NombreIcono,
      titulo: 'Limpieza y desinfección',
      ruta: '/limpieza',
      resumen: resumenLimpieza,
    },
  ];

  return (
    <div>
      <header className={estilos.cabecera}>
        <div className={estilos.filaCabecera}>
          <div>
            <div className={estilos.saludo}>
              {Number(horaLocal().slice(0, 2)) < 12 ? 'Buenos días' : 'Buenas tardes'}
            </div>
            <div className={estilos.puesto}>{usuario?.puesto?.nombre ?? 'Mi puesto'}</div>
          </div>
          <div className={estilos.reloj}>
            <div className={estilos.fecha}>{fechaLegible()}</div>
            <div className={estilos.hora}>{horaLocal()}</div>
          </div>
        </div>

        {aviso && (
          <button
            type="button"
            className={estilos.aviso}
            onClick={() => navegar(exhibicion.destacada ? '/exhibicion' : '/refrigeracion')}
          >
            <Icono nombre="reloj" tamano={20} />
            <span className={estilos.avisoTexto}>{aviso}</span>
            <Icono nombre="avanzar" tamano={20} />
          </button>
        )}
      </header>

      <div className={estilos.cuerpo}>
        <div className={estilos.rejilla}>
          {tarjetas.map((tarjeta) => (
            <button
              key={tarjeta.ruta}
              type="button"
              onClick={() => navegar(tarjeta.ruta)}
              className={`${estilos.tarjeta} ${tarjeta.resumen.destacada ? estilos.destacada : ''}`}
            >
              <div className={estilos.tarjetaTop}>
                <Icono nombre={tarjeta.icono} tamano={30} className={estilos.icono} />
                <Chip tono={tarjeta.resumen.tono}>{tarjeta.resumen.texto}</Chip>
              </div>
              <div className={estilos.tarjetaTitulo}>{tarjeta.titulo}</div>
              <div className={estilos.tarjetaDetalle}>{tarjeta.resumen.detalle}</div>
            </button>
          ))}

          <button type="button" onClick={() => navegar('/equipos')} className={estilos.tarjeta}>
            <div className={estilos.tarjetaTop}>
              <Icono nombre="equipos" tamano={30} className={estilos.icono} />
              {vencidos > 0 && <Chip tono="rojo">{vencidos} vencido</Chip>}
            </div>
            <div className={estilos.tarjetaTitulo}>Mis equipos y mantenimientos</div>
          </button>

          <button type="button" onClick={() => navegar('/historial')} className={estilos.tarjeta}>
            <div className={estilos.tarjetaTop}>
              <Icono nombre="historial" tamano={30} className={estilos.icono} />
            </div>
            <div className={estilos.tarjetaTitulo}>Mi historial</div>
          </button>
        </div>

        <button type="button" onClick={() => navegar('/notificaciones')} className={estilos.fila}>
          <span className={estilos.campana}>
            <Icono nombre="notificaciones" tamano={26} />
            {noLeidas > 0 && <span className={estilos.insignia}>{noLeidas}</span>}
          </span>
          <span className={estilos.filaTexto}>
            <span className={estilos.tarjetaTitulo}>Notificaciones</span>
            <span className={estilos.tarjetaDetalle}>{textoAvisos}</span>
          </span>
          <Icono nombre="avanzar" tamano={22} className={estilos.flecha} />
        </button>

        {/* Desde el teléfono no hay barra lateral donde poner la sesión: la
            cuenta es una fila más del inicio, con su nombre a la vista para
            que se note con qué usuario se está trabajando. */}
        <button type="button" onClick={() => navegar('/mi-cuenta')} className={estilos.fila}>
          <span className={estilos.avatar}>
            <Icono nombre="cuenta" tamano={22} />
          </span>
          <span className={estilos.filaTexto}>
            <span className={estilos.tarjetaTitulo}>{usuario?.nombre ?? 'Mi cuenta'}</span>
            <span className={estilos.tarjetaDetalle}>Cambiar la contraseña o cerrar sesión</span>
          </span>
          <Icono nombre="avanzar" tamano={22} className={estilos.flecha} />
        </button>
      </div>
    </div>
  );
}
