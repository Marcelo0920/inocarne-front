import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCrearEquipoMutation,
  useEquipoQuery,
  useEquiposQuery,
  useMantenimientosQuery,
  useRegistrarMantenimientoMutation,
} from '@/services/endpoints/equipos';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CabeceraAtras,
  CampoArea,
  CampoTexto,
  Cargando,
  Chip,
  EsqueletoLista,
  GrupoPildoras,
  Mensaje,
  SelloSistema,
  SubirEvidencia,
  Tarjeta,
  useToast,
  Vacio,
  type Opcion,
} from '@/componentes';
import { diaLocal } from '@/domain/franjas';
import type { EstadoMantenimiento, Evidencia, TipoMantenimiento } from '@/types/dominio';
import estilos from './Formulario.module.css';
import propios from './Equipos.module.css';

const ESTADO: Record<EstadoMantenimiento, { tono: 'verde' | 'amarillo' | 'rojo'; texto: string }> =
  {
    realizado: { tono: 'verde', texto: 'Al día' },
    proximo: { tono: 'amarillo', texto: 'Próximo' },
    vencido: { tono: 'rojo', texto: 'Vencido' },
  };

const fechaCorta = (iso: string | null | undefined): string => {
  if (!iso) return 'Por definir';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

/** Inventario del puesto (punto 10.1). */
export function Equipos() {
  const navegar = useNavigate();
  const { data: equipos, isLoading } = useEquiposQuery();

  return (
    <div>
      <CabeceraAtras
        titulo="Mis equipos"
        volverA="/inicio"
        acciones={
          <Boton compacto onClick={() => navegar('/equipos/nuevo')}>
            + Equipo
          </Boton>
        }
      />

      {isLoading && <EsqueletoLista />}

      {!isLoading && (equipos?.length ?? 0) === 0 && (
        <Vacio
          icono="equipos"
          titulo="Todavía no registró ningún equipo"
          detalle="Registre los equipos que necesitan mantenimiento: refrigeración, balanza, termómetro y pH-metro."
        >
          <Boton onClick={() => navegar('/equipos/nuevo')}>Registrar el primero</Boton>
        </Vacio>
      )}

      <div className={estilos.lista}>
        {equipos?.map((equipo) => (
          <Tarjeta key={equipo.id} onClick={() => navegar(`/equipos/${equipo.id}`)}>
            <div className={estilos.filaFranja}>
              <div className={estilos.franjaCentro}>
                <div className={propios.nombre}>{equipo.nombre}</div>
                <span className={estilos.franjaDetalle}>
                  {equipo.codigo}
                  {equipo.marca ? ` · ${equipo.marca}` : ''}
                  {equipo.modelo ? ` ${equipo.modelo}` : ''}
                </span>
                <span className={estilos.franjaDetalle}>
                  Próximo mantenimiento: {fechaCorta(equipo.proximoMantenimiento)}
                </span>
              </div>
              <Chip tono={ESTADO[equipo.estadoMantenimiento].tono}>
                {ESTADO[equipo.estadoMantenimiento].texto}
              </Chip>
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

/** Ficha del equipo con su historial de mantenimientos. */
export function EquipoDetalle() {
  const navegar = useNavigate();
  const { id = '' } = useParams();
  const { data: equipo, isLoading } = useEquipoQuery(id);
  const { data: mantenimientos } = useMantenimientosQuery({ equipoId: id });

  if (isLoading || !equipo) return <Cargando />;

  const datos = [
    { etiqueta: 'Código', valor: equipo.codigo },
    { etiqueta: 'Estado', valor: equipo.estado },
    {
      etiqueta: 'Marca y modelo',
      valor: [equipo.marca, equipo.modelo].filter(Boolean).join(' ') || '—',
    },
    { etiqueta: 'N.º de serie', valor: equipo.numeroSerie ?? '—' },
    { etiqueta: 'Ubicación', valor: equipo.ubicacion ?? '—' },
    { etiqueta: 'Próximo mantenimiento', valor: fechaCorta(equipo.proximoMantenimiento) },
  ];

  return (
    <div>
      <CabeceraAtras titulo={equipo.nombre} volverA="/equipos" />

      <Tarjeta>
        <dl className={propios.ficha}>
          {datos.map((dato) => (
            <div key={dato.etiqueta}>
              <dt className={propios.fichaEtiqueta}>{dato.etiqueta}</dt>
              <dd className={propios.fichaValor}>{dato.valor}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <div className={propios.encabezadoSeccion}>
        <span className={estilos.etiqueta}>Mantenimientos</span>
        <Boton compacto onClick={() => navegar(`/equipos/${id}/mantenimiento`)}>
          + Registrar
        </Boton>
      </div>

      {(mantenimientos?.data.length ?? 0) === 0 ? (
        <Vacio
          icono="mantenimiento"
          titulo="Sin mantenimientos registrados"
          detalle="Registre cada mantenimiento con su respaldo para mantener la trazabilidad."
        />
      ) : (
        <div className={estilos.lista}>
          {mantenimientos?.data.map((mantenimiento) => (
            <Tarjeta key={mantenimiento.id}>
              <div className={propios.filaMantenimiento}>
                <strong>{fechaCorta(mantenimiento.fecha)}</strong>
                <Chip tono={mantenimiento.tipo === 'preventivo' ? 'verde' : 'amarillo'}>
                  {mantenimiento.tipo === 'preventivo' ? 'Preventivo' : 'Correctivo'}
                </Chip>
              </div>
              <div className={propios.descripcion}>{mantenimiento.descripcion}</div>
              <div className={estilos.franjaDetalle}>
                {mantenimiento.tecnico ?? 'Sin técnico indicado'}
                {mantenimiento.documentos.length > 0 ? ' · con respaldo adjunto' : ''}
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}

/** Alta de un equipo. El código lo asigna el sistema. */
export function EquipoNuevo() {
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const [crear, { isLoading }] = useCrearEquipoMutation();

  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [foto, setFoto] = useState<Evidencia[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    if (!nombre.trim()) {
      setError('Falta el nombre o tipo del equipo.');
      return;
    }

    try {
      const equipo = await crear({
        nombre: nombre.trim(),
        ...(marca.trim() ? { marca: marca.trim() } : {}),
        ...(modelo.trim() ? { modelo: modelo.trim() } : {}),
        ...(numeroSerie.trim() ? { numeroSerie: numeroSerie.trim() } : {}),
        ...(ubicacion.trim() ? { ubicacion: ubicacion.trim() } : {}),
        ...(foto[0] ? { foto: foto[0] } : {}),
      }).unwrap();

      mostrar(`Equipo registrado con el código ${equipo.codigo}`);
      navegar('/equipos');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  return (
    <div className={estilos.formulario}>
      <CabeceraAtras titulo="Nuevo equipo" volverA="/equipos" />

      <CampoTexto
        etiqueta="Nombre o tipo"
        placeholder="Ej.: Balanza"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
      />

      <div className={estilos.dosColumnas}>
        <CampoTexto
          etiqueta="Marca"
          value={marca}
          onChange={(evento) => setMarca(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Modelo"
          value={modelo}
          onChange={(evento) => setModelo(evento.target.value)}
        />
      </div>

      <div className={estilos.dosColumnas}>
        <CampoTexto
          etiqueta="N.º de serie"
          value={numeroSerie}
          onChange={(evento) => setNumeroSerie(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Ubicación"
          placeholder="Ej.: Mesón"
          value={ubicacion}
          onChange={(evento) => setUbicacion(evento.target.value)}
        />
      </div>

      <SubirEvidencia
        subcarpeta="equipos"
        evidencias={foto}
        onCambio={setFoto}
        etiqueta="Fotografía del equipo"
        maximo={1}
      />

      <p className={estilos.nota}>
        El código único lo asigna el sistema. La fecha del próximo mantenimiento se define al
        registrar el primer mantenimiento.
      </p>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton anchoCompleto cargando={isLoading} onClick={() => void guardar()}>
        Guardar equipo
      </Boton>
    </div>
  );
}

const TIPOS: readonly Opcion<TipoMantenimiento>[] = [
  { valor: 'preventivo', etiqueta: 'Preventivo' },
  { valor: 'correctivo', etiqueta: 'Correctivo' },
];

/** Registro de un mantenimiento realizado (punto 10.3). */
export function MantenimientoNuevo() {
  const navegar = useNavigate();
  const { mostrar } = useToast();
  const { id = '' } = useParams();
  const { data: equipo } = useEquipoQuery(id);
  const [registrar, { isLoading }] = useRegistrarMantenimientoMutation();

  const [tipo, setTipo] = useState<TipoMantenimiento | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [proximo, setProximo] = useState('');
  const [documentos, setDocumentos] = useState<Evidencia[]>([]);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    const falta: string[] = [];
    if (!tipo) falta.push('el tipo de mantenimiento');
    if (!descripcion.trim()) falta.push('la descripción del trabajo');
    setFaltantes(falta);
    if (falta.length > 0) return;

    try {
      await registrar({
        equipoId: id,
        fecha: diaLocal(),
        tipo: tipo!,
        descripcion: descripcion.trim(),
        ...(tecnico.trim() ? { tecnico: tecnico.trim() } : {}),
        ...(proximo ? { proximoMantenimiento: proximo } : {}),
        documentos,
      }).unwrap();

      mostrar('Mantenimiento registrado');
      navegar(`/equipos/${id}`);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  return (
    <div className={estilos.formulario}>
      <CabeceraAtras titulo="Nuevo mantenimiento" volverA={`/equipos/${id}`} />

      <SelloSistema>
        {equipo ? `${equipo.nombre} · ${equipo.codigo} · ` : ''}Fecha: {diaLocal()}
      </SelloSistema>

      <div className={estilos.bloque}>
        <div className={estilos.etiqueta}>Tipo</div>
        <GrupoPildoras
          opciones={TIPOS}
          elegida={tipo}
          onElegir={setTipo}
          etiquetaGrupo="Tipo de mantenimiento"
        />
        <span className={estilos.ayuda}>
          Preventivo: programado, para evitar fallas. Correctivo: por una falla o daño detectado.
        </span>
      </div>

      <CampoArea
        etiqueta="Descripción del trabajo"
        placeholder="¿Qué se hizo?"
        value={descripcion}
        onChange={(evento) => setDescripcion(evento.target.value)}
      />

      <CampoTexto
        etiqueta="Técnico o empresa"
        placeholder="Ej.: Refritec Ltda."
        value={tecnico}
        onChange={(evento) => setTecnico(evento.target.value)}
      />

      <CampoTexto
        etiqueta="Fecha del próximo mantenimiento"
        type="date"
        value={proximo}
        onChange={(evento) => setProximo(evento.target.value)}
      />

      <SubirEvidencia
        subcarpeta="mantenimientos"
        evidencias={documentos}
        onCambio={setDocumentos}
        etiqueta="Adjuntar respaldo (factura, recibo o certificado)"
      />

      {faltantes.length > 0 && (
        <Mensaje tipo="error" detalle={faltantes}>
          Antes de guardar falta completar:
        </Mensaje>
      )}
      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton anchoCompleto cargando={isLoading} onClick={() => void guardar()}>
        Guardar mantenimiento
      </Boton>
    </div>
  );
}
