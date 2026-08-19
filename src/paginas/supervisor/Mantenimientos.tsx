import { useState } from 'react';
import { useEquiposQuery, useMantenimientosQuery } from '@/services/endpoints/equipos';
import { usePuestosQuery } from '@/services/endpoints/catalogos';
import { Chip, EsqueletoLista, Mensaje, Tarjeta, Vacio } from '@/componentes';
import type { EstadoMantenimiento } from '@/types/dominio';
import estilos from './Tabla.module.css';

const ESTADO: Record<EstadoMantenimiento, { tono: 'verde' | 'amarillo' | 'rojo'; texto: string }> =
  {
    realizado: { tono: 'verde', texto: 'Al día' },
    proximo: { tono: 'amarillo', texto: 'Próximo' },
    vencido: { tono: 'rojo', texto: 'Vencido' },
  };

const fecha = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';

/**
 * Base general de mantenimientos (punto 10.5).
 *
 * Reúne los equipos de todos los puestos con el estado que calcula el
 * servidor, para ver de una sola pasada qué está vencido.
 */
export function Mantenimientos() {
  const [abierto, setAbierto] = useState<string | null>(null);
  const { data: equipos, isLoading } = useEquiposQuery();
  const { data: puestos } = usePuestosQuery();
  const { data: historial } = useMantenimientosQuery({ limit: 200 });

  const nombrePuesto = (puestoId: string): string => {
    const puesto = puestos?.find((candidato) => candidato.id === puestoId);
    return puesto ? `P${puesto.numero}` : '—';
  };

  const vencidos = equipos?.filter((e) => e.estadoMantenimiento === 'vencido').length ?? 0;
  const proximos = equipos?.filter((e) => e.estadoMantenimiento === 'proximo').length ?? 0;

  const historialDe = (equipoId: string) =>
    historial?.data.filter((mantenimiento) => {
      const referencia = mantenimiento.equipoId;
      const id = typeof referencia === 'string' ? referencia : referencia.id;
      return id === equipoId;
    }) ?? [];

  if (isLoading) return <EsqueletoLista filas={6} />;

  if ((equipos?.length ?? 0) === 0) {
    return (
      <Vacio
        icono="mantenimiento"
        titulo="Ningún puesto registró equipos todavía"
        detalle="Cada puesto carga su inventario desde su propia aplicación."
      />
    );
  }

  return (
    <div>
      <h1 className={estilos.titulo}>Mantenimientos — todos los puestos</h1>
      <p className={estilos.bajada}>
        {vencidos} vencido(s) · {proximos} próximo(s) · {equipos?.length} equipo(s) en total
      </p>

      {vencidos > 0 && (
        <Mensaje tipo="error">{vencidos} equipo(s) con el mantenimiento vencido.</Mensaje>
      )}

      {/* Escritorio */}
      <div className={estilos.tabla}>
        <div className={estilos.encabezado} style={{ gridTemplateColumns: COLUMNAS }}>
          <div>Puesto</div>
          <div>Equipo</div>
          <div>Código</div>
          <div>Último mant.</div>
          <div>Tipo</div>
          <div>Próximo mant.</div>
          <div>Estado</div>
        </div>
        {equipos?.map((equipo) => (
          <button
            key={equipo.id}
            type="button"
            className={estilos.fila}
            style={{ gridTemplateColumns: COLUMNAS }}
            onClick={() => setAbierto(abierto === equipo.id ? null : equipo.id)}
          >
            <span className={estilos.fuerte}>{nombrePuesto(equipo.puestoId)}</span>
            <span>{equipo.nombre}</span>
            <span className={estilos.apagado}>{equipo.codigo}</span>
            <span>{fecha(equipo.ultimoMantenimiento)}</span>
            <span>{equipo.tipoUltimoMantenimiento ?? '—'}</span>
            <span>{fecha(equipo.proximoMantenimiento)}</span>
            <span>
              <Chip tono={ESTADO[equipo.estadoMantenimiento].tono}>
                {ESTADO[equipo.estadoMantenimiento].texto}
              </Chip>
            </span>
          </button>
        ))}
      </div>

      {/* Teléfono */}
      <div className={estilos.tarjetas}>
        {equipos?.map((equipo) => (
          <Tarjeta
            key={equipo.id}
            onClick={() => setAbierto(abierto === equipo.id ? null : equipo.id)}
          >
            <div className={estilos.tarjetaTop}>
              <div>
                <div className={estilos.fuerte}>
                  {equipo.nombre}{' '}
                  <span className={estilos.apagado}>· {nombrePuesto(equipo.puestoId)}</span>
                </div>
                <div className={estilos.apagado}>
                  {equipo.codigo} · último {fecha(equipo.ultimoMantenimiento)}
                </div>
                <div className={estilos.apagado}>Próximo: {fecha(equipo.proximoMantenimiento)}</div>
              </div>
              <Chip tono={ESTADO[equipo.estadoMantenimiento].tono}>
                {ESTADO[equipo.estadoMantenimiento].texto}
              </Chip>
            </div>
          </Tarjeta>
        ))}
      </div>

      {abierto && (
        <section className={estilos.panelDetalle}>
          <h2 className={estilos.subtitulo}>Historial del equipo</h2>
          {historialDe(abierto).length === 0 ? (
            <p className={estilos.apagado}>Sin mantenimientos registrados.</p>
          ) : (
            historialDe(abierto).map((mantenimiento) => (
              <div key={mantenimiento.id} className={estilos.itemHistorial}>
                <div className={estilos.itemTop}>
                  <strong>{fecha(mantenimiento.fecha)}</strong>
                  <Chip tono={mantenimiento.tipo === 'preventivo' ? 'verde' : 'amarillo'}>
                    {mantenimiento.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                  </Chip>
                </div>
                <div>{mantenimiento.descripcion}</div>
                <div className={estilos.apagado}>
                  {mantenimiento.tecnico ?? 'Sin técnico'}
                  {mantenimiento.documentos.length > 0 ? ' · con respaldo' : ''}
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}

const COLUMNAS = '90px 1.4fr 110px 130px 120px 140px 110px';
