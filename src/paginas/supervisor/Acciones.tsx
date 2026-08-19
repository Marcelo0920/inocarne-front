import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useActualizarNoConformidadMutation,
  useCerrarNoConformidadMutation,
  useNoConformidadesQuery,
  useNoConformidadQuery,
} from '@/services/endpoints/supervision';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CabeceraAtras,
  CampoArea,
  CampoTexto,
  Cargando,
  Chip,
  EsqueletoLista,
  Mensaje,
  SubirEvidencia,
  Tarjeta,
  useToast,
  Vacio,
} from '@/componentes';
import type { EstadoAccion, Evidencia, Semaforo } from '@/types/dominio';
import estilos from './Acciones.module.css';

const ESTADOS: Record<EstadoAccion, { tono: Semaforo; texto: string }> = {
  pendiente: { tono: 'amarillo', texto: 'Pendiente' },
  en_proceso: { tono: 'amarillo', texto: 'En proceso' },
  realizado: { tono: 'verde', texto: 'Realizado' },
  plazo_vencido: { tono: 'rojo', texto: 'Plazo vencido' },
};

const FILTROS: { valor: EstadoAccion | 'todas'; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'plazo_vencido', etiqueta: 'Plazo vencido' },
  { valor: 'realizado', etiqueta: 'Cerradas' },
];

const fechaCorta = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10).split('-').reverse().join('/') : 'sin plazo';

/** Numeración legible: la API guarda un correlativo simple. */
const numeroLegible = (numero: number, detectadaEn: string): string =>
  `NC-${detectadaEn.slice(0, 4)}-${String(numero).padStart(3, '0')}`;

/** Seguimiento de acciones correctivas (punto 14). */
export function Acciones() {
  const navegar = useNavigate();
  const [filtro, setFiltro] = useState<EstadoAccion | 'todas'>('todas');

  const { data, isLoading } = useNoConformidadesQuery({
    ...(filtro === 'todas' ? {} : { estado: filtro }),
    limit: 100,
  });

  const acciones = data?.data ?? [];
  const vencidas = acciones.filter((accion) => accion.estadoActual === 'plazo_vencido').length;
  const paraVerificar = acciones.filter((accion) => accion.listaParaVerificar).length;

  return (
    <div>
      <h1 className={estilos.titulo}>Acciones correctivas y no conformidades</h1>
      <p className={estilos.cadena}>
        Inspección → incumplimiento → no conformidad → acción correctiva → ejecución → verificación
        → cierre
      </p>

      {vencidas > 0 && (
        <Mensaje tipo="error">{vencidas} acción(es) superaron su fecha límite.</Mensaje>
      )}
      {paraVerificar > 0 && (
        <Mensaje tipo="exito">
          {paraVerificar} acción(es) tienen evidencia adjunta y esperan su verificación.
        </Mensaje>
      )}

      <div className={estilos.filtros} role="group" aria-label="Filtrar por estado">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={filtro === opcion.valor}
            onClick={() => setFiltro(opcion.valor)}
            className={`${estilos.filtro} ${filtro === opcion.valor ? estilos.filtroActivo : ''}`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {isLoading && <EsqueletoLista filas={4} />}

      {!isLoading && acciones.length === 0 && (
        <Vacio
          icono="verificado"
          titulo="No hay acciones en este estado"
          detalle="Las no conformidades se crean solas al marcar un punto como «No cumple» en una inspección."
        />
      )}

      <div className={estilos.lista}>
        {acciones.map((accion) => (
          <Tarjeta key={accion.id} onClick={() => navegar(`/acciones/${accion.id}`)}>
            <div className={estilos.filaTop}>
              <span className={estilos.numero}>
                {numeroLegible(accion.numero, accion.detectadaEn)}
              </span>
              <span className={estilos.puesto}>
                {typeof accion.puestoId === 'object' && accion.puestoId !== null
                  ? ((accion.puestoId as unknown as { nombre?: string }).nombre ?? 'Mercado')
                  : 'Mercado'}
              </span>
              <span className={estilos.espaciador} />
              <Chip tono={ESTADOS[accion.estadoActual].tono}>
                {ESTADOS[accion.estadoActual].texto}
              </Chip>
            </div>
            <div className={estilos.hallazgo}>{accion.hallazgo}</div>
            <div className={estilos.meta}>
              Detectada {fechaCorta(accion.detectadaEn)} · plazo {fechaCorta(accion.fechaLimite)}
              {accion.listaParaVerificar ? ' · con evidencia adjunta' : ''}
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

/** Detalle: definir la acción, seguirla y cerrarla tras verificar. */
export function AccionDetalle() {
  const { id = '' } = useParams();
  const { mostrar } = useToast();
  const { data: accion, isLoading } = useNoConformidadQuery(id);
  const [actualizar, { isLoading: guardando }] = useActualizarNoConformidadMutation();
  const [cerrar, { isLoading: cerrando }] = useCerrarNoConformidadMutation();

  const [accionCorrectiva, setAccionCorrectiva] = useState<string | null>(null);
  const [responsable, setResponsable] = useState<string | null>(null);
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState('');
  const [evidenciaCierre, setEvidenciaCierre] = useState<Evidencia[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !accion) return <Cargando />;

  const cerrada = accion.estado === 'realizado';
  const valorAccion = accionCorrectiva ?? accion.accionCorrectiva ?? '';
  const valorResponsable = responsable ?? accion.responsable ?? '';
  const valorFecha = fechaLimite ?? accion.fechaLimite?.slice(0, 10) ?? '';

  async function guardarSeguimiento() {
    setError(null);
    try {
      await actualizar({
        id,
        ...(accionCorrectiva !== null ? { accionCorrectiva } : {}),
        ...(responsable !== null ? { responsable } : {}),
        ...(fechaLimite ? { fechaLimite } : {}),
        estado: 'en_proceso',
      }).unwrap();
      mostrar('Seguimiento actualizado · se avisó al puesto');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  async function verificarYCerrar() {
    setError(null);
    try {
      await cerrar({
        id,
        ...(comentarioCierre.trim() ? { comentarioCierre: comentarioCierre.trim() } : {}),
        ...(evidenciaCierre.length > 0 ? { evidenciaCierre } : {}),
      }).unwrap();
      mostrar('Acción verificada y cerrada');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  return (
    <div className={estilos.detalle}>
      <CabeceraAtras
        titulo={numeroLegible(accion.numero, accion.detectadaEn)}
        volverA="/acciones"
        acciones={
          <Chip tono={ESTADOS[accion.estadoActual].tono} grande>
            {ESTADOS[accion.estadoActual].texto}
          </Chip>
        }
      />

      <section className={estilos.seccion}>
        <h2 className={estilos.seccionTitulo}>El hallazgo</h2>
        <dl className={estilos.datos}>
          <div>
            <dt className={estilos.datoEtiqueta}>Origen</dt>
            <dd className={estilos.datoValor}>{accion.origen}</dd>
          </div>
          <div>
            <dt className={estilos.datoEtiqueta}>Detección</dt>
            <dd className={estilos.datoValor}>{fechaCorta(accion.detectadaEn)}</dd>
          </div>
          <div>
            <dt className={estilos.datoEtiqueta}>Qué se encontró</dt>
            <dd className={estilos.datoValor}>{accion.hallazgo}</dd>
          </div>
        </dl>

        {accion.evidencia.length > 0 && (
          <div className={estilos.evidenciaBloque}>
            <span className={estilos.datoEtiqueta}>
              {accion.evidencia.length === 1
                ? 'Fotografía del hallazgo'
                : `Fotografías del hallazgo (${accion.evidencia.length})`}
            </span>
            <div className={estilos.evidencias}>
              {accion.evidencia.map((evidencia) => (
                // Se abre aparte porque la miniatura no alcanza para juzgar
                // lo que se ve en la foto.
                <a
                  key={evidencia.publicId}
                  href={evidencia.url}
                  target="_blank"
                  rel="noreferrer"
                  className={estilos.miniaturaEnlace}
                  title="Ver la fotografía en grande"
                >
                  <img
                    src={evidencia.url}
                    alt="Evidencia del hallazgo"
                    className={estilos.miniatura}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </section>

      {!cerrada && (
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Plan de acción</h2>
          <p className={estilos.seccionBajada}>
            Al guardarlo, el puesto recibe el aviso con lo que tiene que hacer y hasta cuándo.
          </p>

          <CampoArea
            etiqueta="Acción correctiva"
            placeholder="¿Qué hay que hacer para corregirlo?"
            value={valorAccion}
            onChange={(evento) => setAccionCorrectiva(evento.target.value)}
          />
          <CampoTexto
            etiqueta="Responsable"
            value={valorResponsable}
            onChange={(evento) => setResponsable(evento.target.value)}
          />
          <CampoTexto
            etiqueta="Fecha límite"
            type="date"
            value={valorFecha}
            onChange={(evento) => setFechaLimite(evento.target.value)}
          />

          <Boton
            variante="secundario"
            anchoCompleto
            cargando={guardando}
            onClick={() => void guardarSeguimiento()}
          >
            Guardar el seguimiento
          </Boton>
        </section>
      )}

      {!cerrada && (
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Verificar y cerrar</h2>

          {accion.evidenciaCierre.length > 0 && (
            <Mensaje tipo="exito">
              {accion.evidenciaCierre.length === 1
                ? 'El responsable adjuntó una evidencia de la ejecución.'
                : `El responsable adjuntó ${accion.evidenciaCierre.length} evidencias de la ejecución.`}
            </Mensaje>
          )}
          <CampoArea
            etiqueta="Comentario de la verificación"
            placeholder="¿Qué se comprobó en el sitio?"
            value={comentarioCierre}
            onChange={(evento) => setComentarioCierre(evento.target.value)}
          />
          <SubirEvidencia
            subcarpeta="no-conformidades"
            evidencias={evidenciaCierre}
            onCambio={setEvidenciaCierre}
            etiqueta="Evidencia de la verificación (opcional)"
          />
          <Boton
            variante="verde"
            anchoCompleto
            cargando={cerrando}
            disabled={!accion.accionCorrectiva && !accionCorrectiva}
            onClick={() => void verificarYCerrar()}
          >
            Verificar y cerrar
          </Boton>
          {!accion.accionCorrectiva && !accionCorrectiva && (
            <p className={estilos.nota}>
              Antes de cerrar hay que registrar cuál fue la acción correctiva aplicada.
            </p>
          )}
        </section>
      )}

      {/* Cerrada, el expediente pasa a consulta: se ve qué se hizo y quién lo
          verificó, que es lo que hay que mostrar en una auditoría. */}
      {cerrada && (
        <section className={estilos.seccion}>
          <h2 className={estilos.seccionTitulo}>Lo que se hizo</h2>
          <dl className={estilos.datos}>
            <div>
              <dt className={estilos.datoEtiqueta}>Acción correctiva</dt>
              <dd className={estilos.datoValor}>{accion.accionCorrectiva ?? 'Sin registrar'}</dd>
            </div>
            <div>
              <dt className={estilos.datoEtiqueta}>Responsable</dt>
              <dd className={estilos.datoValor}>{accion.responsable ?? 'Sin registrar'}</dd>
            </div>
            <div>
              <dt className={estilos.datoEtiqueta}>Verificación</dt>
              <dd className={estilos.datoValor}>
                {accion.verificadaEn ? fechaCorta(accion.verificadaEn) : 'Sin fecha'}
                {accion.comentarioCierre ? ` · ${accion.comentarioCierre}` : ''}
              </dd>
            </div>
          </dl>

          {accion.evidenciaCierre.length > 0 && (
            <div className={estilos.evidenciaBloque}>
              <span className={estilos.datoEtiqueta}>Evidencia de la ejecución</span>
              <div className={estilos.evidencias}>
                {accion.evidenciaCierre.map((evidencia) => (
                  <a
                    key={evidencia.publicId}
                    href={evidencia.url}
                    target="_blank"
                    rel="noreferrer"
                    className={estilos.miniaturaEnlace}
                    title="Ver la fotografía en grande"
                  >
                    <img
                      src={evidencia.url}
                      alt="Evidencia de la ejecución"
                      className={estilos.miniatura}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {error && <Mensaje tipo="error">{error}</Mensaje>}
    </div>
  );
}
