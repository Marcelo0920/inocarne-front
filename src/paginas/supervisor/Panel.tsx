import { useState } from 'react';
import { useDashboardQuery } from '@/services/endpoints/supervision';
import { Boton, Cargando, Chip, Mensaje, PuntoSemaforo, Tarjeta, Vacio } from '@/componentes';
import type { FilaDashboard, Semaforo } from '@/types/dominio';
import estilos from './Panel.module.css';

const ESTADO_GENERAL: Record<Semaforo, string> = {
  verde: 'Todo en regla',
  amarillo: 'Atención',
  rojo: 'Incumplimiento',
  gris: 'Sin actividad',
};

const LEYENDA: { tono: Semaforo; texto: string }[] = [
  { tono: 'verde', texto: 'Todo en regla' },
  { tono: 'amarillo', texto: 'Atención' },
  { tono: 'rojo', texto: 'Incumplimiento' },
  { tono: 'gris', texto: 'Aún no corresponde' },
];

/**
 * Panel general de control (punto 5).
 *
 * En escritorio es una matriz de puestos por control; en el teléfono, la misma
 * información en tarjetas, porque una tabla de nueve columnas no se lee ahí.
 * Todo se calcula en el servidor al consultar: el semáforo no se almacena.
 */
export function Panel() {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useDashboardQuery();

  if (isLoading) return <Cargando texto="Cargando el estado de los puestos…" />;

  if (isError || !data) {
    return (
      <div>
        <Mensaje tipo="error">No se pudo cargar el panel.</Mensaje>
        <Boton variante="secundario" onClick={() => void refetch()}>
          Reintentar
        </Boton>
      </div>
    );
  }

  if (data.filas.length === 0) {
    return (
      <Vacio
        icono="mercado"
        titulo="No hay puestos activos"
        detalle="Cuando el administrador registre los puestos, aparecerán aquí."
      />
    );
  }

  const detalle = data.filas.find((fila) => fila.puestoId === seleccionado) ?? null;

  return (
    <div>
      <header className={estilos.encabezado}>
        <h1 className={estilos.titulo}>Panel general de control</h1>
        <span className={estilos.nota}>
          {isFetching ? 'Actualizando…' : 'Se actualiza solo con cada registro de los puestos'}
        </span>
      </header>

      <div className={estilos.resumen}>
        <Baldosa valor={data.resumen.conformes} etiqueta="Puestos en regla" tono="verde" />
        <Baldosa valor={data.resumen.conAtencion} etiqueta="Con atención" tono="amarillo" />
        <Baldosa valor={data.resumen.conIncumplimiento} etiqueta="Con incumplimiento" tono="rojo" />
        <Baldosa
          valor={data.resumen.noConformidadesAbiertas}
          etiqueta="Acciones abiertas"
          tono="amarillo"
        />
        <Baldosa
          valor={data.resumen.mantenimientosVencidos}
          etiqueta="Mantenimientos vencidos"
          tono="rojo"
        />
      </div>

      <div className={estilos.leyenda}>
        {LEYENDA.map((entrada) => (
          <span key={entrada.tono} className={estilos.leyendaItem}>
            <PuntoSemaforo tono={entrada.tono} chico />
            {entrada.texto}
          </span>
        ))}
      </div>

      {/* ── Escritorio: matriz ─────────────────────────────── */}
      <div className={estilos.tabla}>
        <div
          className={estilos.filaEncabezado}
          style={{ gridTemplateColumns: columnas(data.columnas.length) }}
        >
          <div>Puesto</div>
          {data.columnas.map((columna) => (
            <div key={columna.clave} className={estilos.celdaCentro} title={columna.grupo}>
              {columna.etiqueta}
            </div>
          ))}
          <div className={estilos.celdaCentro}>Estado</div>
        </div>

        {data.filas.map((fila) => (
          <button
            key={fila.puestoId}
            type="button"
            onClick={() => setSeleccionado(fila.puestoId === seleccionado ? null : fila.puestoId)}
            className={`${estilos.fila} ${seleccionado === fila.puestoId ? estilos.filaActiva : ''}`}
            style={{ gridTemplateColumns: columnas(data.columnas.length) }}
          >
            <span className={estilos.nombrePuesto}>{fila.nombre}</span>
            {fila.celdas.map((celda) => (
              <span key={celda.clave} className={estilos.celdaCentro}>
                <PuntoSemaforo tono={celda.semaforo} titulo={celda.detalle ?? celda.etiqueta} />
              </span>
            ))}
            <span className={estilos.celdaCentro}>
              <Chip tono={fila.semaforo}>{ESTADO_GENERAL[fila.semaforo]}</Chip>
            </span>
          </button>
        ))}
      </div>

      {/* ── Teléfono: tarjetas ─────────────────────────────── */}
      <div className={estilos.tarjetas}>
        {data.filas.map((fila) => (
          <Tarjeta
            key={fila.puestoId}
            onClick={() => setSeleccionado(fila.puestoId === seleccionado ? null : fila.puestoId)}
          >
            <div className={estilos.tarjetaTop}>
              <span className={estilos.nombrePuesto}>{fila.nombre}</span>
              <Chip tono={fila.semaforo}>{ESTADO_GENERAL[fila.semaforo]}</Chip>
            </div>
            <div className={estilos.puntos}>
              {fila.celdas.map((celda) => (
                <PuntoSemaforo
                  key={celda.clave}
                  tono={celda.semaforo}
                  chico
                  titulo={celda.detalle ?? celda.etiqueta}
                />
              ))}
              <span className={estilos.resumenFila}>
                {fila.problemas.length > 0
                  ? `${fila.problemas.length} punto(s) a revisar`
                  : 'Sin novedades'}
              </span>
            </div>
          </Tarjeta>
        ))}
      </div>

      {detalle && <DetalleDelPuesto fila={detalle} onCerrar={() => setSeleccionado(null)} />}
    </div>
  );
}

/** La matriz se adapta al número de columnas que devuelva la configuración. */
function columnas(cantidad: number): string {
  return `150px repeat(${cantidad}, minmax(52px, 1fr)) 150px`;
}

function Baldosa({ valor, etiqueta, tono }: { valor: number; etiqueta: string; tono: Semaforo }) {
  // Un cero en algo malo es la buena noticia: pintarlo de rojo haría pensar que
  // hay un problema donde no lo hay. El color aparece solo cuando el número pesa.
  const color = valor === 0 ? 'neutro' : tono;

  return (
    <div className={estilos.baldosa}>
      <span className={`${estilos.baldosaValor} ${estilos[color]}`}>{valor}</span>
      <span className={estilos.baldosaEtiqueta}>{etiqueta}</span>
    </div>
  );
}

/** Detalle del puesto: exactamente cuál es el problema, al hacer clic. */
function DetalleDelPuesto({ fila, onCerrar }: { fila: FilaDashboard; onCerrar: () => void }) {
  return (
    <section className={estilos.detalle}>
      <div className={estilos.detalleEncabezado}>
        <h2 className={estilos.detalleTitulo}>{fila.nombre} — detalle del día</h2>
        <Boton variante="texto" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>

      {fila.problemas.length > 0 && (
        <Mensaje tipo="aviso" detalle={fila.problemas}>
          Lo que requiere atención:
        </Mensaje>
      )}

      <div className={estilos.detalleRejilla}>
        {fila.celdas.map((celda) => (
          <div key={celda.clave} className={estilos.detalleItem}>
            <PuntoSemaforo tono={celda.semaforo} chico />
            <span className={estilos.detalleEtiqueta}>{celda.etiqueta}</span>
            <span className={estilos.detalleTexto}>{celda.detalle ?? '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
