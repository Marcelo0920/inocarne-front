import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectEtiquetaSesion } from '@/features/auth/authSlice';
import { useConfiguracionQuery, usePuestosQuery } from '@/services/endpoints/catalogos';
import {
  usePlantillasInspeccionQuery,
  useRegistrarInspeccionMutation,
} from '@/services/endpoints/supervision';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CampoArea,
  CampoHallazgo,
  CampoMedicion,
  Cargando,
  FilaChecklist,
  GrupoPildoras,
  ListaChecklist,
  Mensaje,
  SelloSistema,
  SubirEvidencia,
  Icono,
  Tarjeta,
  useToast,
  type Opcion,
} from '@/componentes';
import { diaLocal, horaLocal } from '@/domain/franjas';
import {
  aNumero,
  textoRangoPh,
  textoRangoTemperatura,
  validarPh,
  validarTemperatura,
} from '@/domain/validacion';
import type { Evidencia, TipoCarne, TipoInspeccion } from '@/types/dominio';
import estilos from './Inspecciones.module.css';

const CARNES: readonly Opcion<TipoCarne>[] = [
  { valor: 'res', etiqueta: 'Res' },
  { valor: 'cerdo', etiqueta: 'Cerdo' },
  { valor: 'cordero', etiqueta: 'Cordero' },
  { valor: 'pollo', etiqueta: 'Pollo' },
];

interface MarcaPunto {
  cumple: boolean | null;
  comentario: string;
}

/** Menú de inspecciones: en el teléfono es la entrada a las dos pantallas. */
export function InspeccionMenu() {
  const navegar = useNavigate();

  const opciones = [
    {
      ruta: '/inspeccion/mercado',
      icono: 'mercado' as const,
      titulo: 'Condiciones del mercado',
      detalle: '10 puntos · una vez al día',
    },
    {
      ruta: '/inspeccion/puesto',
      icono: 'inspeccion' as const,
      titulo: 'Por puesto de venta',
      detalle: '14 puntos · puestos al azar',
    },
  ];

  return (
    <div>
      <h1 className={estilos.titulo}>Inspecciones</h1>
      <div className={estilos.menu}>
        {opciones.map((opcion) => (
          <Tarjeta key={opcion.ruta} onClick={() => navegar(opcion.ruta)}>
            <div className={estilos.menuFila}>
              <span className={estilos.menuIcono}>
                <Icono nombre={opcion.icono} tamano={26} />
              </span>
              <span className={estilos.menuTexto}>
                <span className={estilos.menuTitulo}>{opcion.titulo}</span>
                <span className={estilos.menuDetalle}>{opcion.detalle}</span>
              </span>
              <Icono nombre="avanzar" tamano={22} className={estilos.flecha} />
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

/**
 * Inspección del mercado o de un puesto (punto 11).
 *
 * Marcar "No cumple" abre el campo del hallazgo: ese texto es el que viaja a la
 * no conformidad que el servidor crea solo, con el puesto, la fecha, la hora y
 * el supervisor ya cargados.
 */
function Inspeccion({ tipo }: { tipo: TipoInspeccion }) {
  const { mostrar } = useToast();
  const supervisor = useAppSelector(selectEtiquetaSesion);

  const { data: plantillas, isLoading } = usePlantillasInspeccionQuery();
  const { data: configuracion } = useConfiguracionQuery();
  const { data: puestos } = usePuestosQuery({ activo: true });
  const [registrar, { isLoading: guardando }] = useRegistrarInspeccionMutation();

  const [puestoId, setPuestoId] = useState<string | null>(null);
  const [marcas, setMarcas] = useState<Record<string, MarcaPunto>>({});
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<Evidencia[]>([]);
  const [temperatura, setTemperatura] = useState('');
  const [ph, setPh] = useState('');
  const [tipoCarne, setTipoCarne] = useState<TipoCarne | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // La inspección siempre es de algún puesto, así que la pantalla arranca con
  // el primero elegido: el recorrido del mercado va en orden y elegirlo a mano
  // cada vez es un paso que no decide nada. Solo aplica al cargar la lista;
  // después manda lo que el supervisor haya tocado.
  useEffect(() => {
    if (tipo !== 'puesto' || puestoId !== null) return;
    const primero = puestos?.[0];
    if (primero) setPuestoId(primero.id);
  }, [tipo, puestos, puestoId]);

  if (isLoading || !plantillas || !configuracion) return <Cargando />;

  const esDePuesto = tipo === 'puesto';
  const puntos = esDePuesto ? plantillas.puesto : plantillas.mercado;
  const validacionTemperatura = validarTemperatura(temperatura, configuracion);
  const validacionPh = validarPh(ph, tipoCarne, configuracion);

  const incumplidos = puntos.filter((punto) => marcas[punto]?.cumple === false);
  const sinMarcar = puntos.filter((punto) => marcas[punto]?.cumple === undefined).length;

  function marcar(punto: string, cumple: boolean) {
    setMarcas((previas) => ({
      ...previas,
      [punto]: { cumple, comentario: previas[punto]?.comentario ?? '' },
    }));
  }

  function comentar(punto: string, comentario: string) {
    setMarcas((previas) => ({
      ...previas,
      [punto]: { cumple: previas[punto]?.cumple ?? false, comentario },
    }));
  }

  function limpiar() {
    setMarcas({});
    setObservaciones('');
    setFotos([]);
    setTemperatura('');
    setPh('');
    setTipoCarne(null);
    setFaltantes([]);
  }

  async function guardar() {
    setError(null);
    const falta: string[] = [];
    if (esDePuesto && !puestoId) falta.push('el puesto a inspeccionar');
    if (sinMarcar > 0)
      falta.push(
        sinMarcar === 1
          ? 'marcar el punto que falta del checklist'
          : `marcar los ${sinMarcar} puntos que faltan del checklist`,
      );
    if (ph.trim() !== '' && !tipoCarne) falta.push('el tipo de carne para evaluar el pH');
    setFaltantes(falta);
    if (falta.length > 0) return;

    const medicion =
      temperatura.trim() !== '' || ph.trim() !== ''
        ? {
            ...(aNumero(temperatura) !== null ? { temperatura: aNumero(temperatura)! } : {}),
            ...(aNumero(ph) !== null ? { ph: aNumero(ph)! } : {}),
            ...(tipoCarne ? { tipoCarne } : {}),
          }
        : undefined;

    try {
      const resultado = await registrar({
        tipo,
        ...(esDePuesto ? { puestoId: puestoId! } : {}),
        items: puntos.map((nombre) => ({
          nombre,
          cumple: marcas[nombre]!.cumple!,
          ...(marcas[nombre]?.comentario ? { comentario: marcas[nombre]!.comentario } : {}),
        })),
        ...(medicion ? { medicion } : {}),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        fotos,
      }).unwrap();

      const generadas = resultado.noConformidades.length;
      mostrar(
        generadas > 0
          ? `Inspección guardada · se creó ${generadas === 1 ? 'una no conformidad' : `${generadas} no conformidades`}`
          : 'Inspección guardada · sin hallazgos',
      );
      limpiar();
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  const nombrePuesto = puestos?.find((puesto) => puesto.id === puestoId)?.nombre ?? '';

  return (
    <div>
      <h1 className={estilos.titulo}>
        {esDePuesto
          ? 'Inspección por puesto de venta'
          : 'Inspección de condiciones generales del mercado'}
      </h1>

      {esDePuesto && (
        <p className={estilos.bajada}>
          Cada "No cumple" crea la no conformidad automáticamente, con puesto, fecha, hora,
          supervisor y hallazgo ya cargados.
        </p>
      )}

      <SelloSistema>
        {diaLocal()} · {horaLocal()} · {supervisor} — registrados por el sistema
      </SelloSistema>

      {esDePuesto && (
        <div className={estilos.selectorPuesto}>
          <GrupoPildoras
            opciones={(puestos ?? []).map((puesto) => ({
              valor: puesto.id,
              etiqueta: `Puesto ${puesto.numero}`,
            }))}
            elegida={puestoId}
            onElegir={setPuestoId}
            etiquetaGrupo="Puesto a inspeccionar"
          />
        </div>
      )}

      <div className={estilos.columnas}>
        <ListaChecklist>
          {puntos.map((punto) => (
            <FilaChecklist
              key={punto}
              nombre={punto}
              valor={marcas[punto]?.cumple ?? null}
              onMarcar={(cumple) => marcar(punto, cumple)}
            >
              {marcas[punto]?.cumple === false && (
                <CampoHallazgo
                  valor={marcas[punto]?.comentario ?? ''}
                  onCambio={(texto) => comentar(punto, texto)}
                />
              )}
            </FilaChecklist>
          ))}
        </ListaChecklist>

        <aside className={estilos.lateral}>
          <Tarjeta>
            <div className={estilos.tituloLateral}>Mediciones (opcional)</div>
            <div className={estilos.campos}>
              <CampoMedicion
                etiqueta="Temperatura (°C)"
                ayuda={textoRangoTemperatura(configuracion)}
                valor={temperatura}
                onCambio={setTemperatura}
                validacion={validacionTemperatura}
              />
              <div>
                <div className={estilos.etiquetaCampo}>Tipo de carne</div>
                <GrupoPildoras
                  opciones={CARNES}
                  elegida={tipoCarne}
                  onElegir={setTipoCarne}
                  compacto
                  etiquetaGrupo="Tipo de carne de la medición"
                />
              </div>
              <CampoMedicion
                etiqueta="pH"
                ayuda={textoRangoPh(tipoCarne, configuracion)}
                valor={ph}
                onCambio={setPh}
                validacion={validacionPh}
                deshabilitado={!tipoCarne}
              />
            </div>
          </Tarjeta>

          <Tarjeta>
            <CampoArea
              etiqueta={esDePuesto ? 'Observaciones generales' : 'Comentarios'}
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
            />
          </Tarjeta>

          <SubirEvidencia
            subcarpeta="inspecciones"
            evidencias={fotos}
            onCambio={setFotos}
            etiqueta="Adjuntar evidencia"
            maximo={8}
          />

          {incumplidos.length > 0 && (
            <Mensaje tipo="aviso">
              {incumplidos.length} punto(s) marcados como "No cumple" generarán su acción correctiva
              al guardar.
            </Mensaje>
          )}

          {faltantes.length > 0 && (
            <Mensaje tipo="error" detalle={faltantes}>
              Antes de guardar falta:
            </Mensaje>
          )}
          {error && <Mensaje tipo="error">{error}</Mensaje>}

          <Boton anchoCompleto cargando={guardando} onClick={() => void guardar()}>
            {esDePuesto && nombrePuesto
              ? `Guardar inspección de ${nombrePuesto}`
              : 'Guardar inspección'}
          </Boton>
        </aside>
      </div>
    </div>
  );
}

export function InspeccionMercado() {
  return <Inspeccion tipo="mercado" />;
}

export function InspeccionPuesto() {
  return <Inspeccion tipo="puesto" />;
}
