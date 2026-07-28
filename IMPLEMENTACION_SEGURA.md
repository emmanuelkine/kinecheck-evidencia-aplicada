# Implementación segura de KineCheck Evidencia Aplicada

## Estado del repositorio

El frontend público ya no contiene `course-data.js`. Después de autenticar y validar la licencia, descarga el contenido desde la Edge Function privada `evidence-content`.

## Orden de activación

1. Ejecutar `supabase/secure-content-schema.sql` en SQL Editor.
2. Ejecutar el archivo privado `KineCheck_Evidencia_Aplicada_IMPORTAR_SUPABASE.sql` entregado fuera de GitHub.
3. Crear y desplegar la función `evidence-content` usando `supabase/functions/evidence-content/index.ts` con Verify JWT activado.
4. Volver a desplegar `hotmart-webhook` con `supabase/functions/hotmart-webhook/index.ts` y Verify JWT desactivado.
5. Configurar secretos:
   - `HOTMART_HOTTOK`
   - `HOTMART_PRODUCT_UCODE`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Configurar en Hotmart el Webhook para un solo producto y usar la URL de la función `hotmart-webhook`.
7. Probar eventos `PURCHASE_APPROVED`, `PURCHASE_COMPLETE`, `PURCHASE_REFUNDED`, `PURCHASE_CANCELED` y `PURCHASE_CHARGEBACK`.

## Protección

- `course_content`, `evidence_library` y `hotmart_events` tienen RLS habilitado y no tienen políticas públicas.
- El contenido solo se entrega cuando el JWT es válido y `course_access.active = true`.
- La respuesta de contenido usa `Cache-Control: private, no-store`.
- El Webhook falla si no existen `HOTMART_HOTTOK` o `HOTMART_PRODUCT_UCODE`.
- El Webhook rechaza productos con un `ucode` distinto y deduplica eventos por `event_id`.

## Importante

El archivo de importación privado no debe subirse a GitHub, Drive público ni Hotmart como descarga. Se ejecuta una sola vez en Supabase SQL Editor y luego se conserva como respaldo privado.