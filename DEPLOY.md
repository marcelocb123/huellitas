# Publicar / actualizar Huellitas

1. Mantén en el repositorio raíz: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `supabase-config.js`, `icon-192.png`, `icon-512.png` e `icon.svg`.
2. Sube los archivos nuevos al repositorio GitHub `huellitas` y haz `Commit changes`.
3. GitHub Pages seguirá usando `main` + `/ (root)` y actualizará la misma URL:
   https://marcelocb123.github.io/huellitas/
4. En Supabase deben estar activados: Authentication > Anonymous sign-ins, la tabla `public.reports`, el bucket `report-photos`, las políticas RLS y Realtime. Todo esto lo crea `supabase-schema.sql`.

## Flujo compartido
- Una publicación se inserta en Supabase y todos los dispositivos autenticados anónimamente pueden verla.
- Solo el usuario que creó la publicación puede marcarla como resuelta o eliminarla.
- Al resolverse, deja de aparecer en las búsquedas activas para todos.
- Al eliminarse, desaparece para todos.
- Realtime refresca la interfaz cuando otra persona publica, resuelve o elimina un aviso.
