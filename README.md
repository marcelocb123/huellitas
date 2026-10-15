# Huellitas v7 — adopciones + servicios

Versión de Huellitas que mantiene el funcionamiento compartido de reportes y añade dos cambios principales:

## Adopta

- Las mascotas de adopción ya no son datos ficticios.
- Cualquier usuario conectado puede publicar una mascota real para adopción.
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

Para activar la bandeja de solicitudes y notificaciones, ejecuta después `supabase-adoption-notifications.sql` en Supabase > SQL Editor. La actualización conserva las publicaciones y solicitudes existentes; copia los teléfonos de adopción a una tabla privada, mantiene la columna original pero revoca su lectura desde la app, y crea las políticas, avisos y suscripciones en tiempo real.

En Authentication > Sign In / Providers, habilita Email/Password, la confirmación de correo y **Allow manual linking**. Las nuevas publicaciones y solicitudes de adopción requieren una cuenta vinculada con correo verificado para poder recuperarlas en otro dispositivo. Una sesión anónima existente conserva el mismo usuario y sus datos al vincular un correo; iniciar sesión en una cuenta distinta no combina automáticamente los datos anónimos locales.

Para probar el flujo con dos personas: inicia sesión con la cuenta del responsable y publica una mascota; en otro dispositivo o perfil privado, inicia sesión con una cuenta distinta y envía una solicitud; vuelve a la cuenta responsable para aceptarla o rechazarla. El solicitante verá el aviso y el estado en Mi espacio. El teléfono del responsable solo se devuelve a la cuenta solicitante cuando la solicitud está aceptada. Aceptar una solicitud no marca la publicación como adoptada.

La URL y la Publishable key están en `supabase-config.js`.

## Integración

Revisa e integra estos cambios mediante el Pull Request. Antes de habilitar esta versión para usuarios, ejecuta la actualización SQL y comprueba las opciones de autenticación indicadas arriba.
