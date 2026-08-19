import { useState } from 'react';
import {
  useControlPlagasQuery,
  useCrearActividadPlagasMutation,
  useRegistrarPlagasRealizadaMutation,
} from '@/services/endpoints/gestion';
import { useConfiguracionQuery } from '@/services/endpoints/catalogos';
import { normalizarError } from '@/services/baseQuery';
import { Boton, CampoTexto, EsqueletoLista, Mensaje, Modal, useToast, Vacio } from '@/componentes';
import type { ControlPlagas, EstadoPlaga } from '@/types/dominio';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

const fecha = (iso: string): string => iso.slice(0, 10).split('-').reverse().join('/');

const COLUMNAS: { estado: EstadoPlaga; titulo: string; clase: string; vacio: string }[] = [
  {
    estado: 'realizada',
    titulo: 'Realizadas',
    clase: propios.verde!,
    vacio: 'Todavía ninguna',
  },
  {
    estado: 'programada',
    titulo: 'Programadas',
    clase: propios.amarillo!,
    vacio: 'Nada programado',
  },
  {
    estado: 'vencida',
    titulo: 'Vencidas',
    clase: propios.rojo!,
    vacio: 'Ninguna vencida',
  },
];

/**
 * Cronograma de control de plagas (punto 13).
 *
 * Al programar una actividad el servidor deja creados los avisos con la
 * antelación configurada, y cada uno se entrega cuando llega su momento.
 */
export function Plagas() {
  const { mostrar } = useToast();
  const { data, isLoading } = useControlPlagasQuery({ limit: 100 });
  const { data: configuracion } = useConfiguracionQuery();
  const [crear, { isLoading: guardando }] = useCrearActividadPlagasMutation();
  const [marcarRealizada] = useRegistrarPlagasRealizadaMutation();

  const [abierto, setAbierto] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [hora, setHora] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState<string | null>(null);

  const antelaciones = configuracion?.diasAvisoPlagas ?? [7, 3, 1, 0];
  const textoAntelacion = antelaciones
    .map((dias) => (dias === 0 ? 'el mismo día' : dias === 1 ? '24 h antes' : `${dias} días antes`))
    .join(' · ');

  function abrirFormulario() {
    setError(null);
    setFechaProgramada('');
    setHora('');
    setEmpresa('');
    setAbierto(true);
  }

  async function programar() {
    setError(null);
    if (!fechaProgramada || !hora) {
      setError('Faltan la fecha o la hora de la actividad.');
      return;
    }

    try {
      const resultado = await crear({
        fechaProgramada,
        hora,
        todosLosPuestos: true,
        ...(empresa.trim() ? { empresa: empresa.trim() } : {}),
      }).unwrap();

      mostrar(`Actividad programada · ${resultado.avisosProgramados} avisos preparados`);
      setAbierto(false);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  async function registrarComoRealizada(actividad: ControlPlagas) {
    try {
      await marcarRealizada({ id: actividad.id }).unwrap();
      mostrar('Actividad registrada como realizada');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  const actividades = data?.data ?? [];

  return (
    <div>
      <div className={estilos.encabezadoPagina}>
        <div>
          <h1 className={estilos.titulo}>Control de plagas</h1>
          <p className={estilos.bajada}>
            Aviso automático a los puestos afectados: {textoAntelacion}
          </p>
        </div>
        <Boton onClick={abrirFormulario}>Programar actividad</Boton>
      </div>

      {error && !abierto && <Mensaje tipo="error">{error}</Mensaje>}

      {isLoading && <EsqueletoLista filas={3} />}

      {!isLoading && actividades.length === 0 && (
        <Vacio
          icono="plagas"
          titulo="Sin actividades programadas"
          detalle="Programe la primera fumigación con el botón «Programar actividad»."
        />
      )}

      {!isLoading && actividades.length > 0 && (
        <div className={propios.tablero}>
          {COLUMNAS.map((columna) => {
            const items = actividades.filter(
              (actividad) => actividad.estadoActual === columna.estado,
            );
            return (
              <div key={columna.estado} className={propios.columna}>
                <div className={`${propios.tituloColumna} ${columna.clase}`}>
                  {columna.titulo}
                  <span className={propios.cuenta}>{items.length}</span>
                </div>

                {items.length === 0 && <p className={propios.columnaVacia}>{columna.vacio}</p>}

                {items.map((actividad) => (
                  <div key={actividad.id} className={propios.item}>
                    <div className={propios.tituloItem}>{actividad.tipoActividad}</div>
                    <div className={estilos.apagado}>
                      {fecha(actividad.fechaProgramada)} · {actividad.hora}
                      {actividad.empresa ? ` · ${actividad.empresa}` : ''}
                    </div>
                    <div className={estilos.apagado}>
                      {actividad.puestos.length === 1
                        ? '1 puesto avisado'
                        : `${actividad.puestos.length} puestos avisados`}
                    </div>
                    {actividad.estadoActual !== 'realizada' && (
                      <Boton
                        variante="secundario"
                        compacto
                        anchoCompleto
                        className={propios.accionItem}
                        onClick={() => void registrarComoRealizada(actividad)}
                      >
                        Registrar como realizada
                      </Boton>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        titulo="Programar actividad de fumigación"
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        acciones={
          <Boton cargando={guardando} onClick={() => void programar()}>
            Programar y avisar
          </Boton>
        }
      >
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
          etiqueta="Empresa responsable"
          placeholder="Ej.: Fumigaciones del Sur"
          value={empresa}
          onChange={(evento) => setEmpresa(evento.target.value)}
        />
        <p className={estilos.apagado}>
          Todos los puestos activos quedan avisados: {textoAntelacion}.
        </p>

        {error && abierto && <Mensaje tipo="error">{error}</Mensaje>}
      </Modal>
    </div>
  );
}
