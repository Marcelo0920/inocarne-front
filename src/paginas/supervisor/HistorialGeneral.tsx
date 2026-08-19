import { useState } from 'react';
import { usePuestosQuery } from '@/services/endpoints/catalogos';
import { ICONO_POR_TIPO, useHistorialQuery } from '@/services/endpoints/historial';
import { Boton, Chip, EsqueletoLista, Icono, Mensaje, Tarjeta, Vacio } from '@/componentes';
import type { Semaforo } from '@/types/dominio';
import estilos from './Tabla.module.css';

const COLUMNAS = '90px 1.5fr 120px 80px 130px 130px';

const ESTADOS: { valor: Semaforo | 'todos'; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'verde', etiqueta: 'En regla' },
  { valor: 'amarillo', etiqueta: 'Atención' },
  { valor: 'rojo', etiqueta: 'Incumplimiento' },
];

/**
 * Historial de todos los puestos (punto 15).
 *
 * Los registros llegan ya combinados y normalizados desde `/api/historial`:
 * recepciones, controles, limpiezas, inspecciones y mantenimientos en una sola
 * lista ordenada por hora.
 */
export function HistorialGeneral() {
  const [puestoId, setPuestoId] = useState<string | 'todos'>('todos');
  const [semaforo, setSemaforo] = useState<Semaforo | 'todos'>('todos');
  const [pagina, setPagina] = useState(1);

  const { data: puestos } = usePuestosQuery();
  const { data, isLoading, isFetching, isError, refetch } = useHistorialQuery({
    ...(puestoId === 'todos' ? {} : { puestoId }),
    ...(semaforo === 'todos' ? {} : { semaforo }),
    page: pagina,
    limit: 50,
  });

  const entradas = data?.data ?? [];
  const hayMas = (data?.meta.totalPages ?? 1) > pagina;

  return (
    <div>
      <h1 className={estilos.titulo}>Historial general</h1>
      <p className={estilos.bajada}>
        Últimos siete días si no se indica un rango. {data?.meta.total ?? 0} registro(s).
      </p>

      <div className={estilos.filtros} role="group" aria-label="Filtrar el historial">
        <button
          type="button"
          aria-pressed={puestoId === 'todos'}
          onClick={() => {
            setPuestoId('todos');
            setPagina(1);
          }}
          className={`${estilos.filtro} ${puestoId === 'todos' ? estilos.filtroActivo : ''}`}
        >
          Todos los puestos
        </button>
        {puestos?.map((puesto) => (
          <button
            key={puesto.id}
            type="button"
            aria-pressed={puestoId === puesto.id}
            onClick={() => {
              setPuestoId(puesto.id);
              setPagina(1);
            }}
            className={`${estilos.filtro} ${puestoId === puesto.id ? estilos.filtroActivo : ''}`}
          >
            P{puesto.numero}
          </button>
        ))}

        <span className={estilos.separador} />

        {ESTADOS.map((estado) => (
          <button
            key={estado.valor}
            type="button"
            aria-pressed={semaforo === estado.valor}
            onClick={() => {
              setSemaforo(estado.valor);
              setPagina(1);
            }}
            className={`${estilos.filtro} ${semaforo === estado.valor ? estilos.filtroActivo : ''}`}
          >
            {estado.etiqueta}
          </button>
        ))}
      </div>

      {isLoading && <EsqueletoLista filas={6} />}

      {isError && (
        <>
          <Mensaje tipo="error">No se pudo cargar el historial.</Mensaje>
          <Boton variante="secundario" onClick={() => void refetch()}>
            Reintentar
          </Boton>
        </>
      )}

      {!isLoading && !isError && entradas.length === 0 && (
        <Vacio
          icono="historial"
          titulo="Sin registros"
          detalle="Pruebe con otro puesto u otro estado."
        />
      )}

      {/* Escritorio */}
      {entradas.length > 0 && (
        <div className={estilos.tabla}>
          <div className={estilos.encabezado} style={{ gridTemplateColumns: COLUMNAS }}>
            <div>Puesto</div>
            <div>Registro</div>
            <div>Fecha</div>
            <div>Hora</div>
            <div>Usuario</div>
            <div>Estado</div>
          </div>
          {entradas.map((entrada) => (
            <div
              key={`${entrada.tipo}-${entrada.id}`}
              className={estilos.fila}
              style={{ gridTemplateColumns: COLUMNAS }}
            >
              <span className={estilos.fuerte}>
                {entrada.puestoNumero ? `P${entrada.puestoNumero}` : 'Mercado'}
              </span>
              <span>
                <Icono nombre={ICONO_POR_TIPO[entrada.tipo]} tamano={16} /> {entrada.titulo}
              </span>
              <span>{entrada.dia.split('-').reverse().join('/')}</span>
              <span>{entrada.hora}</span>
              <span className={estilos.apagado}>{entrada.usuario}</span>
              <span>
                <Chip tono={entrada.semaforo}>{entrada.estadoTexto}</Chip>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Teléfono */}
      <div className={estilos.tarjetas}>
        {entradas.map((entrada) => (
          <Tarjeta key={`m-${entrada.tipo}-${entrada.id}`}>
            <div className={estilos.tarjetaTop}>
              <div>
                <div className={estilos.fuerte}>
                  <Icono nombre={ICONO_POR_TIPO[entrada.tipo]} tamano={16} /> {entrada.titulo}
                </div>
                <div className={estilos.apagado}>
                  {entrada.puestoNumero ? `Puesto ${entrada.puestoNumero}` : 'Mercado'} ·{' '}
                  {entrada.dia.split('-').reverse().join('/')} · {entrada.hora} · {entrada.usuario}
                </div>
              </div>
              <Chip tono={entrada.semaforo}>{entrada.estadoTexto}</Chip>
            </div>
          </Tarjeta>
        ))}
      </div>

      {hayMas && (
        <Boton
          variante="secundario"
          cargando={isFetching}
          onClick={() => setPagina((actual) => actual + 1)}
        >
          Ver más
        </Boton>
      )}
    </div>
  );
}
