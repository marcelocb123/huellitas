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

Para habilitar solicitudes y notificaciones en una base que ya está en uso, sigue las etapas de `supabase-adoption-notifications-predeploy.sql` y `supabase-adoption-notifications-lockdown.sql`. La etapa previa crea tablas y triggers, copia los contactos existentes y mantiene la columna antigua disponible. También sincroniza los contactos de publicaciones creadas por la versión antigua y permite enviar su campo `status` solo como `pending`. La etapa final, después del despliegue, bloquea el acceso a la columna antigua, elimina el trigger de compatibilidad, exige cuentas vinculadas y retira el permiso para fijar el estado al insertar una solicitud.

Si la etapa previa termina con error, su transacción revierte los cambios sin dejar una ejecución parcial. Si hay que volver a la aplicación anterior después de que la etapa previa se haya confirmado, ejecuta `supabase-adoption-notifications-predeploy-rollback.sql` antes de desplegar la aplicación nueva. La reversión copia los contactos privados faltantes al campo legado, valida que todas las publicaciones tengan contacto y se detiene sin confirmar si falta alguno. Desactiva los triggers y el acceso de la API a contactos/notificaciones, pero conserva esas tablas y todas sus filas. No elimina publicaciones, solicitudes, contactos ni avisos. Esta reversión no es para después de ejecutar `lockdown`; en ese caso, primero se debe preparar una reversión coordinada de la aplicación y de las políticas finales.

### Respaldo de producción antes de ejecutar SQL

1. En Supabase, abre **Database > Backups** y confirma que hay un respaldo exitoso anterior a la actualización. Anota la fecha y hora. Si no aparece uno utilizable, detente antes de ejecutar SQL y prepara una exportación lógica completa siguiendo la guía oficial; una exportación predeterminada del CLI puede omitir los datos de Auth y no incluir datos de tablas.
2. Abre **Storage > Files**, entra a `report-photos` y `adoption-photos` y descarga sus objetos por separado. Conserva carpetas y nombres de archivo; para muchos archivos, usa la opción de copia masiva documentada por Supabase.
3. Comprueba que el número de archivos respaldados coincide con el de cada bucket y que puedes abrir algunos archivos desde la copia.
4. Guarda la exportación y las fotos en una ubicación segura distinta de Supabase. No pruebes la restauración encima de producción: usa un proyecto aparte.

Los respaldos automáticos de la base incluyen Auth, pero no los archivos de Storage. Las exportaciones lógicas requieren pasos separados para incluir datos, Auth y objetos. Consulta la guía de [respaldos y restauración](https://supabase.com/docs/guides/platform/backups), la guía de [exportación con CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) y la guía de [descarga de objetos](https://supabase.com/docs/guides/storage/management/download-objects).

`supabase-adoption-notifications.sql` contiene la instalación completa para una base aislada o un entorno nuevo. En producción con la app existente, sigue las dos etapas anteriores; no ejecutes el archivo completo antes del merge.

En Authentication > Sign In / Providers, habilita Email/Password, la confirmación de correo y **Allow manual linking**. Las nuevas publicaciones y solicitudes de adopción requieren una cuenta vinculada con correo verificado para poder recuperarlas en otro dispositivo. Una sesión anónima existente conserva el mismo usuario y sus datos al vincular un correo; iniciar sesión en una cuenta distinta no combina automáticamente los datos anónimos locales.

Para probar el flujo con dos personas: inicia sesión con la cuenta del responsable y publica una mascota; en otro dispositivo o perfil privado, inicia sesión con una cuenta distinta y envía una solicitud; vuelve a la cuenta responsable para aceptarla o rechazarla. El solicitante verá el aviso y el estado en Mi espacio. El teléfono del responsable solo se devuelve a la cuenta solicitante cuando la solicitud está aceptada. Aceptar una solicitud no marca la publicación como adoptada.

La URL y la Publishable key están en `supabase-config.js`. En Supabase Auth, confirma Email/Password, verificación de correo, Allow manual linking y las Redirect URLs para el dominio de Huellitas.

## Integración

Despliegue de producción: 1) sigue la lista de respaldos de arriba; 2) revisa la configuración de Auth y ejecuta `supabase-adoption-notifications-predeploy.sql`; 3) confirma que las tablas y triggers están listos; 4) integra el PR para desplegar la nueva app; 5) valida publicación, solicitud, avisos y acceso al contacto con dos cuentas; 6) ejecuta `supabase-adoption-notifications-lockdown.sql` y comprueba las políticas y permisos finales. Si necesitas volver a la app anterior antes del despliegue nuevo, usa el archivo de reversión. No ejecutes el SQL de instalación completa en producción.

