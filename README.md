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

La URL y la Publishable key están en `supabase-config.js`.

## Publicación

Sube los archivos de esta carpeta a la raíz del repositorio de GitHub Pages, reemplazando los existentes y haciendo un nuevo commit. No cambies el repositorio ni la configuración de Pages.
