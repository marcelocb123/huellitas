# Huellitas — versión compartida

Huellitas es una PWA simple para:
- reportar mascotas perdidas o encontradas;
- ver publicaciones de otros usuarios;
- resolver un caso para que deje de aparecer en la búsqueda activa;
- eliminar una publicación creada por error;
- revisar “Mis publicaciones”;
- usar un apartado de configuración básica;
- consultar adopciones y servicios veterinarios.

## Modo actual

Sin Supabase configurado, la app funciona en modo local como respaldo.

Con Supabase configurado, las publicaciones se guardan online y se sincronizan en tiempo real entre celulares.

## Archivos importantes

- `index.html`: entrada de la aplicación.
- `app.js`: lógica de Huellitas.
- `styles.css`: diseño.
- `manifest.webmanifest`: instalación PWA.
- `sw.js`: caché/offline.
- `supabase-config.js`: URL y clave pública de Supabase.
- `supabase-schema.sql`: tablas, seguridad, fotos y Realtime.
- `SUPABASE_SETUP.md`: guía rápida de conexión.

## Para ponerla en GitHub Pages

1. Crea/configura tu proyecto Supabase.
2. Ejecuta `supabase-schema.sql`.
3. Habilita Anonymous Sign-Ins.
4. Coloca Project URL y anon/publishable key en `supabase-config.js`.
5. Sube todos los archivos al repositorio `huellitas` y haz Commit.
6. GitHub Pages volverá a publicar la misma URL.

Nunca uses la `service_role` key en el frontend.


## Huellitas conectada a Supabase

Esta versión incluye conexión al proyecto Supabase de Huellitas mediante la clave publishable. Las publicaciones se almacenan en la tabla `reports`, las fotos en `report-photos` y los cambios se sincronizan con Realtime.

Para producción, no reemplaces la clave publishable por una clave `sb_secret_` o `service_role`; esas claves son privadas y no deben llegar al navegador.
