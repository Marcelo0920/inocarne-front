import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectEtiquetaSesion } from '@/features/auth/authSlice';
import { cerrarSesion } from '@/services/endpoints/auth';
import { useNoConformidadesQuery } from '@/services/endpoints/supervision';
import { useEquiposQuery } from '@/services/endpoints/equipos';
import { BannerConexion, Boton, Icono, type NombreIcono } from '@/componentes';
import { diaLocal, horaLocal } from '@/domain/franjas';
import estilos from './LayoutSupervisor.module.css';

interface Modulo {
  ruta: string;
  icono: NombreIcono;
  etiqueta: string;
}

/** Los nueve módulos, en el orden de la barra lateral del diseño. */
const MODULOS: Modulo[] = [
  { ruta: '/panel', icono: 'panel', etiqueta: 'Panel general' },
  { ruta: '/inspeccion/mercado', icono: 'mercado', etiqueta: 'Inspección del mercado' },
  { ruta: '/inspeccion/puesto', icono: 'inspeccion', etiqueta: 'Inspección por puesto' },
  { ruta: '/acciones', icono: 'acciones', etiqueta: 'Acciones correctivas' },
  { ruta: '/mantenimientos', icono: 'mantenimiento', etiqueta: 'Mantenimientos' },
  { ruta: '/capacitaciones', icono: 'capacitacion', etiqueta: 'Capacitaciones' },
  { ruta: '/plagas', icono: 'plagas', etiqueta: 'Control de plagas' },
  { ruta: '/historial-general', icono: 'historial', etiqueta: 'Historial general' },
  { ruta: '/reportes', icono: 'reportes', etiqueta: 'Reportes' },
  { ruta: '/usuarios', icono: 'usuarios', etiqueta: 'Puestos y vendedores' },
];

/**
 * En el teléfono no caben nueve entradas: cinco pestañas y el resto detrás de
 * "Más", tal como está resuelto en el tablero móvil.
 */
const PESTANAS: Modulo[] = [
  { ruta: '/panel', icono: 'panel', etiqueta: 'Panel' },
  { ruta: '/inspeccion', icono: 'inspeccion', etiqueta: 'Inspección' },
  { ruta: '/acciones', icono: 'acciones', etiqueta: 'Acciones' },
  { ruta: '/historial-general', icono: 'historial', etiqueta: 'Historial' },
  { ruta: '/mas', icono: 'mas', etiqueta: 'Más' },
];

export function LayoutSupervisor() {
  const despachar = useAppDispatch();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const etiquetaSesion = useAppSelector(selectEtiquetaSesion);

  // Contadores de las insignias: lo que exige atención del supervisor.
  const { data: acciones } = useNoConformidadesQuery({ estado: 'pendiente', limit: 200 });
  const { data: equipos } = useEquiposQuery();

  const accionesPendientes = acciones?.meta.total ?? 0;
  const mantenimientosVencidos =
    equipos?.filter((equipo) => equipo.estadoMantenimiento === 'vencido').length ?? 0;

  const alertaDe = (ruta: string): number => {
    if (ruta === '/acciones') return accionesPendientes;
    if (ruta === '/mas' || ruta === '/mantenimientos') return mantenimientosVencidos;
    return 0;
  };

  function salir() {
    despachar(cerrarSesion());
    navegar('/ingreso', { replace: true });
  }

  return (
    <div className={estilos.aplicacion}>
      <nav className={estilos.barraLateral} aria-label="Módulos de supervisión">
        <div className={estilos.marca}>
          <div className={estilos.logo}>
            <Icono nombre="recepcion" tamano={22} />
          </div>
          <div>
            <div className={estilos.nombreMarca}>INOCARNE</div>
            <div className={estilos.rol}>Supervisión de calidad</div>
          </div>
        </div>

        {MODULOS.map((modulo) => (
          <NavLink
            key={modulo.ruta}
            to={modulo.ruta}
            className={({ isActive }) =>
              `${estilos.enlace} ${isActive ? estilos.enlaceActivo : ''}`
            }
          >
            <Icono nombre={modulo.icono} tamano={18} />
            <span className={estilos.enlaceEtiqueta}>{modulo.etiqueta}</span>
            {alertaDe(modulo.ruta) > 0 && (
              <span className={estilos.contador}>{alertaDe(modulo.ruta)}</span>
            )}
          </NavLink>
        ))}

        <div className={estilos.pie}>
          <div className={estilos.pieNombre}>{etiquetaSesion}</div>
          <div className={estilos.pieFecha}>
            {diaLocal()} · {horaLocal()}
          </div>
          <Boton variante="texto" onClick={() => navegar('/cuenta')}>
            Mi cuenta
          </Boton>
          <Boton variante="texto" onClick={salir}>
            Cerrar sesión
          </Boton>
        </div>
      </nav>

      <div className={estilos.aplicacion} style={{ flex: 1 }}>
        <BannerConexion />
        <main className={estilos.contenido}>
          <Outlet />
        </main>
      </div>

      <nav className={estilos.barraInferior} aria-label="Secciones">
        {PESTANAS.map((pestana) => {
          const activa = pathname.startsWith(pestana.ruta);
          const alerta = alertaDe(pestana.ruta);
          return (
            <NavLink
              key={pestana.ruta}
              to={pestana.ruta}
              className={`${estilos.pestana} ${activa ? estilos.pestanaActiva : ''}`}
            >
              <Icono nombre={pestana.icono} tamano={21} className={estilos.icono} />
              <span>{pestana.etiqueta}</span>
              {alerta > 0 && <span className={estilos.alerta}>{alerta}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
