import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectEsSupervision, selectUsuario } from '@/features/auth/authSlice';
import { cerrarSesion, useCambiarPasswordMutation } from '@/services/endpoints/auth';
import { normalizarError } from '@/services/baseQuery';
import {
  Boton,
  CabeceraAtras,
  CampoTexto,
  Icono,
  Mensaje,
  Modal,
  Tarjeta,
  useToast,
} from '@/componentes';
import estilos from './MiCuenta.module.css';

/**
 * Datos de la sesión y cambio de contraseña.
 *
 * El vendedor recibe una contraseña inicial del administrador; esta es la
 * pantalla donde la reemplaza por una suya.
 */
export function MiCuenta() {
  const navegar = useNavigate();
  const despachar = useAppDispatch();
  const { mostrar } = useToast();
  const usuario = useAppSelector(selectUsuario);
  const esSupervision = useAppSelector(selectEsSupervision);
  const [cambiarPassword, { isLoading }] = useCambiarPasswordMutation();

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Record<string, string> | undefined>();
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  async function guardar() {
    setError(null);
    setDetalle(undefined);

    if (nueva !== repetida) {
      setError('La contraseña nueva y su repetición no coinciden.');
      return;
    }

    try {
      await cambiarPassword({ passwordActual: actual, passwordNueva: nueva }).unwrap();
      setActual('');
      setNueva('');
      setRepetida('');
      mostrar('La contraseña fue actualizada');
    } catch (fallo) {
      const normalizado = normalizarError(fallo as never);
      setError(normalizado.mensaje);
      setDetalle(normalizado.detalle);
    }
  }

  function salir() {
    despachar(cerrarSesion());
    navegar('/ingreso', { replace: true });
  }

  return (
    <div className={estilos.pagina}>
      {/* Salir vive en la cabecera y no al pie: en un teléfono bajo, el pie
          queda debajo del formulario y hay que adivinar que existe. */}
      <CabeceraAtras
        titulo="Mi cuenta"
        volverA={esSupervision ? '/panel' : '/inicio'}
        acciones={
          <Boton variante="secundario" compacto onClick={() => setConfirmandoSalida(true)}>
            <Icono nombre="salir" tamano={18} />
            Salir
          </Boton>
        }
      />

      <Tarjeta>
        <dl className={estilos.datos}>
          <div>
            <dt className={estilos.etiqueta}>Nombre</dt>
            <dd className={estilos.valor}>{usuario?.nombre}</dd>
          </div>
          <div>
            <dt className={estilos.etiqueta}>Usuario</dt>
            <dd className={estilos.valor}>{usuario?.usuario}</dd>
          </div>
          {usuario?.puesto && (
            <div>
              <dt className={estilos.etiqueta}>Puesto</dt>
              <dd className={estilos.valor}>{usuario.puesto.nombre}</dd>
            </div>
          )}
        </dl>
      </Tarjeta>

      <h2 className={estilos.subtitulo}>Cambiar la contraseña</h2>

      <CampoTexto
        etiqueta="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={actual}
        onChange={(evento) => setActual(evento.target.value)}
        error={detalle?.passwordActual}
      />
      <CampoTexto
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        ayuda="Mínimo 6 caracteres"
        value={nueva}
        onChange={(evento) => setNueva(evento.target.value)}
        error={detalle?.passwordNueva}
      />
      <CampoTexto
        etiqueta="Repita la contraseña nueva"
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(evento) => setRepetida(evento.target.value)}
      />

      {error && <Mensaje tipo="error">{error}</Mensaje>}

      <Boton
        anchoCompleto
        cargando={isLoading}
        disabled={!actual || !nueva}
        onClick={() => void guardar()}
      >
        Guardar la contraseña
      </Boton>

      <Modal
        titulo="¿Cerrar la sesión?"
        abierto={confirmandoSalida}
        onCerrar={() => setConfirmandoSalida(false)}
        acciones={
          <Boton variante="secundario" onClick={salir}>
            Sí, cerrar sesión
          </Boton>
        }
      >
        <p>
          Para volver a entrar necesitará su usuario y su contraseña. Los registros que ya guardó
          quedan en el sistema.
        </p>
      </Modal>
    </div>
  );
}
