# Conectar Huellitas a una base de datos compartida

Esta versión añade:
- reportes compartidos entre todos los celulares;
- actualización en tiempo real cuando alguien publica, resuelve o elimina un reporte;
- “Mis publicaciones”;
- “Ya la encontré” / “Caso resuelto”;
- “Eliminar publicación” para publicaciones propias;
- configuración básica.

## 1) Crear proyecto

Crea un proyecto en Supabase.

## 2) Activar usuarios anónimos

En Supabase ve a Authentication > Providers / Sign In methods y habilita Anonymous Sign-Ins.

No hace falta pedir correo ni contraseña: Huellitas crea un usuario anónimo en el dispositivo para identificar quién puede editar o eliminar sus propios reportes.

## 3) Crear tablas y almacenamiento

Abre SQL Editor en Supabase y ejecuta TODO el contenido de:

`supabase-schema.sql`

El SQL crea la tabla `reports`, políticas de seguridad, el bucket público `report-photos` y la suscripción Realtime.

## 4) Copiar las credenciales públicas

En Supabase abre Project Settings > API.

Copia:
- Project URL
- Publishable/anon key

Pégalos en `supabase-config.js`:

```js
window.HUELLITAS_SUPABASE = {
  url: 'https://TU-PROYECTO.supabase.co',
  anonKey: 'TU_ANON_KEY'
};
```

Usa SOLO la clave pública/anon/publishable. Nunca pongas `service_role` en el frontend.

## 5) Subir a GitHub

Reemplaza los archivos del repositorio por esta versión y conserva el mismo repositorio y la misma URL de GitHub Pages.

Cada commit de `main` volverá a publicar Huellitas.

## 6) Cómo funciona

Todos pueden ver los reportes activos.

La persona que crea un reporte queda como propietaria gracias al usuario anónimo del dispositivo.

En “Mis publicaciones” puede:
- Resolver el caso: la publicación pasa a resuelta y deja de mostrarse en el listado activo.
- Eliminar por error: borra la publicación de la base de datos.

Gracias a Realtime, los demás celulares reciben el cambio sin tener que reinstalar la app. Si una persona elimina o resuelve un reporte, desaparece del listado activo para todos.

## Importante sobre “Eliminar por error”

En esta versión solo el creador del reporte puede eliminarlo o resolverlo. Los demás usuarios pueden verlo, compartirlo y contactar al creador.
