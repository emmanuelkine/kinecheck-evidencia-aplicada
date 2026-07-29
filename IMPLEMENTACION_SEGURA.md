# Implementación segura de KineCheck Evidencia Aplicada

## Arquitectura de acceso

El contenido protegido se entrega desde la Edge Function `evidence-content`. El frontend realiza una sola solicitud: esa función valida la autorización y, únicamente cuando corresponde, devuelve el curso y la biblioteca científica.

La regla central está en:

- `supabase/functions/_shared/course-access.ts`

La misma regla puede ser reutilizada por `evidence-content` y `evidence-access` y reconoce, en este orden:

1. Cuenta propietaria autorizada.
2. Cuenta Beta mientras permanezca dentro de sus 5 días desde la creación del usuario.
3. Licencia activa en `course_access`, creada por Hotmart o por administración.

Una Beta vencida todavía puede ingresar si posteriormente compró el curso y tiene una licencia activa.

## Compra y revocación

El webhook de Hotmart es la fuente de las licencias comerciales:

- `PURCHASE_APPROVED` y `PURCHASE_COMPLETE`: dejan `course_access.active = true`.
- `PURCHASE_REFUNDED`, `PURCHASE_CANCELED` y `PURCHASE_CHARGEBACK`: dejan `course_access.active = false`.
- El producto se identifica por su ID real de Hotmart.

Tanto KineCheck Academy como el curso deben consultar la licencia asociada al mismo correo y al slug `evidencia-aplicada`.

## Despliegue obligatorio en Supabase

Los cambios del frontend se publican mediante GitHub Pages, pero los cambios de las Edge Functions deben desplegarse en Supabase.

Desplegar juntos:

1. `supabase/functions/_shared/course-access.ts`
2. `supabase/functions/evidence-content/index.ts`
3. `supabase/functions/evidence-access/index.ts`

Con Supabase CLI:

```bash
supabase functions deploy evidence-content --project-ref eqhcdclyeoapmqtlduwf
supabase functions deploy evidence-access --project-ref eqhcdclyeoapmqtlduwf
```

Ambas funciones deben exigir JWT. El webhook `evidence-hotmart-webhook` debe continuar con Verify JWT desactivado porque recibe eventos firmados desde Hotmart.

## Variables y secretos

Obligatorios:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EVIDENCE_HOTMART_HOTTOK`
- `EVIDENCE_HOTMART_PRODUCT_ID`

Opcionales para modificar la configuración predeterminada:

- `KINECHECK_OWNER_EMAILS`: correos separados por coma.
- `KINECHECK_BETA_EMAILS`: correos separados por coma.
- `KINECHECK_BETA_TRIAL_DAYS`: duración de la prueba; por defecto 5.

El código ya incluye como valores predeterminados las cuentas Owner y Beta utilizadas en KineCheck Academy.

## Protección

- `course_content`, `evidence_library` y `hotmart_events` tienen RLS habilitado y no deben tener políticas públicas.
- El contenido solo se entrega con una sesión válida y una autorización resuelta en el servidor.
- La respuesta de contenido usa `Cache-Control: private, no-store`.
- El frontend no contiene el contenido científico protegido.
- El webhook valida el token de Hotmart, el producto y los eventos, y deduplica por `event_id`.

## Prueba posterior al despliegue

Comprobar estas cuatro situaciones:

1. Owner puede abrir el curso sin compra.
2. Beta vigente puede abrir el curso y muestra acceso temporal en Academy.
3. Comprador aprobado puede abrirlo con el mismo correo usado en Hotmart.
4. Reembolso o contracargo bloquea el curso aunque la cuenta continúe existiendo.

## Importante

El archivo privado de importación del contenido no debe subirse a GitHub, Drive público ni Hotmart como descarga. Se ejecuta una sola vez en Supabase SQL Editor y se conserva como respaldo privado.
