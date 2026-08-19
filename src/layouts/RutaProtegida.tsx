import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectAutenticado, selectEsAdmin, selectEsSupervision } from '@/features/auth/authSlice';

/** Exige sesión iniciada. Sin ella, se vuelve al ingreso. */
export function RutaProtegida() {
  const autenticado = useAppSelector(selectAutenticado);
  const ubicacion = useLocation();

  if (!autenticado) {
    return <Navigate to="/ingreso" state={{ desde: ubicacion.pathname }} replace />;
  }
  return <Outlet />;
}

/**
 * Cada rol tiene su aplicación. Si alguien llega a una dirección que no le
 * corresponde —un enlace guardado, por ejemplo— se lo lleva a la suya en lugar
 * de mostrarle un error.
 */
export function RutaDePuesto() {
  const esSupervision = useAppSelector(selectEsSupervision);
  return esSupervision ? <Navigate to="/panel" replace /> : <Outlet />;
}

export function RutaDeSupervision() {
  const esSupervision = useAppSelector(selectEsSupervision);
  return esSupervision ? <Outlet /> : <Navigate to="/inicio" replace />;
}

/**
 * Reservado al administrador: la configuración cambia los rangos y horarios
 * contra los que se evalúan todos los registros del mercado.
 */
export function RutaDeAdmin() {
  const esAdmin = useAppSelector(selectEsAdmin);
  return esAdmin ? <Outlet /> : <Navigate to="/panel" replace />;
}
