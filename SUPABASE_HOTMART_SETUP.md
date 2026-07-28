# Activación de Supabase y Hotmart

La interfaz ya incluye autenticación, perfiles, sincronización y validación de licencia. Para dejarla operativa:

1. Abre el SQL Editor del proyecto Supabase `eqhcdclyeoapmqtlduwf` y ejecuta `supabase/schema.sql`.
2. Despliega las funciones:
   - `supabase functions deploy course-key`
   - `supabase functions deploy hotmart-webhook --no-verify-jwt`
3. Configura los secretos de Supabase:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `HOTMART_HOTTOK`
4. En Hotmart crea un Webhook con URL:
   `https://eqhcdclyeoapmqtlduwf.supabase.co/functions/v1/hotmart-webhook`
5. Selecciona eventos de alta: compra aprobada/completada.
6. Selecciona eventos de baja: reembolso, cancelación, chargeback y cancelación de suscripción.
7. Prueba una compra y confirma que `course_access` registra `course_slug = evidencia-aplicada` y `active = true`.
8. Simula un reembolso y confirma `active = false`.

## Seguridad
La clave service role y el HotTok nunca deben publicarse en `config.js` ni en GitHub Pages. Solo se guardan como secretos de Supabase.
