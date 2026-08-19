import { useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectToken } from '@/features/auth/authSlice';
import { usePuestosQuery } from '@/services/endpoints/catalogos';
import { useResumenReporteQuery } from '@/services/endpoints/gestion';
import { useDashboardQuery } from '@/services/endpoints/supervision';
import { BASE_API_URL } from '@/services/urlApi';
import { Boton, Cargando, Mensaje, useToast } from '@/componentes';
import { diaLocal } from '@/domain/franjas';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

/** Rango de fechas relativo a hoy. */
function desdeHace(dias: number): string {
  return diaLocal(new Date(Date.now() - dias * 86_400_000));
}

const RANGOS = [
  { valor: 0, etiqueta: 'Hoy' },
  { valor: 7, etiqueta: 'Últimos 7 días' },
  { valor: 30, etiqueta: 'Últimos 30 días' },
  { valor: 90, etiqueta: 'Últimos 90 días' },
];

/**
 * Reportes (punto 16).
 *
 * La descarga no puede hacerse con un enlace normal: el archivo va detrás del
 * token de sesión, así que se pide con fetch y se entrega como archivo local.
 */
export function Reportes() {
  const { mostrar } = useToast();
  const token = useAppSelector(selectToken);
  const { data: puestos } = usePuestosQuery();
  const { data: dashboard } = useDashboardQuery();

  const [dias, setDias] = useState(7);
  const [puestoId, setPuestoId] = useState<string | 'todos'>('todos');
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desde = desdeHace(dias);
  const hasta = diaLocal();

  const { data: resumen, isLoading } = useResumenReporteQuery({
    desde,
    hasta,
    ...(puestoId === 'todos' ? {} : { puestoId }),
  });

  async function descargar() {
    setError(null);
    setDescargando(true);

    try {
      const parametros = new URLSearchParams({ desde, hasta });
      if (puestoId !== 'todos') parametros.set('puestoId', puestoId);

      const respuesta = await fetch(`${BASE_API_URL}/reportes/excel?${parametros.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!respuesta.ok) {
        throw new Error('El servidor no pudo generar el reporte.');
      }

      const archivo = await respuesta.blob();
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `inocarne-${desde}-a-${hasta}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      mostrar('Reporte descargado');
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo descargar el reporte.');
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div>
      <h1 className={estilos.titulo}>Reportes</h1>
      <p className={estilos.bajada}>
        Del {desde.split('-').reverse().join('/')} al {hasta.split('-').reverse().join('/')}
      </p>

      <div className={propios.baldosas}>
        <Baldosa
          valor={dashboard?.resumen.conformes ?? 0}
          etiqueta="Puestos en regla hoy"
          color="var(--sem-verde)"
        />
        <Baldosa
          valor={dashboard?.resumen.conIncumplimiento ?? 0}
          etiqueta="Con incumplimiento hoy"
          color="var(--sem-rojo)"
        />
        <Baldosa
          valor={dashboard?.resumen.noConformidadesAbiertas ?? 0}
          etiqueta="Acciones abiertas"
          color="var(--chip-amarillo-texto)"
        />
        <Baldosa
          valor={dashboard?.resumen.mantenimientosVencidos ?? 0}
          etiqueta="Mantenimientos vencidos"
          color="var(--sem-rojo)"
        />
      </div>

      <div className={propios.formulario} style={{ maxWidth: 640 }}>
        <h2 className={estilos.subtitulo}>Generar reporte en Excel</h2>

        <div>
          <div className={estilos.apagado}>Rango de fechas</div>
          <div className={estilos.filtros}>
            {RANGOS.map((rango) => (
              <button
                key={rango.valor}
                type="button"
                aria-pressed={dias === rango.valor}
                onClick={() => setDias(rango.valor)}
                className={`${estilos.filtro} ${dias === rango.valor ? estilos.filtroActivo : ''}`}
              >
                {rango.etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className={estilos.apagado}>Puesto</div>
          <div className={estilos.filtros}>
            <button
              type="button"
              aria-pressed={puestoId === 'todos'}
              onClick={() => setPuestoId('todos')}
              className={`${estilos.filtro} ${puestoId === 'todos' ? estilos.filtroActivo : ''}`}
            >
              Todos
            </button>
            {puestos?.map((puesto) => (
              <button
                key={puesto.id}
                type="button"
                aria-pressed={puestoId === puesto.id}
                onClick={() => setPuestoId(puesto.id)}
                className={`${estilos.filtro} ${puestoId === puesto.id ? estilos.filtroActivo : ''}`}
              >
                P{puesto.numero}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Cargando texto="Contando los registros del período…" />
        ) : (
          resumen && (
            <ul className={estilos.apagado}>
              <li>{resumen.recepciones} recepciones</li>
              <li>{resumen.controles} controles horarios</li>
              <li>{resumen.limpiezas} checklists de limpieza</li>
              <li>{resumen.inspecciones} inspecciones</li>
              <li>{resumen.noConformidades} no conformidades</li>
              <li>{resumen.mantenimientos} mantenimientos</li>
            </ul>
          )
        )}

        {error && <Mensaje tipo="error">{error}</Mensaje>}

        <Boton
          variante="verde"
          anchoCompleto
          cargando={descargando}
          onClick={() => void descargar()}
        >
          Descargar Excel
        </Boton>
      </div>
    </div>
  );
}

function Baldosa({ valor, etiqueta, color }: { valor: number; etiqueta: string; color: string }) {
  return (
    <div className={propios.baldosa}>
      {/* Igual que en el panel: un cero no se pinta de alarma. */}
      <span
        className={propios.baldosaValor}
        style={{ color: valor === 0 ? 'var(--color-apagado)' : color }}
      >
        {valor}
      </span>
      <span className={propios.baldosaEtiqueta}>{etiqueta}</span>
    </div>
  );
}
