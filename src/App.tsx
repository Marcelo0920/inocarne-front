import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectAutenticado, selectEsSupervision } from '@/features/auth/authSlice';
import {
  RutaDeAdmin,
  RutaDePuesto,
  RutaDeSupervision,
  RutaProtegida,
} from '@/layouts/RutaProtegida';
import { LayoutSupervisor } from '@/layouts/LayoutSupervisor';
import { LayoutVendedor } from '@/layouts/LayoutVendedor';
import { Ingreso } from '@/paginas/comunes/Ingreso';
import { Inicio } from '@/paginas/vendedor/Inicio';
import { Recepcion } from '@/paginas/vendedor/Recepcion';
import { Controles } from '@/paginas/vendedor/Controles';
import { ControlFormulario } from '@/paginas/vendedor/ControlFormulario';
import { Limpieza, LimpiezaFormulario } from '@/paginas/vendedor/Limpieza';
import {
  Equipos,
  EquipoDetalle,
  EquipoNuevo,
  MantenimientoNuevo,
} from '@/paginas/vendedor/Equipos';
import { Historial } from '@/paginas/vendedor/Historial';
import { Notificaciones } from '@/paginas/vendedor/Notificaciones';
import { MiCuenta } from '@/paginas/comunes/MiCuenta';
import { Panel } from '@/paginas/supervisor/Panel';
import {
  InspeccionMenu,
  InspeccionMercado,
  InspeccionPuesto,
} from '@/paginas/supervisor/Inspecciones';
import { Acciones, AccionDetalle } from '@/paginas/supervisor/Acciones';
import { Mantenimientos } from '@/paginas/supervisor/Mantenimientos';
import { Capacitaciones } from '@/paginas/supervisor/Capacitaciones';
import { Plagas } from '@/paginas/supervisor/Plagas';
import { HistorialGeneral } from '@/paginas/supervisor/HistorialGeneral';
import { Reportes } from '@/paginas/supervisor/Reportes';
import { Mas } from '@/paginas/supervisor/Mas';
import { AdminConfiguracion } from '@/paginas/supervisor/Administracion';
import { Puestos } from '@/paginas/supervisor/Puestos';

/** Lleva a cada rol a su pantalla principal. */
function Raiz() {
  const autenticado = useAppSelector(selectAutenticado);
  const esSupervision = useAppSelector(selectEsSupervision);

  if (!autenticado) return <Navigate to="/ingreso" replace />;
  return <Navigate to={esSupervision ? '/panel' : '/inicio'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/ingreso" element={<Ingreso />} />
      <Route path="/" element={<Raiz />} />

      <Route element={<RutaProtegida />}>
        {/* ── Aplicación del vendedor ─────────────────────── */}
        <Route element={<RutaDePuesto />}>
          <Route element={<LayoutVendedor />}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/recepcion" element={<Recepcion />} />
            <Route path="/exhibicion" element={<Controles tipo="exhibicion" />} />
            <Route path="/exhibicion/:franja" element={<ControlFormulario tipo="exhibicion" />} />
            <Route path="/refrigeracion" element={<Controles tipo="refrigeracion" />} />
            <Route
              path="/refrigeracion/:franja"
              element={<ControlFormulario tipo="refrigeracion" />}
            />
            <Route path="/limpieza" element={<Limpieza />} />
            <Route path="/limpieza/:turno" element={<LimpiezaFormulario />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/equipos/nuevo" element={<EquipoNuevo />} />
            <Route path="/equipos/:id" element={<EquipoDetalle />} />
            <Route path="/equipos/:id/mantenimiento" element={<MantenimientoNuevo />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/notificaciones" element={<Notificaciones />} />
            <Route path="/mi-cuenta" element={<MiCuenta />} />
          </Route>
        </Route>

        {/* ── Panel de supervisión ────────────────────────── */}
        <Route element={<RutaDeSupervision />}>
          <Route element={<LayoutSupervisor />}>
            <Route path="/panel" element={<Panel />} />
            <Route path="/inspeccion" element={<InspeccionMenu />} />
            <Route path="/inspeccion/mercado" element={<InspeccionMercado />} />
            <Route path="/inspeccion/puesto" element={<InspeccionPuesto />} />
            <Route path="/acciones" element={<Acciones />} />
            <Route path="/acciones/:id" element={<AccionDetalle />} />
            <Route path="/mantenimientos" element={<Mantenimientos />} />
            <Route path="/capacitaciones" element={<Capacitaciones />} />
            <Route path="/plagas" element={<Plagas />} />
            <Route path="/historial-general" element={<HistorialGeneral />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/mas" element={<Mas />} />
            <Route path="/cuenta" element={<MiCuenta />} />
            <Route path="/usuarios" element={<Puestos />} />
            <Route element={<RutaDeAdmin />}>
              <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Raiz />} />
    </Routes>
  );
}
