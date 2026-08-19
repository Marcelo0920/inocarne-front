import { useState } from 'react';
import { useCapacitacionesQuery, useCrearCapacitacionMutation } from '@/services/endpoints/gestion';
import { usePuestosQuery } from '@/services/endpoints/catalogos';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CampoTexto,
  Chip,
  EsqueletoLista,
  Mensaje,
  Modal,
  Tarjeta,
  useToast,
  Vacio,
} from '@/componentes';
import type { EstadoCapacitacion, Semaforo } from '@/types/dominio';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

const ESTADOS: Record<EstadoCapacitacion, { tono: Semaforo; texto: string }> = {
  programada: { tono: 'amarillo', texto: 'Programada' },
  realizada: { tono: 'verde', texto: 'Realizada' },
  pendiente: { tono: 'gris', texto: 'Pendiente' },
  reprogramada: { tono: 'amarillo', texto: 'Reprogramada' },
};

const fecha = (iso: string): string => iso.slice(0, 10).split('-').reverse().join('/');

/** "3 puestos convocados", sin paréntesis que el vendedor tenga que descifrar. */
const convocados = (total: number): string =>
  total === 1 ? '1 puesto convocado' : `${total} puestos convocados`;

/**
 * Cronograma de capacitaciones (punto 12).
 *
 * Al programar una, el servidor avisa por su cuenta a los puestos convocados;
 * no hace falta un paso aparte para notificar.
 */
export function Capacitaciones() {
  const { mostrar } = useToast();
  const { data, isLoading } = useCapacitacionesQuery({ limit: 100 });
  const { data: puestos } = usePuestosQuery({ activo: true });
  const [crear, { isLoading: guardando }] = useCrearCapacitacionMutation();

  const [abierto, setAbierto] = useState(false);
  const [tema, setTema] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [capacitador, setCapacitador] = useState('');
  const [error, setError] = useState<string | null>(null);

  function abrirFormulario() {
    setError(null);
    setTema('');
    setFechaProgramada('');
    setHora('');
    setLugar('');
    setCapacitador('');
    setAbierto(true);
  }

  async function programar() {
    setError(null);
    if (!tema.trim() || !fechaProgramada || !hora) {
      setError('Faltan el tema, la fecha o la hora.');
      return;
    }

    try {
      await crear({
        tema: tema.trim(),
        fechaProgramada,
        hora,
        ...(lugar.trim() ? { lugar: lugar.trim() } : {}),
        ...(capacitador.trim() ? { capacitador: capacitador.trim() } : {}),
      }).unwrap();

      mostrar(`Capacitación programada · se avisó a ${convocados(puestos?.length ?? 0)}`);
      setAbierto(false);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  const capacitaciones = data?.data ?? [];

  return (
    <div>
      <div className={estilos.encabezadoPagina}>
        <div>
          <h1 className={estilos.titulo}>Capacitaciones</h1>
          <p className={estilos.bajada}>
            Al programarla, los puestos convocados reciben el aviso automáticamente.
          </p>
        </div>
        <Boton onClick={abrirFormulario}>Programar capacitación</Boton>
      </div>

      {error && !abierto && <Mensaje tipo="error">{error}</Mensaje>}

      {isLoading && <EsqueletoLista filas={3} />}

      {!isLoading && capacitaciones.length === 0 && (
        <Vacio
          icono="capacitacion"
          titulo="Sin capacitaciones programadas"
          detalle="Programe la primera con el botón «Programar capacitación»."
        />
      )}

      <div className={propios.listaTarjetas}>
        {capacitaciones.map((capacitacion) => {
          const asistieron = capacitacion.participantes.filter((p) => p.asistio).length;
          return (
            <Tarjeta key={capacitacion.id}>
              <div className={estilos.tarjetaTop}>
                <div className={propios.tituloItem}>{capacitacion.tema}</div>
                <Chip tono={ESTADOS[capacitacion.estado].tono}>
                  {ESTADOS[capacitacion.estado].texto}
                </Chip>
              </div>
              <div className={estilos.apagado}>
                {fecha(capacitacion.fechaProgramada)} · {capacitacion.hora}
                {capacitacion.lugar ? ` · ${capacitacion.lugar}` : ''}
                {capacitacion.capacitador ? ` · ${capacitacion.capacitador}` : ''}
              </div>
              <div className={estilos.apagado}>
                {convocados(capacitacion.puestos.length)}
                {capacitacion.participantes.length > 0 ? ` · ${asistieron} asistieron` : ''}
              </div>
            </Tarjeta>
          );
        })}
      </div>

      <Modal
        titulo="Programar una capacitación"
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        acciones={
          <Boton cargando={guardando} onClick={() => void programar()}>
            Programar y avisar
          </Boton>
        }
      >
        <CampoTexto
          etiqueta="Tema"
          placeholder="Ej.: Manipulación higiénica de carnes"
          value={tema}
          onChange={(evento) => setTema(evento.target.value)}
        />
        <div className={propios.dos}>
          <CampoTexto
            etiqueta="Fecha"
            type="date"
            value={fechaProgramada}
            onChange={(evento) => setFechaProgramada(evento.target.value)}
          />
          <CampoTexto
            etiqueta="Hora"
            type="time"
            value={hora}
            onChange={(evento) => setHora(evento.target.value)}
          />
        </div>
        <CampoTexto
          etiqueta="Lugar"
          placeholder="Ej.: Sala de reuniones del mercado"
          value={lugar}
          onChange={(evento) => setLugar(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Capacitador"
          value={capacitador}
          onChange={(evento) => setCapacitador(evento.target.value)}
        />
        <p className={estilos.apagado}>
          Se convoca a {convocados(puestos?.length ?? 0)} y el aviso sale en el momento.
        </p>

        {error && abierto && <Mensaje tipo="error">{error}</Mensaje>}
      </Modal>
    </div>
  );
}
