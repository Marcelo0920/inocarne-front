import { Outlet, useLocation } from 'react-router-dom';
import { BannerConexion } from '@/componentes';
import estilos from './LayoutVendedor.module.css';

/**
 * Armazón de la aplicación del vendedor.
 *
 * La pantalla de inicio dibuja su propia cabecera azul a sangre, así que en esa
 * ruta el contenedor no aplica márgenes.
 */
export function LayoutVendedor() {
  const { pathname } = useLocation();
  const esInicio = pathname === '/inicio';

  return (
    <div className={estilos.aplicacion}>
      <div className={estilos.marco}>
        <BannerConexion />
        <main className={`${estilos.contenido} ${esInicio ? estilos.sinRelleno : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
