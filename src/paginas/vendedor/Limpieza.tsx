import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch } from '@/app/hooks';
import { encolado } from '@/features/conexion/colaSlice';
import {
  usePlantillaLimpiezaQuery,
  useDiaDeLimpiezaQuery,
  useRegistrarLimpiezaMutation,
} from '@/services/endpoints/registros';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CabeceraAtras,
  CampoArea,
  Cargando,
  Chip,
  FilaChecklist,
  ListaChecklist,
  Mensaje,
  PuntosPendientes,
  SelloSistema,
  SubirEvidencia,
  Tarjeta,
  useToast,
} from '@/componentes';
import type { Evidencia, TurnoLimpieza } from '@/types/dominio';
import estilos from './Formulario.module.css';

/** Los dos turnos del día. */
export function Limpieza() {
  const navegar = useNavigate();
  const { data: dia, isLoading } = useDiaDeLimpiezaQuery();

  if (isLoading) {
    return (
      <div>
        <CabeceraAtras titulo="Limpieza y desinfección" volverA="/inicio" />
        <Cargando />
      </div>
    );
  }

  const turnos = dia?.turnos ?? [];

  return (
    <div>
      <CabeceraAtras titulo="Limpieza y desinfección" volverA="/inicio" />
      <p className={estilos.subtitulo}>Dos veces al día: al abrir y al cerrar el puesto</p>

      <div className={estilos.lista}>
        {turnos.map((turno) => (
          <Tarjeta key={turno.turno}>
            <div className={estilos.filaFranja}>
              <div className={estilos.franjaCentro}>
                <div className={estilos.etiqueta}>
                  Limpieza {turno.turno === 'inicial' ? 'inicial' : 'final'}
                </div>
                <span className={estilos.franjaDetalle}>
                  {turno.registro
                    ? `Registrada · ${turno.cumple ? 'todo cumple' : `${turno.registro.incumplimientos.length} no cumple`}`
                    : turno.turno === 'inicial'
                      ? 'Al abrir el puesto'
                      : 'Al cerrar el puesto'}
                </span>
              </div>
              {turno.registrado ? (
                <Chip tono={turno.cumple ? 'verde' : 'rojo'}>
                  {turno.cumple ? 'Hecha' : 'Con fallas'}
                </Chip>
              ) : (
                <Boton compacto onClick={() => navegar(`/limpieza/${turno.turno}`)}>
                  Llenar
                </Boton>
              )}
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

/** Checklist de un turno: los diez puntos que exige el punto 9. */
export function LimpiezaFormulario() {
  const navegar = useNavigate();
  const despachar = useAppDispatch();
  const { mostrar } = useToast();
  const { turno = 'inicial' } = useParams<{ turno: TurnoLimpieza }>();

  const { data: plantilla, isLoading } = usePlantillaLimpiezaQuery();
  const [registrar, { isLoading: guardando }] = useRegistrarLimpiezaMutation();

  const [marcas, setMarcas] = useState<Record<string, boolean>>({});
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<Evidencia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [intentado, setIntentado] = useState(false);

  if (isLoading || !plantilla) return <Cargando />;

  const puntos = plantilla.puntos;
  const sinMarcar = puntos.filter((punto) => marcas[punto] === undefined).length;
  const incumplen = puntos.filter((punto) => marcas[punto] === false).length;

  async function guardar() {
    setIntentado(true);
    setError(null);
    if (sinMarcar > 0) return;

    const cuerpo = {
      turno: turno as TurnoLimpieza,
      items: puntos.map((nombre) => ({ nombre, cumple: marcas[nombre]! })),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      fotos,
    };

    try {
      await registrar(cuerpo).unwrap();
      mostrar(
        incumplen > 0
          ? `Checklist guardado · ${incumplen} "no cumple" se informó al supervisor`
          : 'Checklist guardado · todo cumple',
      );
      navegar('/limpieza');
    } catch (fallo) {
      const normalizado = normalizarError(fallo as never);
      if (normalizado.status === 'OFFLINE') {
        despachar(
          encolado({
            tipo: 'limpieza',
            url: '/limpiezas',
            cuerpo,
            descripcion: `Limpieza ${turno}`,
          }),
        );
        mostrar('Sin conexión: el checklist se guardó y se enviará al recuperarla.');
        navegar('/limpieza');
        return;
      }
      setError(normalizado.mensaje);
    }
  }

  return (
    <div className={estilos.formulario}>
      <CabeceraAtras
        titulo={`Limpieza ${turno === 'final' ? 'final' : 'inicial'}`}
        volverA="/limpieza"
      />

      <SelloSistema>
        Marque cada punto. Cualquier "No cumple" se informa al supervisor.
      </SelloSistema>

      <ListaChecklist>
        {puntos.map((punto) => (
          <FilaChecklist
            key={punto}
            nombre={punto}
            valor={marcas[punto] ?? null}
            onMarcar={(cumple) => setMarcas((previas) => ({ ...previas, [punto]: cumple }))}
          />
        ))}
      </ListaChecklist>

      {intentado && <PuntosPendientes cantidad={sinMarcar} />}

      <CampoArea
        etiqueta="Observaciones (opcional)"
        value={observaciones}
        onChange={(evento) => setObservaciones(evento.target.value)}
      />

      <SubirEvidencia
        subcarpeta="limpiezas"
        evidencias={fotos}
        onCambio={setFotos}
        etiqueta="Fotografía de evidencia (opcional)"
      />

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton anchoCompleto cargando={guardando} onClick={() => void guardar()}>
        Guardar checklist
      </Boton>
    </div>
  );
}
