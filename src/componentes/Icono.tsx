import {
  AlertTriangle,
  ArrowRight,
  Beef,
  Bell,
  Bug,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Cog,
  Download,
  Droplets,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PenLine,
  Search,
  Snowflake,
  Thermometer,
  Trash2,
  User,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de iconos de la aplicación.
 *
 * Se usan iconos y no emojis: el emoji lo dibuja cada sistema operativo a su
 * manera —en un Android viejo ni siquiera existe— y en una herramienta de
 * control sanitario terminaba desentonando. Estos son trazos vectoriales,
 * idénticos en todos los teléfonos, y acompañan al color del semáforo sin
 * depender de él.
 *
 * Ninguna pantalla importa la librería directamente: piden un nombre de esta
 * lista. Cambiar de librería es cambiar solo este archivo.
 */
const CATALOGO = {
  // Módulos y secciones
  panel: LayoutDashboard,
  mercado: Building2,
  inspeccion: Search,
  acciones: AlertTriangle,
  mantenimiento: Wrench,
  capacitacion: GraduationCap,
  plagas: Bug,
  historial: ClipboardList,
  reportes: FileSpreadsheet,
  mas: MoreHorizontal,
  usuarios: Users,
  configuracion: Cog,
  cuenta: User,
  clave: KeyRound,
  salir: LogOut,

  // Registros del puesto
  recepcion: Beef,
  exhibicion: Thermometer,
  refrigeracion: Snowflake,
  limpieza: Droplets,
  equipos: Wrench,
  notificaciones: Bell,

  // Acciones e indicadores
  cumple: Check,
  noCumple: X,
  atencion: AlertTriangle,
  verificado: CheckCircle2,
  reloj: Clock,
  camara: Camera,
  adjunto: FileText,
  firma: PenLine,
  descargar: Download,
  eliminar: Trash2,
  atras: ChevronLeft,
  avanzar: ChevronRight,
  flecha: ArrowRight,
  cerrar: X,
  vacio: Inbox,
  enLinea: Wifi,
  sinConexion: WifiOff,
} as const;

export type NombreIcono = keyof typeof CATALOGO;

interface Props {
  nombre: NombreIcono;
  /** Tamaño en píxeles. El texto que acompaña manda: el icono no debe gritar. */
  tamano?: number;
  /** Solo si el icono aporta significado propio; si repite al texto de al lado, se omite. */
  etiqueta?: string;
  className?: string;
}

export function Icono({ nombre, tamano = 20, etiqueta, className }: Props) {
  const Componente: LucideIcon = CATALOGO[nombre];

  return (
    <Componente
      size={tamano}
      strokeWidth={2}
      className={className}
      aria-hidden={etiqueta ? undefined : true}
      aria-label={etiqueta}
      role={etiqueta ? 'img' : undefined}
      focusable="false"
    />
  );
}
