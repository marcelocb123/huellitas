# Huellitas v7 — adopciones + servicios

Versión de Huellitas que mantiene el funcionamiento compartido de reportes y añade dos cambios principales:

## Adopta

- Las mascotas de adopción ya no son datos ficticios.
- Las cuentas vinculadas publican y administran mascotas reales para adopción.
- La publicación aparece **solo** en el apartado `Adopta`.
- Foto, nombre, especie, edad, tamaño, distrito, descripción y contacto.
- El responsable puede marcarla como `Adoptado` o eliminarla; el cambio se refleja para todos.
- Las demás personas pueden enviar una solicitud de adopción.
- El responsable puede ver y gestionar las solicitudes.

## Servicios

- Se solucionó el fallo que dejaba la sección vacía.
- Incluye un directorio inicial de veterinarias reales de Lima, con teléfonos, horarios, dirección, web/fuente y botón `Cómo llegar`.
- Los datos fueron verificados online el 21/09/2026; la app avisa que horarios y teléfonos pueden cambiar.

## Supabase

Antes de probar Adopta, ejecuta `supabase-adoptions.sql` en Supabase > SQL Editor.

Para habilitar solicitudes y notificaciones en una base que ya está en uso, usa el despliegue en dos etapas descrito en `supabase-adoption-notifications-predeploy.sql` y `supabase-adoption-notifications-lockdown.sql`. La etapa previa al merge crea las tablas y triggers, copia los contactos existentes y conserva compatibilidad con la versión pública actual. Después de desplegar el PR, la etapa final restringe la columna de contacto antigua. Ninguna etapa elimina publicaciones ni solicitudes.

`supabase-adoption-notifications.sql` contiene la instalación completa para una base aislada o un entorno nuevo. En producción con la app existente, sigue las dos etapas anteriores; no ejecutes el archivo completo antes del merge.

En Authentication > Sign In / Providers, habilita Email/Password, la confirmación de correo y **Allow manual linking**. Las nuevas publicaciones y solicitudes de adopción requieren una cuenta vinculada con correo verificado para poder recuperarlas en otro dispositivo. Una sesión anónima existente conserva el mismo usuario y sus datos al vincular un correo; iniciar sesión en una cuenta distinta no combina automáticamente los datos anónimos locales.

Para probar el flujo con dos personas: inicia sesión con la cuenta del responsable y publica una mascota; en otro dispositivo o perfil privado, inicia sesión con una cuenta distinta y envía una solicitud; vuelve a la cuenta responsable para aceptarla o rechazarla. El solicitante verá el aviso y el estado en Mi espacio. El teléfono del responsable solo se devuelve a la cuenta solicitante cuando la solicitud está aceptada. Aceptar una solicitud no marca la publicación como adoptada.

La URL y la Publishable key están en `supabase-config.js`. En Supabase Auth, confirma Email/Password, verificación de correo, Allow manual linking y las Redirect URLs para el dominio de Huellitas.

## Integración

Despliegue de producción: 1) revisa la configuración de Auth y ejecuta `supabase-adoption-notifications-predeploy.sql`; 2) confirma que las tablas y triggers están listos; 3) integra el PR para desplegar la nueva app; 4) valida que la app nueva funciona y luego ejecuta `supabase-adoption-notifications-lockdown.sql`; 5) comprueba creación de publicación, solicitud y notificación. No ejecutes el SQL de instalación completa en producción.
