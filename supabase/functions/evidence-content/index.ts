import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COURSE_SLUG = "evidencia-aplicada";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store, max-age=0",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ message: "Método no permitido." }), { status: 405, headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return new Response(JSON.stringify({ message: "Falta la sesión de usuario." }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) return new Response(JSON.stringify({ message: "La sesión no es válida o expiró." }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const requestedSlug = String(body.courseSlug || "").trim();
    if (requestedSlug !== COURSE_SLUG) return new Response(JSON.stringify({ message: "Curso no autorizado." }), { status: 403, headers: corsHeaders });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: access, error: accessError } = await admin.from("course_access").select("active").eq("email", user.email.toLowerCase()).eq("course_slug", COURSE_SLUG).maybeSingle();
    if (accessError) return new Response(JSON.stringify({ message: "No fue posible verificar la licencia." }), { status: 500, headers: corsHeaders });
    if (!access?.active) return new Response(JSON.stringify({ message: "No encontramos una compra activa asociada a este correo." }), { status: 403, headers: corsHeaders });

    const { data: courseRow, error: courseError } = await admin.from("course_content").select("version,payload,updated_at").eq("course_slug", COURSE_SLUG).eq("published", true).maybeSingle();
    if (courseError) return new Response(JSON.stringify({ message: "No fue posible cargar el curso." }), { status: 500, headers: corsHeaders });
    if (!courseRow?.payload) return new Response(JSON.stringify({ message: "El contenido protegido aún no fue publicado." }), { status: 503, headers: corsHeaders });

    const { data: library, error: libraryError } = await admin.from("evidence_library").select("item_id,title,source_type,module,tier,lot,summary,clinical_use,caution,tags,original_relation").eq("course_slug", COURSE_SLUG).eq("published", true).order("sort_order", { ascending: true });
    if (libraryError) return new Response(JSON.stringify({ message: "No fue posible cargar la biblioteca científica." }), { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({
      version: courseRow.version,
      updatedAt: courseRow.updated_at,
      course: courseRow.payload,
      library: (library || []).map((x) => ({
        id: x.item_id,
        title: x.title,
        sourceType: x.source_type,
        module: x.module,
        tier: x.tier,
        lot: x.lot,
        summary: x.summary,
        clinicalUse: x.clinical_use,
        caution: x.caution,
        tags: x.tags || [],
        originalRelation: x.original_relation,
      })),
    }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("evidence-content error", error);
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : "Error inesperado al cargar el contenido." }), { status: 500, headers: corsHeaders });
  }
});