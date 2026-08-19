import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { selectEsAdmin } from '@/features/auth/authSlice';
import { useEquiposQuery } from '@/services/endpoints/equipos';
import { useCapacitacionesQuery, useControlPlagasQuery } from '@/services/endpoints/gestion';
import { Icono, Tarjeta, type NombreIcono } from '@/componentes';
import estilos from './Tabla.module.css';
import propios from './Gestion.module.css';

/**
 * Menú "Más" del teléfono.
 *
 * En el escritorio los nueve módulos entran en la barra lateral; aquí solo
 * caben cinco pestañas, así que el resto vive detrás de esta pantalla.
 */
export function Mas() {
  const navegar = useNavigate();
  const esAdmin = useAppSelector(selectEsAdmin);

  const { data: equipos } = useEquiposQuery();
  const { data: capacitaciones } = useCapacitacionesQuery({ estado: 'programada', limit: 5 });
  const { data: plagas } = useControlPlagasQuery({ estado: 'programada', limit: 5 });

  const vencidos =
    equipos?.filter((equipo) => equipo.estadoMantenimiento === 'vencido').length ?? 0;
  const proximos =
    equipos?.filter((equipo) => equipo.estadoMantenimiento === 'proximo').length ?? 0;
  const proximaCapacitacion = capacitaciones?.data?.[0];
  const proximaFumigacion = plagas?.data?.[0];

  const fecha = (iso: string): string => iso.slice(0, 10).split('-').reverse().join('/');

  const opciones = [
    {
      ruta: '/mantenimientos',
      icono: 'mantenimiento' as NombreIcono,
      titulo: 'Mantenimientos',
      detalle: `${vencidos} vencido(s) · ${proximos} próximo(s)`,
      alerta: vencidos,
    },
    {
      ruta: '/capacitaciones',
      icono: 'capacitacion' as NombreIcono,
      titulo: 'Capacitaciones',
      detalle: proximaCapacitacion
        ? `Próxima: ${fecha(proximaCapacitacion.fechaProgramada)} · ${proximaCapacitacion.hora}`
        : 'Sin capacitaciones programadas',
      alerta: 0,
    },
    {
      ruta: '/plagas',
      icono: 'plagas' as NombreIcono,
      titulo: 'Control de plagas',
      detalle: proximaFumigacion
        ? `Próxima: ${fecha(proximaFumigacion.fechaProgramada)} · avisos enviados`
        : 'Sin actividades programadas',
      alerta: 0,
    },
    {
      ruta: '/reportes',
      icono: 'reportes' as NombreIcono,
      titulo: 'Reportes',
      detalle: 'Resumen y descarga en Excel',
      alerta: 0,
    },
    {
      ruta: '/usuarios',
      icono: 'usuarios' as NombreIcono,
      titulo: 'Puestos y vendedores',
      detalle: 'Altas, bajas y contraseñas',
      alerta: 0,
    },
    // Los rangos y horarios afectan a todos los registros: solo el administrador.
    ...(esAdmin
      ? [
          {
            ruta: '/admin/configuracion',
            icono: 'configuracion' as NombreIcono,
            titulo: 'Configuración',
            detalle: 'Rangos, horarios y tolerancia',
            alerta: 0,
          },
        ]
      : []),
    {
      ruta: '/cuenta',
      icono: 'cuenta' as NombreIcono,
      titulo: 'Mi cuenta',
      detalle: 'Contraseña y cierre de sesión',
      alerta: 0,
    },
  ];

  return (
    <div>
      <h1 className={estilos.titulo}>Más módulos</h1>
      <div className={propios.menu} style={{ marginTop: 'var(--espacio-5)' }}>
        {opciones.map((opcion) => (
          <Tarjeta key={opcion.ruta} onClick={() => navegar(opcion.ruta)}>
            <div className={propios.menuFila}>
              <span className={propios.menuIcono}>
                <Icono nombre={opcion.icono} tamano={24} />
              </span>
              <span className={propios.menuTexto}>
                <span className={propios.menuTitulo}>{opcion.titulo}</span>
                <span className={propios.menuDetalle}>{opcion.detalle}</span>
              </span>
              {opcion.alerta > 0 && <span className={propios.insignia}>{opcion.alerta}</span>}
              <Icono nombre="avanzar" tamano={22} className={propios.flecha} />
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
