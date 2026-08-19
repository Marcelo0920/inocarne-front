import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  avisoDeCierreLeido,
  selectAutenticado,
  selectEsSupervision,
  selectMotivoCierre,
} from '@/features/auth/authSlice';
import { useLoginMutation } from '@/services/endpoints/auth';
import { normalizarError } from '@/services/baseQuery';
import { BASE_API_URL } from '@/services/urlApi';
import { Boton, CampoTexto, Icono, Mensaje } from '@/componentes';
import estilos from './Ingreso.module.css';

export function Ingreso() {
  const despachar = useAppDispatch();
  const autenticado = useAppSelector(selectAutenticado);
  const esSupervision = useAppSelector(selectEsSupervision);
  const motivoCierre = useAppSelector(selectMotivoCierre);

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Record<string, string> | undefined>();

  const [login, { isLoading }] = useLoginMutation();

  if (autenticado) {
    return <Navigate to={esSupervision ? '/panel' : '/inicio'} replace />;
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    setDetalle(undefined);
    despachar(avisoDeCierreLeido());

    // El ingreso es la primera petición de la aplicación: si algo está mal
    // configurado, se ve acá. Se deja constancia en la consola de a dónde fue y
    // qué contestaron, porque el mensaje de pantalla no alcanza para saberlo.
    const destino = `${BASE_API_URL}/auth/login`;
    // eslint-disable-next-line no-console -- rastro de diagnóstico del despliegue
    console.info(`[INOCARNE] Ingreso → POST ${destino}`);

    try {
      await login({ usuario: usuario.trim().toLowerCase(), password }).unwrap();
      // eslint-disable-next-line no-console -- rastro de diagnóstico del despliegue
      console.info('[INOCARNE] Ingreso concedido');
    } catch (fallo) {
      const crudo = fallo as {
        status?: number | string;
        originalStatus?: number;
        data?: unknown;
        error?: string;
      };
      const cuerpo =
        typeof crudo.data === 'string' ? crudo.data.slice(0, 300) : JSON.stringify(crudo.data);

      console.error(
        `[INOCARNE] Falló el ingreso contra ${destino}`,
        {
          estado: crudo.status,
          estadoOriginal: crudo.originalStatus,
          detalleDeRed: crudo.error,
          respuesta: cuerpo,
        },
        // Una respuesta en HTML significa que contestó el servidor de archivos
        // del sitio, no la API: la dirección apunta al dominio equivocado.
        typeof crudo.data === 'string' && crudo.data.includes('<!doctype html')
          ? '⚠️ Contestó una página HTML, no la API. La compilación publicada apunta al dominio del propio sitio.'
          : '',
      );

      const normalizado = normalizarError(fallo as never);
      setError(normalizado.mensaje);
      setDetalle(normalizado.detalle);
    }
  }

  return (
    <div className={estilos.pantalla}>
      <form className={estilos.tarjeta} onSubmit={(evento) => void alEnviar(evento)}>
        <div className={estilos.marca}>
          <div className={estilos.logo}>
            <Icono nombre="recepcion" tamano={38} />
          </div>
          <h1 className={estilos.nombre}>INOCARNE</h1>
          <p className={estilos.bajada}>Control sanitario del mercado</p>
        </div>

        {/* Si la sesión se cerró sola, se explica por qué antes de que el
            usuario piense que escribió mal la contraseña. */}
        {motivoCierre && !error && <Mensaje tipo="aviso">{motivoCierre}</Mensaje>}

        <CampoTexto
          etiqueta="Usuario"
          placeholder="puesto3"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={usuario}
          onChange={(evento) => setUsuario(evento.target.value)}
          error={detalle?.usuario}
        />

        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          error={detalle?.password}
        />

        {error && <Mensaje tipo="error">{error}</Mensaje>}

        <Boton type="submit" anchoCompleto cargando={isLoading}>
          Entrar
        </Boton>
      </form>
    </div>
  );
}
