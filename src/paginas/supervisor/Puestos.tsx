import { useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectEsAdmin } from '@/features/auth/authSlice';
import {
  useActualizarUsuarioMutation,
  useCrearPuestoMutation,
  useCrearUsuarioMutation,
  usePuestosQuery,
  useRestablecerPasswordMutation,
  useUsuariosQuery,
} from '@/services/endpoints/catalogos';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CampoTexto,
  Cargando,
  Chip,
  GrupoPildoras,
  Icono,
  Mensaje,
  Modal,
  useToast,
  Vacio,
  type Opcion,
} from '@/componentes';
import type { Puesto as PuestoDelMercado, Rol, Usuario } from '@/types/dominio';
import estilos from './Tabla.module.css';
import propios from './Puestos.module.css';

const ROLES: readonly Opcion<Rol>[] = [
  { valor: 'puesto', etiqueta: 'Vendedor' },
  { valor: 'supervisor', etiqueta: 'Supervisor' },
  { valor: 'coordinador', etiqueta: 'Coordinador HACCP' },
  { valor: 'admin', etiqueta: 'Administrador' },
];

type Pestana = 'puestos' | 'vendedores' | 'supervision';

/** El puesto de una cuenta, que la API puede devolver poblado o como texto. */
function puestoDeLaCuenta(cuenta: Usuario): string | null {
  const referencia = cuenta.puestoId as unknown;
  if (!referencia) return null;
  if (typeof referencia === 'string') return referencia;
  return (referencia as { id?: string }).id ?? null;
}

/**
 * Puestos del mercado y las cuentas que los atienden.
 *
 * Van en pestañas separadas porque son dos cosas distintas y rara vez se miran
 * a la vez: el puesto existe aunque nadie lo atienda todavía. Cada pestaña es
 * una lista —lo que se consulta a diario— y crear, que es puntual, ocurre en
 * un modal.
 */
export function Puestos() {
  const { mostrar } = useToast();
  const esAdmin = useAppSelector(selectEsAdmin);

  const { data: puestos, isLoading } = usePuestosQuery();
  const { data: usuarios } = useUsuariosQuery();
  const [crearPuesto, { isLoading: creandoPuesto }] = useCrearPuestoMutation();
  const [crearUsuario, { isLoading: creandoUsuario }] = useCrearUsuarioMutation();
  const [actualizarUsuario] = useActualizarUsuarioMutation();
  const [restablecer] = useRestablecerPasswordMutation();

  const [pestana, setPestana] = useState<Pestana>('puestos');
  const [modal, setModal] = useState<'puesto' | 'cuenta' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [numero, setNumero] = useState('');
  const [nombrePuesto, setNombrePuesto] = useState('');
  const [responsable, setResponsable] = useState('');

  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('puesto');
  const [puestoId, setPuestoId] = useState<string | null>(null);

  if (isLoading) return <Cargando />;

  const cuentas = usuarios ?? [];
  const vendedores = cuentas.filter((cuenta) => cuenta.rol === 'puesto');
  const supervision = cuentas.filter((cuenta) => cuenta.rol !== 'puesto');

  const atendidoPor = (id: string): Usuario | undefined =>
    vendedores.find((cuenta) => puestoDeLaCuenta(cuenta) === id && cuenta.activo !== false);

  // Un puesto ya atendido no se ofrece: el servidor rechazaría la asignación.
  const puestosLibres = (puestos ?? []).filter(
    (puesto) => puesto.activo && !atendidoPor(puesto.id),
  );

  const nombreDelPuesto = (cuenta: Usuario): string => {
    const id = puestoDeLaCuenta(cuenta);
    return puestos?.find((puesto) => puesto.id === id)?.nombre ?? 'Sin puesto';
  };

  const pestanas: { valor: Pestana; etiqueta: string; total: number }[] = [
    { valor: 'puestos', etiqueta: 'Puestos', total: puestos?.length ?? 0 },
    { valor: 'vendedores', etiqueta: 'Vendedores', total: vendedores.length },
    ...(esAdmin
      ? [{ valor: 'supervision' as Pestana, etiqueta: 'Supervisión', total: supervision.length }]
      : []),
  ];

  async function guardarPuesto() {
    setError(null);
    try {
      const creado = await crearPuesto({
        numero: Number(numero),
        nombre: nombrePuesto.trim() || `Puesto ${numero}`,
        ...(responsable.trim() ? { responsable: responsable.trim() } : {}),
      }).unwrap();

      mostrar(`${creado.nombre} creado`);
      setNumero('');
      setNombrePuesto('');
      setResponsable('');
      setModal(null);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  async function guardarCuenta() {
    setError(null);
    try {
      await crearUsuario({
        nombre: nombre.trim(),
        usuario: usuario.trim().toLowerCase(),
        password,
        rol,
        ...(rol === 'puesto' ? { puestoId } : {}),
      }).unwrap();

      mostrar(`Cuenta ${usuario.trim().toLowerCase()} creada`);
      setNombre('');
      setUsuario('');
      setPassword('');
      setPuestoId(null);
      setModal(null);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  async function alternarActivo(cuenta: Usuario) {
    setError(null);
    try {
      await actualizarUsuario({ id: cuenta.id, activo: cuenta.activo === false }).unwrap();
      mostrar(cuenta.activo === false ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  async function nuevaPassword(cuenta: Usuario) {
    setError(null);
    // Provisional legible: el vendedor la cambia al entrar desde Mi cuenta.
    const provisional = `inocarne${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await restablecer({ id: cuenta.id, password: provisional }).unwrap();
      mostrar(`Contraseña de ${cuenta.usuario}: ${provisional} — anótela y entréguesela`);
    } catch (fallo) {
      setError(normalizarError(fallo as never).mensaje);
    }
  }

  function abrirAltaDeCuenta(rolInicial: Rol) {
    setError(null);
    setRol(rolInicial);
    setPuestoId(null);
    setModal('cuenta');
  }

  return (
    <div>
      <h1 className={estilos.titulo}>Puestos y vendedores</h1>
      <p className={estilos.bajada}>
        Cada puesto lo atiende una sola cuenta. Al desactivarla el puesto queda libre y sus
        registros se conservan.
      </p>

      <div className={propios.pestanas} role="tablist" aria-label="Puestos y cuentas">
        {pestanas.map((entrada) => (
          <button
            key={entrada.valor}
            type="button"
            role="tab"
            aria-selected={pestana === entrada.valor}
            onClick={() => setPestana(entrada.valor)}
            className={`${propios.pestana} ${
              pestana === entrada.valor ? propios.pestanaActiva : ''
            }`}
          >
            {entrada.etiqueta} <span className={propios.contador}>{entrada.total}</span>
          </button>
        ))}
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      {pestana === 'puestos' && (
        <ListaPuestos
          puestos={puestos ?? []}
          atendidoPor={atendidoPor}
          onNuevo={() => {
            setError(null);
            setModal('puesto');
          }}
        />
      )}

      {pestana === 'vendedores' && (
        <ListaCuentas
          cuentas={vendedores}
          descripcion={nombreDelPuesto}
          etiquetaAlta="Nuevo vendedor"
          vacio="Todavía no hay vendedores"
          detalleVacio="Cree la cuenta de cada puesto para que puedan registrar sus controles."
          onNuevo={() => abrirAltaDeCuenta('puesto')}
          onAlternar={alternarActivo}
          onPassword={nuevaPassword}
          gestionable
        />
      )}

      {pestana === 'supervision' && (
        <ListaCuentas
          cuentas={supervision}
          descripcion={(cuenta) =>
            ROLES.find((r) => r.valor === cuenta.rol)?.etiqueta ?? cuenta.rol
          }
          etiquetaAlta="Nueva cuenta"
          vacio="No hay cuentas de supervisión"
          onNuevo={() => abrirAltaDeCuenta('supervisor')}
          onAlternar={alternarActivo}
          onPassword={nuevaPassword}
          gestionable={esAdmin}
        />
      )}

      {/* ── Alta de puesto ─────────────────────────────────── */}
      <Modal
        titulo="Nuevo puesto"
        abierto={modal === 'puesto'}
        onCerrar={() => setModal(null)}
        acciones={
          <Boton cargando={creandoPuesto} disabled={!numero} onClick={() => void guardarPuesto()}>
            Crear el puesto
          </Boton>
        }
      >
        <CampoTexto
          etiqueta="Número"
          type="number"
          inputMode="numeric"
          placeholder="6"
          value={numero}
          onChange={(evento) => setNumero(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Nombre"
          ayuda="Opcional"
          placeholder={numero ? `Puesto ${numero}` : 'Puesto 6'}
          value={nombrePuesto}
          onChange={(evento) => setNombrePuesto(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Responsable"
          ayuda="Opcional"
          value={responsable}
          onChange={(evento) => setResponsable(evento.target.value)}
        />
        {error && <Mensaje tipo="error">{error}</Mensaje>}
      </Modal>

      {/* ── Alta de cuenta ─────────────────────────────────── */}
      <Modal
        titulo={rol === 'puesto' ? 'Nuevo vendedor' : 'Nueva cuenta'}
        abierto={modal === 'cuenta'}
        onCerrar={() => setModal(null)}
        acciones={
          <Boton
            cargando={creandoUsuario}
            disabled={!nombre || !usuario || password.length < 6 || (rol === 'puesto' && !puestoId)}
            onClick={() => void guardarCuenta()}
          >
            Crear
          </Boton>
        }
      >
        <CampoTexto
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Usuario"
          placeholder="puesto6"
          autoCapitalize="none"
          spellCheck={false}
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
        />
        <CampoTexto
          etiqueta="Contraseña inicial"
          ayuda="Mínimo 6 caracteres"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
        />

        {esAdmin && (
          <div>
            <div className={estilos.apagado}>Rol</div>
            <GrupoPildoras
              opciones={ROLES}
              elegida={rol}
              onElegir={setRol}
              compacto
              etiquetaGrupo="Rol del usuario"
            />
          </div>
        )}

        {rol === 'puesto' && (
          <div>
            <div className={estilos.apagado}>Puesto asignado</div>
            {puestosLibres.length === 0 ? (
              <Mensaje tipo="aviso">
                Todos los puestos activos ya tienen vendedor. Cree un puesto nuevo o desactive la
                cuenta que atiende el puesto que quiere reasignar.
              </Mensaje>
            ) : (
              <>
                <GrupoPildoras
                  opciones={puestosLibres.map((puesto) => ({
                    valor: puesto.id,
                    etiqueta: `Puesto ${puesto.numero}`,
                  }))}
                  elegida={puestoId}
                  onElegir={setPuestoId}
                  compacto
                  etiquetaGrupo="Puesto asignado"
                />
                <p className={propios.ayudaPuestos}>
                  <Icono nombre="atencion" tamano={14} /> Solo aparecen los puestos sin vendedor
                  asignado.
                </p>
              </>
            )}
          </div>
        )}

        {error && <Mensaje tipo="error">{error}</Mensaje>}
      </Modal>
    </div>
  );
}

/** Lista de puestos: una fila por puesto. */
function ListaPuestos({
  puestos,
  atendidoPor,
  onNuevo,
}: {
  puestos: PuestoDelMercado[];
  atendidoPor: (id: string) => Usuario | undefined;
  onNuevo: () => void;
}) {
  const sinVendedor = puestos.filter((puesto) => puesto.activo && !atendidoPor(puesto.id)).length;

  return (
    <section>
      <div className={propios.barra}>
        <span className={estilos.apagado}>
          {sinVendedor === 0 ? 'Todos atendidos' : `${sinVendedor} sin vendedor`}
        </span>
        <Boton compacto onClick={onNuevo}>
          Nuevo puesto
        </Boton>
      </div>

      {puestos.length === 0 ? (
        <Vacio
          icono="mercado"
          titulo="Todavía no hay puestos"
          detalle="Registre los puestos del mercado antes de crear sus cuentas."
        />
      ) : (
        <ul className={propios.lista}>
          {puestos.map((puesto) => {
            const vendedor = atendidoPor(puesto.id);
            return (
              <li key={puesto.id} className={propios.fila}>
                <div className={propios.principal}>
                  <span className={propios.nombre}>{puesto.nombre}</span>
                  <span className={propios.secundario}>
                    {vendedor
                      ? `${vendedor.nombre} · ${vendedor.usuario}`
                      : 'Sin vendedor asignado'}
                  </span>
                </div>
                {!puesto.activo ? (
                  <Chip tono="gris">Inactivo</Chip>
                ) : vendedor ? (
                  <Chip tono="verde" icono="cumple">
                    Atendido
                  </Chip>
                ) : (
                  <Chip tono="amarillo">Libre</Chip>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Lista de cuentas: una fila por cuenta, con sus acciones a la derecha. */
function ListaCuentas({
  cuentas,
  descripcion,
  etiquetaAlta,
  vacio,
  detalleVacio,
  onNuevo,
  onAlternar,
  onPassword,
  gestionable,
}: {
  cuentas: Usuario[];
  descripcion: (cuenta: Usuario) => string;
  etiquetaAlta: string;
  vacio: string;
  detalleVacio?: string;
  onNuevo: () => void;
  onAlternar: (cuenta: Usuario) => void;
  onPassword: (cuenta: Usuario) => void;
  gestionable: boolean;
}) {
  const activas = cuentas.filter((cuenta) => cuenta.activo !== false).length;

  return (
    <section>
      <div className={propios.barra}>
        <span className={estilos.apagado}>{activas} activa(s)</span>
        {gestionable && (
          <Boton compacto onClick={onNuevo}>
            {etiquetaAlta}
          </Boton>
        )}
      </div>

      {cuentas.length === 0 ? (
        <Vacio
          icono="usuarios"
          titulo={vacio}
          {...(detalleVacio ? { detalle: detalleVacio } : {})}
        />
      ) : (
        <ul className={propios.lista}>
          {cuentas.map((cuenta) => (
            <li key={cuenta.id} className={propios.fila}>
              <div className={propios.principal}>
                <span className={propios.nombre}>{cuenta.nombre}</span>
                <span className={propios.secundario}>
                  {cuenta.usuario} · {descripcion(cuenta)}
                </span>
              </div>

              <Chip tono={cuenta.activo === false ? 'gris' : 'verde'}>
                {cuenta.activo === false ? 'Inactiva' : 'Activa'}
              </Chip>

              {gestionable && (
                <div className={propios.acciones}>
                  <Boton variante="secundario" compacto onClick={() => onAlternar(cuenta)}>
                    {cuenta.activo === false ? 'Activar' : 'Desactivar'}
                  </Boton>
                  <Boton variante="secundario" compacto onClick={() => onPassword(cuenta)}>
                    Contraseña
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
