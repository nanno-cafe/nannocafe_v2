# Publicar Nanno V2 sin reemplazar la app actual

La nueva web está en `app-v2/`. Ya usa el proyecto Supabase nuevo
`pcsiujgxdsbprxeikvbj`. La web anterior permanece en `app/`, con su configuración
original. No se migraron clientes, cafés ni QR, y no se publicó nada en GitHub.

## Qué subir

Usá `outputs/nanno-cafe-v2-publicar.zip`, generado desde `app-v2/`.
Descomprimilo: `index.html`, `customer.html`, `scan.html`, `config.js`, los
JavaScript, CSS e imágenes tienen que quedar directamente en la raíz del
repositorio nuevo. No subas el ZIP cerrado ni toda esta carpeta de desarrollo.
El paquete no incluye SQL, exportaciones de clientes ni claves privadas.

## GitHub, paso a paso

1. Creá un repositorio nuevo **público**, por ejemplo `nanno-cafe-v2`, en la cuenta
   que administrará esta prueba. No uses el repositorio de la app que atiende hoy.
2. Subí el CONTENIDO del ZIP descomprimido con **Add file > Upload files** y
   confirmá el commit. Verificá que `index.html` aparezca en la raíz.
3. En **Settings > Pages > Build and deployment**, elegí:
   - Source: **Deploy from a branch**.
   - Branch: **main**.
   - Folder: **/(root)**.
4. Guardá. GitHub mostrará la dirección cuando termine de publicar, similar a
   `https://TU_USUARIO.github.io/nanno-cafe-v2/`.
5. Abrí esa dirección e ingresá con el usuario que creaste en el Supabase nuevo.

No se necesita instalar Node, ejecutar un build ni configurar variables en GitHub.
La clave publishable de `config.js` es pública por diseño; el acceso a los datos
lo controlan Auth y los permisos de Supabase.

Referencia oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Conexión con Supabase

GitHub aloja la web y Supabase guarda los datos. La web llama directamente a
Supabase usando `SUPABASE_URL` y `SUPABASE_ANON_KEY` de `config.js` (este último
nombre se conserva por compatibilidad; su valor ya es la clave publishable).

La nueva base está configurada. No hay que volver a crear tablas ni conectar
GitHub con un plugin. Tener ambos servicios en cuentas diferentes tampoco
impide que funcione esta conexión.

Cuando tengas la dirección de GitHub Pages, en el proyecto NUEVO de Supabase:

1. **Authentication > URL Configuration > Site URL**: poné la dirección completa
   de la web, terminada en `/`.
2. **Redirect URLs**: agregá esa misma dirección terminada en `/index.html`.
   Ejemplo: `https://TU_USUARIO.github.io/nanno-cafe-v2/index.html`.
3. Guardá. Esto configura el regreso desde correos de recuperación; el login
   con contraseña no necesita cambiar para que funcione.

`PUBLIC_BASE_URL` queda vacío a propósito: cada QR generado usa la dirección
desde la que abrís la V2. Así una tarjeta de prueba no lleva a la web anterior.
Cuando definamos la URL definitiva se puede fijar allí con `/` al final.

Referencia oficial: https://supabase.com/docs/guides/auth/redirect-urls

## Activar Halloween

Ingresá como administrador y abrí **Configuración > Apariencia y temporada**.
Elegí **Nanno Halloween**, revisá la vista previa y tocá **Guardar diseño**.
Podés dejar las fechas vacías para aplicarlo ahora o elegir inicio y fin.
El día de fin se incluye completo, según horario de Argentina; luego vuelve
a Clásico. Los cambios llegan al abrir una pantalla, volver a ella o en el
refresco de apariencia de hasta un minuto mientras queda abierta.

La casilla de animaciones controla la app completa. También se respeta la
preferencia de movimiento reducido del dispositivo. Las tarjetas descargadas
son imágenes fijas: conservan la apariencia del momento de la descarga.

## Si por “base actual” te referís a la anterior con clientes

Cambiar URL y clave en `config.js` cambia a qué proyecto consulta la app, pero
NO copia datos ni agrega tablas. Por ahora mantenemos V2 en la base vacía, como
acordamos. Para pasar a uso real habrá que:

1. Exportar los datos actualizados de la base anterior y preparar una importación
   que conserve `id`, `qr_token`, cafés, regalos y fechas.
2. Mapear los usuarios antiguos del historial a los nuevos usuarios de Auth.
3. Importar y verificar los saldos, relaciones, secuencia de eventos y permisos.
4. Hacer el cambio final manteniendo la URL pública anterior, porque los QR
   repartidos apuntan a ella. Debe evitarse registrar ventas en ambas bases
   durante ese cambio para no perder movimientos.

No ejecutes el instalador V2 en la base anterior como atajo: ese proyecto
necesita una migración revisada para su estado real y sus usuarios.

## Probar y actualizar

- Probá alta de cliente, compartir tarjeta, carga de cafés, cuarto sello y canje.
- Probá cámara en un Android y un iPhone reales. La prueba automatizada cubre
  el ingreso manual cuando no hay cámara, pero no sustituye esos dispositivos.
- Las capturas de `outputs/v2/` usan clientes ficticios interceptados en el
  navegador; no se cargaron clientes de demostración en Supabase.
- Para regenerar el paquete después de editar código: `python tools/package_v2.py`.
- Para una vista local: `python -m http.server 8788 --bind 127.0.0.1 --directory app-v2`
  y abrir `http://127.0.0.1:8788/`. No abrir los HTML con doble clic.

El workflow original `.github/workflows/pages.yml` sigue publicando únicamente
`app/`. El repositorio de prueba se publica desde la raíz usando el ZIP; no
debe copiar ese workflow original.
