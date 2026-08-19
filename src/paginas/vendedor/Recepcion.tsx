import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectUsuario } from '@/features/auth/authSlice';
import { useConfiguracionQuery } from '@/services/endpoints/catalogos';
import { useRegistrarRecepcionMutation } from '@/services/endpoints/registros';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CabeceraAtras,
  CampoArea,
  CampoMedicion,
  CampoTexto,
  Cargando,
  FilaChecklist,
  GrupoPildoras,
  LienzoFirma,
  ListaChecklist,
  Mensaje,
  SelloSistema,
  SubirEvidencia,
  useToast,
  type Opcion,
} from '@/componentes';
import { diaLocal, horaLocal } from '@/domain/franjas';
import {
  aNumero,
  fotoObligatoria,
  textoRangoPh,
  textoRangoTemperatura,
  validarPh,
  validarTemperatura,
} from '@/domain/validacion';
import type { Evidencia, TipoCarne } from '@/types/dominio';
import estilos from './Formulario.module.css';

const CARNES: readonly Opcion<TipoCarne>[] = [
  { valor: 'res', etiqueta: 'Res' },
  { valor: 'cerdo', etiqueta: 'Cerdo' },
  { valor: 'cordero', etiqueta: 'Cordero' },
  { valor: 'pollo', etiqueta: 'Pollo' },
];

/** Las cuatro condiciones organolépticas, con lo que se espera de cada una. */
const CONDICIONES = [
  { clave: 'color', etiqueta: 'Color', esperado: 'Uniforme, característico, brillante' },
  { clave: 'olor', etiqueta: 'Olor', esperado: 'Fresco, característico' },
  { clave: 'textura', etiqueta: 'Textura', esperado: 'Firme y elástica' },
  { clave: 'grasa', etiqueta: 'Grasa', esperado: 'Firme al tacto, blanco cremoso' },
] as const;

type ClaveCondicion = (typeof CONDICIONES)[number]['clave'];

/**
 * Recepción de carne (punto 6).
 *
 * No pide fecha ni hora: las pone el servidor al recibir el registro. La foto
 * se vuelve obligatoria en cuanto algo no cumple, con el mismo criterio que
 * aplica la API, para que el vendedor no se entere del requisito por un error.
 */
export function Recepcion() {
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const usuario = useAppSelector(selectUsuario);
  const { data: configuracion, isLoading } = useConfiguracionQuery();
  const [registrar, { isLoading: guardando }] = useRegistrarRecepcionMutation();

  const [proveedor, setProveedor] = useState('');
  const [tipoCarne, setTipoCarne] = useState<TipoCarne | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [ph, setPh] = useState('');
  const [condiciones, setCondiciones] = useState<Partial<Record<ClaveCondicion, boolean>>>({});
  const [resultado, setResultado] = useState<'aceptado' | 'rechazado' | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<Evidencia[]>([]);
  const [firma, setFirma] = useState<Evidencia | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !configuracion) return <Cargando texto="Cargando los rangos aceptados…" />;

  const validacionTemperatura = validarTemperatura(temperatura, configuracion);
  const validacionPh = validarPh(ph, tipoCarne, configuracion);
  const fotoRequerida = fotoObligatoria({
    resultado,
    temperatura: validacionTemperatura,
    ph: validacionPh,
    organolepticas: condiciones,
  });

  function queFalta(): string[] {
    const falta: string[] = [];
    if (!proveedor.trim()) falta.push('el proveedor');
    if (!tipoCarne) falta.push('el tipo de carne');
    if (aNumero(cantidad) === null) falta.push('la cantidad');
    if (aNumero(temperatura) === null) falta.push('la temperatura');
    if (aNumero(ph) === null) falta.push('el pH');
    if (CONDICIONES.some(({ clave }) => condiciones[clave] === undefined)) {
      falta.push('las condiciones de la carne');
    }
    if (!resultado) falta.push('el resultado');
    if (resultado === 'rechazado' && !motivoRechazo.trim()) falta.push('el motivo del rechazo');
    if (fotoRequerida && fotos.length === 0) falta.push('la fotografía (es obligatoria)');
    if (!firma) falta.push('la firma');
    return falta;
  }

  async function guardar() {
    setError(null);
    const falta = queFalta();
    setFaltantes(falta);
    if (falta.length > 0) return;

    try {
      const registro = await registrar({
        proveedor: proveedor.trim(),
        tipoCarne: tipoCarne!,
        cantidad: aNumero(cantidad)!,
        unidad: 'kg',
        temperatura: aNumero(temperatura)!,
        ph: aNumero(ph)!,
        organolepticas: {
          color: condiciones.color!,
          olor: condiciones.olor!,
          textura: condiciones.textura!,
          grasa: condiciones.grasa!,
        },
        resultado: resultado!,
        ...(motivoRechazo.trim() ? { motivoRechazo: motivoRechazo.trim() } : {}),
        firma: firma!,
        fotos,
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
      }).unwrap();

      // La hora que se confirma es la del servidor, no la del teléfono.
      const hora = new Intl.DateTimeFormat('es-BO', {
        timeZone: 'America/La_Paz',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(registro.registradoEn));

      mostrar(
        `Recepción guardada · ${hora}` +
          (registro.resultado === 'rechazado' ? ' · el supervisor verá el rechazo' : ''),
      );
      navegar('/inicio');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  return (
    <div className={estilos.formulario}>
      <CabeceraAtras titulo="Recepción de carne" volverA="/inicio" />

      <SelloSistema>
        Fecha y hora las pone el sistema: {diaLocal()} · {horaLocal()} · {usuario?.nombre}
      </SelloSistema>

      <CampoTexto
        etiqueta="Proveedor"
        placeholder="Ej.: Frigorífico Los Andes"
        value={proveedor}
        onChange={(evento) => setProveedor(evento.target.value)}
      />

      <div className={estilos.bloque}>
        <div className={estilos.etiqueta}>Tipo de carne</div>
        <GrupoPildoras
          opciones={CARNES}
          elegida={tipoCarne}
          onElegir={setTipoCarne}
          etiquetaGrupo="Tipo de carne"
        />
      </div>

      <CampoTexto
        etiqueta="Cantidad recibida (kg)"
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={cantidad}
        onChange={(evento) => setCantidad(evento.target.value)}
      />

      <CampoMedicion
        etiqueta="Temperatura (°C)"
        ayuda={textoRangoTemperatura(configuracion)}
        valor={temperatura}
        onCambio={setTemperatura}
        validacion={validacionTemperatura}
      />

      <CampoMedicion
        etiqueta="pH"
        ayuda={textoRangoPh(tipoCarne, configuracion)}
        valor={ph}
        onCambio={setPh}
        validacion={validacionPh}
        deshabilitado={!tipoCarne}
      />

      <div className={estilos.bloque}>
        <div className={estilos.etiqueta}>Condiciones de la carne</div>
        <ListaChecklist>
          {CONDICIONES.map((condicion) => (
            <FilaChecklist
              key={condicion.clave}
              nombre={condicion.etiqueta}
              esperado={condicion.esperado}
              valor={condiciones[condicion.clave] ?? null}
              onMarcar={(cumple) =>
                setCondiciones((previas) => ({ ...previas, [condicion.clave]: cumple }))
              }
              etiquetaSi="Bien"
              etiquetaNo="Mal"
            />
          ))}
        </ListaChecklist>
      </div>

      <div className={estilos.bloque}>
        <div className={estilos.etiqueta}>Resultado</div>
        <div className={estilos.dosColumnas}>
          <button
            type="button"
            aria-pressed={resultado === 'aceptado'}
            onClick={() => setResultado('aceptado')}
            className={`${estilos.opcionGrande} ${resultado === 'aceptado' ? estilos.aceptado : ''}`}
          >
            Aceptado
          </button>
          <button
            type="button"
            aria-pressed={resultado === 'rechazado'}
            onClick={() => setResultado('rechazado')}
            className={`${estilos.opcionGrande} ${resultado === 'rechazado' ? estilos.rechazado : ''}`}
          >
            Rechazado
          </button>
        </div>
      </div>

      {resultado === 'rechazado' && (
        <CampoArea
          etiqueta="Motivo del rechazo"
          placeholder="¿Por qué se rechaza la carne?"
          value={motivoRechazo}
          onChange={(evento) => setMotivoRechazo(evento.target.value)}
        />
      )}

      <SubirEvidencia
        subcarpeta="recepciones"
        evidencias={fotos}
        onCambio={setFotos}
        obligatoria={fotoRequerida}
      />

      <LienzoFirma firma={firma} onCambio={setFirma} />

      <CampoArea
        etiqueta="Observaciones (opcional)"
        value={observaciones}
        onChange={(evento) => setObservaciones(evento.target.value)}
      />

      {faltantes.length > 0 && (
        <Mensaje tipo="error" detalle={faltantes}>
          Antes de guardar falta completar:
        </Mensaje>
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton anchoCompleto cargando={guardando} onClick={() => void guardar()}>
        Guardar recepción
      </Boton>
      <p className={estilos.nota}>El registro no se puede editar ni borrar después de guardado.</p>
    </div>
  );
}
