import { useAppSelector } from '@/app/hooks';
import {
  selectAvisoPendientes,
  selectEnLinea,
  selectHayPendientes,
} from '@/features/conexion/colaSlice';
import { Icono } from './Icono';
import estilos from './BannerConexion.module.css';

/**
 * Aviso de que hay registros esperando conexión.
 *
 * La señal dentro del mercado se corta, y el vendedor necesita saber que lo
 * que registró no se perdió. No aparece si no hay nada pendiente y hay red.
 */
export function BannerConexion() {
  const enLinea = useAppSelector(selectEnLinea);
  const hayPendientes = useAppSelector(selectHayPendientes);
  const aviso = useAppSelector(selectAvisoPendientes);

  if (enLinea && !hayPendientes) return null;

  if (!enLinea) {
    return (
      <div className={`${estilos.banner} ${estilos.sinConexion}`} role="status">
        <Icono nombre="sinConexion" tamano={18} className={estilos.icono} />
        <span>{aviso ?? 'Sin conexión. Puede seguir registrando: se enviará al recuperarla.'}</span>
      </div>
    );
  }

  return (
    <div className={`${estilos.banner} ${estilos.enviando}`} role="status">
      <Icono nombre="reloj" tamano={18} className={estilos.icono} />
      <span>{aviso}</span>
    </div>
  );
}
