import type { Usuario } from '@/types/dominio';

/**
 * Sesión guardada en el navegador.
 *
 * El vendedor entra al puesto una vez y sigue trabajando toda la jornada, por
 * eso la sesión sobrevive a recargas y a cierres accidentales de la pestaña.
 * Solo se guardan el token y los datos del perfil; nunca la contraseña.
 */
const CLAVE = 'inocarne.sesion';

export interface SesionAlmacenada {
  token: string;
  usuario: Usuario;
}

function almacenamientoDisponible(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Modo privado o permisos denegados: la aplicación sigue funcionando,
    // solo que habrá que volver a ingresar al recargar.
    return null;
  }
}

export function leerSesion(): SesionAlmacenada | null {
  const almacenamiento = almacenamientoDisponible();
  if (!almacenamiento) return null;

  const crudo = almacenamiento.getItem(CLAVE);
  if (!crudo) return null;

  try {
    const datos = JSON.parse(crudo) as Partial<SesionAlmacenada>;
    if (typeof datos.token !== 'string' || !datos.usuario) return null;
    return { token: datos.token, usuario: datos.usuario };
  } catch {
    // Contenido corrupto: se descarta en lugar de romper el arranque.
    almacenamiento.removeItem(CLAVE);
    return null;
  }
}

export function guardarSesion(sesion: SesionAlmacenada): void {
  almacenamientoDisponible()?.setItem(CLAVE, JSON.stringify(sesion));
}

export function borrarSesion(): void {
  almacenamientoDisponible()?.removeItem(CLAVE);
}
