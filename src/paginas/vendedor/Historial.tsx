import { useState } from 'react';
import {
  ICONO_POR_TIPO,
  useHistorialQuery,
  type TipoHistorial,
} from '@/services/endpoints/historial';
import {
  Boton,
  CabeceraAtras,
  Chip,
  EsqueletoLista,
  Icono,
  Mensaje,
  Tarjeta,
  Vacio,
} from '@/componentes';
import estilos from './Formulario.module.css';
import propios from './Historial.module.css';

type Filtro = 'todos' | TipoHistorial;

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'recepcion', etiqueta: 'Recepción' },
  { valor: 'exhibicion', etiqueta: 'Exhibición' },
  { valor: 'refrigeracion', etiqueta: 'Refrigeración' },
  { valor: 'limpieza', etiqueta: 'Limpieza' },
];

/**
 * Historial del puesto (punto 15).
 *
 * Los cuatro tipos de registro llegan ya unificados desde la API, con su icono
 * y su estado resueltos, así que la lista es la misma para todos.
 */
export function Historial() {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useHistorialQuery({
    ...(filtro === 'todos' ? {} : { tipo: filtro }),
    page: pagina,
    limit: 30,
  });

  function cambiarFiltro(nuevo: Filtro) {
    setFiltro(nuevo);
    setPagina(1);
  }

  const entradas = data?.data ?? [];
  const hayMas = (data?.meta.totalPages ?? 1) > pagina;

  return (
    <div>
      <CabeceraAtras titulo="Mi historial" volverA="/inicio" />

      <div className={propios.filtros} role="group" aria-label="Filtrar por tipo de registro">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={filtro === opcion.valor}
            onClick={() => cambiarFiltro(opcion.valor)}
            className={`${propios.filtro} ${filtro === opcion.valor ? propios.filtroActivo : ''}`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {isLoading && <EsqueletoLista filas={5} />}

      {isError && (
        <>
          <Mensaje tipo="error">No se pudo cargar el historial.</Mensaje>
          <Boton variante="secundario" anchoCompleto onClick={() => void refetch()}>
            Reintentar
          </Boton>
        </>
      )}

      {!isLoading && !isError && entradas.length === 0 && (
        <Vacio
          icono="historial"
          titulo="Sin registros en este período"
          detalle={
            filtro === 'todos'
              ? 'Los últimos siete días no tienen registros.'
              : 'Pruebe con otro tipo de registro.'
          }
        />
      )}

      <div className={estilos.lista}>
        {entradas.map((entrada) => (
          <Tarjeta key={`${entrada.tipo}-${entrada.id}`}>
            <div className={propios.fila}>
              <Icono nombre={ICONO_POR_TIPO[entrada.tipo]} tamano={20} className={propios.icono} />
              <div className={propios.centro}>
                <div className={propios.titulo}>{entrada.titulo}</div>
                <div className={estilos.franjaDetalle}>
                  {entrada.dia.split('-').reverse().join('/')} · {entrada.hora}
                </div>
                {entrada.detalle && <div className={propios.detalle}>{entrada.detalle}</div>}
              </div>
              <Chip tono={entrada.semaforo}>{entrada.estadoTexto}</Chip>
            </div>
          </Tarjeta>
        ))}
      </div>

      {hayMas && (
        <Boton
          variante="secundario"
          anchoCompleto
          cargando={isFetching}
          onClick={() => setPagina((actual) => actual + 1)}
          className={propios.masBoton}
        >
          Ver más
        </Boton>
      )}
    </div>
  );
}
