import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConfiguracionQuery } from '@/services/endpoints/catalogos';
import { useRegistrarControlMutation } from '@/services/endpoints/registros';
import { normalizarError } from '@/services/baseQuery';
import { useAppDispatch } from '@/app/hooks';
import { encolado } from '@/features/conexion/colaSlice';
import {
  Boton,
  CabeceraAtras,
  CampoMedicion,
  Cargando,
  GrupoPildoras,
  Mensaje,
  SelloSistema,
  useToast,
  type Opcion,
} from '@/componentes';
import { estadoPrevisto, horaLocal } from '@/domain/franjas';
import {
  aNumero,
  textoRangoPh,
  textoRangoTemperatura,
  validarPh,
  validarTemperatura,
} from '@/domain/validacion';
import type { TipoCarne, TipoControl } from '@/types/dominio';
import estilos from './Formulario.module.css';

const CARNES: readonly Opcion<TipoCarne>[] = [
  { valor: 'res', etiqueta: 'Res' },
  { valor: 'cerdo', etiqueta: 'Cerdo' },
  { valor: 'cordero', etiqueta: 'Cordero' },
  { valor: 'pollo', etiqueta: 'Pollo' },
];

/**
 * Registro de un control horario.
 *
 * El de exhibición mide la carne y necesita pH y tipo; el de refrigeración mide
 * el equipo y solo lleva temperatura. Antes de guardar se avisa cómo quedará el
 * registro —a tiempo o con retraso—, que es lo que decide el servidor con la
 * hora real de llegada.
 */
export function ControlFormulario({ tipo }: { tipo: TipoControl }) {
  const navegar = useNavigate();
  const despachar = useAppDispatch();
  const { mostrar } = useToast();
  const { franja = '' } = useParams();

  const { data: configuracion, isLoading } = useConfiguracionQuery();
  const [registrar, { isLoading: guardando }] = useRegistrarControlMutation();

  const [tipoCarne, setTipoCarne] = useState<TipoCarne | null>(null);
  const [temperatura, setTemperatura] = useState('');
  const [ph, setPh] = useState('');
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !configuracion) return <Cargando />;

  const esExhibicion = tipo === 'exhibicion';
  const rutaLista = esExhibicion ? '/exhibicion' : '/refrigeracion';
  const validacionTemperatura = validarTemperatura(temperatura, configuracion);
  const validacionPh = validarPh(ph, tipoCarne, configuracion);

  function queFalta(): string[] {
    const falta: string[] = [];
    if (esExhibicion && !tipoCarne) falta.push('el tipo de carne');
    if (aNumero(temperatura) === null) falta.push('la temperatura');
    if (esExhibicion && aNumero(ph) === null) falta.push('el pH');
    return falta;
  }

  async function guardar() {
    setError(null);
    const falta = queFalta();
    setFaltantes(falta);
    if (falta.length > 0) return;

    const cuerpo = {
      tipo,
      franjaProgramada: franja,
      temperatura: aNumero(temperatura)!,
      ...(esExhibicion ? { ph: aNumero(ph)!, tipoCarne: tipoCarne! } : {}),
    };

    try {
      const control = await registrar(cuerpo).unwrap();
      mostrar(
        `Control guardado · ${control.cumplimiento === 'a_tiempo' ? 'a tiempo' : 'con retraso'}` +
          (control.dentroRango ? '' : ' · valor fuera de rango'),
      );
      navegar(rutaLista);
    } catch (fallo) {
      const normalizado = normalizarError(fallo as never);

      // Sin conexión el registro no se pierde: queda en cola y se envía solo.
      if (normalizado.status === 'OFFLINE') {
        despachar(
          encolado({
            tipo: 'control',
            url: '/controles',
            cuerpo,
            descripcion: `${esExhibicion ? 'Exhibición' : 'Refrigeración'} ${franja}`,
          }),
        );
        mostrar('Sin conexión: el control se guardó y se enviará al recuperarla.');
        navegar(rutaLista);
        return;
      }
      setError(normalizado.mensaje);
    }
  }

  return (
    <div className={estilos.formulario}>
      <CabeceraAtras
        titulo={`${esExhibicion ? 'Exhibición' : 'Refrigeración'} · ${franja}`}
        volverA={rutaLista}
      />

      <SelloSistema>
        Se registrará a las {horaLocal()} ·{' '}
        {estadoPrevisto(franja, configuracion.toleranciaMinutos)}
      </SelloSistema>

      {esExhibicion && (
        <div className={estilos.bloque}>
          <div className={estilos.etiqueta}>Tipo de carne</div>
          <GrupoPildoras
            opciones={CARNES}
            elegida={tipoCarne}
            onElegir={setTipoCarne}
            etiquetaGrupo="Tipo de carne"
          />
        </div>
      )}

      <CampoMedicion
        etiqueta={esExhibicion ? 'Temperatura (°C)' : 'Temperatura de la cámara (°C)'}
        ayuda={textoRangoTemperatura(configuracion)}
        valor={temperatura}
        onCambio={setTemperatura}
        validacion={validacionTemperatura}
      />

      {esExhibicion && (
        <CampoMedicion
          etiqueta="pH"
          ayuda={textoRangoPh(tipoCarne, configuracion)}
          valor={ph}
          onCambio={setPh}
          validacion={validacionPh}
          deshabilitado={!tipoCarne}
        />
      )}

      {faltantes.length > 0 && (
        <Mensaje tipo="error" detalle={faltantes}>
          Antes de guardar falta completar:
        </Mensaje>
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton anchoCompleto cargando={guardando} onClick={() => void guardar()}>
        Guardar control
      </Boton>
    </div>
  );
}
