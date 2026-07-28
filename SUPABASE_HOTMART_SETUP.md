# Activación final de Supabase y Hotmart

La aplicación pública contiene solo la interfaz. El contenido científico se entrega desde Supabase después de validar sesión y licencia.

## 1. Base de datos

En el SQL Editor del proyecto `eqhcdclyeoapmqtlduwf`, ejecuta en este orden:

1. `supabase/schema.sql`
2. `supabase/secure-content-schema.sql`

Esto crea:

- `learning_progress`: progreso y cuaderno por usuario.
- `course_access`: licencias activas y revocadas.
- `course_content`: contenido privado del curso.
- `evidence_library`: catálogo privado de los 91 contenidos.
- `hotmart_events`: auditoría y deduplicación de eventos.

## 2. Edge Functions

Despliega estas funciones:

- `evidence-access` con Verify JWT activado.
- `evidence-content` con Verify JWT activado.
- `hotmart-webhook` sin verificación JWT de Supabase, porque autentica mediante HotTok.

URL del Webhook:

`https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/hotmart-webhook`

## 3. Secretos obligatorios

Configura en Supabase Edge Functions > Secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HOTMART_HOTTOK`
- `HOTMART_PRODUCT_UCODE`

La función falla de forma segura si faltan `HOTMART_HOTTOK` o `HOTMART_PRODUCT_UCODE`.

## 4. Publicar el contenido privado

Inserta en `course_content` una fila con:

- `course_slug = evidencia-aplicada`
- versión del contenido
- título
- `payload` JSON completo
- `published = true`

Carga los 91 registros estructurados en `evidence_library`. No publiques esos datos en GitHub Pages.

## 5. Configuración Hotmart

Registra el Webhook para estos eventos:

### Activación
- `PURCHASE_APPROVED`
- `PURCHASE_COMPLETE`

### Revocación
- `PURCHASE_REFUNDED`
- `PURCHASE_CANCELED`
- `PURCHASE_CHARGEBACK`
- `SUBSCRIPTION_CANCELLATION`

La función ignora productos cuyo `ucode` no coincide con `HOTMART_PRODUCT_UCODE`.

## 6. Prueba obligatoria antes de vender

1. Compra de prueba con un correo nuevo.
2. Confirmar usuario en Supabase Auth.
3. Verificar en `hotmart_events` que el evento se registró una sola vez.
4. Verificar en `course_access`:
   - `course_slug = evidencia-aplicada`
   - `active = true`
   - `access_source = hotmart`
   - `product_ucode` correcto.
5. Ingresar al curso y guardar una actividad.
6. Verificar `learning_progress`.
7. Ejecutar reembolso de prueba.
8. Confirmar que `active = false`.
9. Intentar ingresar nuevamente: el sistema debe bloquear el contenido.

## Seguridad

- Nunca publiques `SUPABASE_SERVICE_ROLE_KEY`, HotTok ni el contenido completo en GitHub.
- La clave pública anon puede estar en `config.js`; las claves privadas solo en Secrets.
- `course_content`, `evidence_library` y `hotmart_events` no tienen políticas públicas.
