# Lucky Élite Select — guía rápida

## Qué incluye
- Página pública responsive.
- 1,000 boletos 000–999.
- Precio $250 MXN.
- Selección múltiple.
- Apartado real de 24 h (Supabase).
- Datos de comprador: nombre, WhatsApp, ciudad.
- Botón de WhatsApp sin mostrar el teléfono en pantalla.
- Panel Admin con login.
- Cambio de estados y publicación de ganador.
- Contador de 300 boletos y bonus: $2,000 / mandil de piel.
- Fotos reales entregadas por el organizador.
- Fecha de sorteo: 6 de septiembre de 2026.

## 1. Crear Supabase (gratis)
1. Crea una cuenta/proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta `supabase.sql`.
4. En Authentication > Users crea tu usuario administrador.
5. En `supabase.sql`, cambia `CAMBIA_ESTE_CORREO` por el correo del administrador y vuelve a ejecutar la función `is_admin()` y las políticas de admin.
6. Ve a Project Settings > API y copia la URL del proyecto y la clave pública (anon/publishable).
7. Pega ambos valores en `config.js`.

## 2. Probar
Abre `index.html`. Si config.js ya tiene Supabase, los boletos serán compartidos entre visitantes. Sin Supabase se verá como demo local.

## 3. Publicar gratis
Sube todos los archivos a un repositorio público de GitHub.
En Settings > Pages selecciona Deploy from a branch, rama `main`, carpeta `/root`.
Guarda y espera la publicación. La URL será similar a:
https://TU-USUARIO.github.io/lucky-elite-select/

## 4. WhatsApp
El número está solamente dentro del código para generar el enlace. No se muestra como texto en la página.
El botón abre WhatsApp con los números seleccionados, nombre y total.

## 5. Aviso de 300
El panel Admin muestra un aviso cuando llegan a 300 boletos pagados. Para notificación automática fuera del panel (correo/WhatsApp), se requiere un servicio adicional; el proyecto base no envía mensajes externos para mantenerlo sin costo.

## 6. Seguridad
- Nunca pongas una service_role key en `config.js`.
- Usa solo la clave pública de Supabase.
- El admin debe usar una contraseña fuerte.
- Verifica las reglas legales aplicables a rifas en México antes de publicar/cobrar. 
