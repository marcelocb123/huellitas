# Configuración Supabase — Huellitas v7

La parte de reportes perdidos/encontrados ya usa la tabla `reports` de tu proyecto.

Para habilitar **Adopta** en esta versión:

1. Abre tu proyecto `huellitas` en Supabase.
2. Ve a **SQL Editor** → **New query**.
3. Abre el archivo `supabase-adoptions.sql` que viene en este ZIP.
4. Pega todo el contenido y pulsa **Run**.
5. Debe terminar con `Success`.
6. No borres ni reemplaces la tabla `reports` ni sus políticas actuales.

Este SQL crea:

- `adoptions`: publicaciones reales de mascotas para adopción.
- `adoption_requests`: solicitudes de personas interesadas.
- bucket `adoption-photos`: fotos de adopción.
- políticas RLS: todos los usuarios autenticados pueden ver adopciones; solo quien publica puede editar, marcar como adoptada o eliminar su publicación.
- Realtime para `adoptions` y `adoption_requests`.

## Importante

Esta versión ya no usa mascotas ficticias de demostración para la sección **Adopta**. Si la base está vacía, la pantalla mostrará que todavía no hay publicaciones.

Las solicitudes de adopción son visibles para el responsable de la publicación y para quien las envió. El responsable puede cambiar el estado entre **Pendiente, Aprobada y Rechazada**.
