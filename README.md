# INOCARNE — Interfaz web

Frontend del sistema de control sanitario de carne fresca.

**React 19 · TypeScript · Vite · Redux Toolkit · RTK Query · React Router · CSS Modules**

---

## Puesta en marcha

```bash
npm install
npm run dev        # http://localhost:5173
```

En desarrollo `VITE_API_URL` va vacía y Vite redirige `/api` a
`http://localhost:4000`; basta con tener el backend corriendo. Para producción
se completa `VITE_API_URL` con la dirección del backend desplegado.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas |
| `npm run typecheck` | Verificación de tipos |
| `npm run lint` | Análisis estático |
| `npm run build` | Compilación de producción |

Cuentas del `npm run seed` del backend: `puesto1` … `puesto5`, `supervisor`,
`coordinador` y `admin`, todas con la contraseña `inocarne2026`.

---

## Cómo está organizado

```
src/
  app/            tienda, hooks tipados, efectos y proveedor
  features/
    auth/         sesión, permisos por rol, persistencia
    conexion/     cola de registros pendientes y su reenvío
  services/       RTK Query: definición única y un archivo por área
  domain/         reglas del lado del cliente
                  · franjas.ts     estado de las franjas y sus etiquetas
                  · validacion.ts  rangos de temperatura y pH en vivo
  componentes/    15 piezas compartidas, cada una con su CSS Module
  layouts/        armazón del vendedor, del supervisor y guardas de ruta
  paginas/
    vendedor/     las nueve pantallas del puesto
    supervisor/   los nueve módulos de supervisión
    comunes/      ingreso y cuenta
  styles/         tokens.css con la paleta del diseño
  types/dominio   tipos compartidos con la API
```

### Dos aplicaciones, una base

El vendedor y el supervisor son aplicaciones distintas dentro del mismo
proyecto, separadas por guardas de ruta: quien entra con una cuenta de puesto
nunca llega al panel, y quien supervisa no ve la pantalla del puesto. Comparten
los componentes, los tokens y la capa de datos.

El panel del supervisor es **uno solo, responsivo**: barra lateral con los nueve
módulos en escritorio; en el teléfono, cinco pestañas abajo y el resto detrás de
"Más". La matriz de puestos por control se convierte en tarjetas cuando no hay
ancho para una tabla.

### Los tokens vienen del diseño

`styles/tokens.css` tiene los valores exactos de los tableros de Claude Design.
Hay **dos familias del semáforo** que no deben confundirse: el punto es un color
sólido (`--sem-verde`) y el chip es un fondo pálido con texto oscuro
(`--chip-verde-fondo` / `--chip-verde-texto`). Ningún componente escribe un
color a mano.

### Qué se calcula aquí y qué manda el servidor

El servidor decide todo lo que queda registrado: la hora, el cumplimiento, si
una medición está dentro de rango, el semáforo. El frontend solo:

- **Valida mientras se escribe**, con las mismas reglas, para que el vendedor
  vea el resultado antes de guardar y no lo descubra en un error del servidor.
- **Afina `pendiente` en `ahora`.** La API distingue cuatro estados, y
  `pendiente` cubre tanto "todavía falta" como "le toca en este momento". Para
  el vendedor no es lo mismo, así que la diferencia se calcula aquí comparando
  la hora local con la tolerancia configurada. Es el único estado que no viene
  del servidor.

### Cola de registros pendientes

Si la señal se corta al guardar un control o un checklist, el registro se guarda
en la cola y se reenvía solo al recuperar la conexión; el vendedor ve un aviso
arriba y sigue trabajando. Un `409` cuenta como enviado —el intento anterior sí
llegó—, un rechazo de validación se descarta y un error del servidor se
reintenta hasta cinco veces. Nunca se guarda una fecha propia: la pone el
servidor al recibirlo, igual que en un envío normal.

### Fotografías

Se comprimen en el navegador antes de subirlas (1600 px de lado máximo), se
suben a `POST /api/archivos` y al registro solo se le adjunta la referencia que
devuelve la API. Así el registro viaja como un JSON pequeño y la cuota del plan
gratuito rinde mucho más. La firma de la recepción se dibuja con el dedo y sigue
el mismo camino.

---

## Pruebas

```bash
npm test
```

**78 pruebas** sobre la tienda real y con `fetch` simulado:

```
tests/authSlice.test.ts    sesión, persistencia y permisos por rol
tests/colaSlice.test.ts    estados de la cola y avisos al vendedor
tests/baseQuery.test.ts    traducción de errores a mensajes entendibles
tests/store.test.ts        ingreso, expiración de sesión, invalidación de caché
tests/cola.test.ts         reenvío en serie, conflictos, reintentos y reconexión
tests/pantallas.test.tsx   pantallas del vendedor
tests/supervisor.test.tsx  panel, inspecciones y acciones correctivas
```

Cubren, entre otras cosas: que un vendedor no llegue al panel del supervisor,
que la validación de temperatura reaccione al escribir, que el quinto estado
"Le toca ahora" se derive bien, que marcar "No cumple" abra el campo del
hallazgo y avise que se creará la acción correctiva, y que no se pueda cerrar
una no conformidad sin haber registrado antes qué se hizo.
