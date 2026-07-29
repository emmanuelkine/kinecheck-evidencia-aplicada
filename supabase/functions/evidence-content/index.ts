import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { AccessError, authorizeCourse } from "../_shared/course-access.ts";

const COURSE_SLUG = "evidencia-aplicada";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store, max-age=0",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método no permitido." }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedSlug = String(body.courseSlug || "").trim();

    if (requestedSlug !== COURSE_SLUG) {
      return new Response(JSON.stringify({ message: "Curso no autorizado." }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const { admin, access } = await authorizeCourse(
      req.headers.get("Authorization") || "",
      COURSE_SLUG,
    );

    const { data: courseRow, error: courseError } = await admin
      .from("course_content")
      .select("version,payload,updated_at")
      .eq("course_slug", COURSE_SLUG)
      .eq("published", true)
      .maybeSingle();

    if (courseError) {
      return new Response(JSON.stringify({ message: "No fue posible cargar el curso." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!courseRow?.payload) {
      return new Response(JSON.stringify({ message: "El contenido protegido aún no fue publicado." }), {
        status: 503,
        headers: corsHeaders,
      });
    }

    const { data: library, error: libraryError } = await admin
      .from("evidence_library")
      .select("item_id,title,source_type,module,tier,lot,summary,clinical_use,caution,tags,original_relation")
      .eq("course_slug", COURSE_SLUG)
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (libraryError) {
      return new Response(JSON.stringify({ message: "No fue posible cargar la biblioteca científica." }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      access,
      version: courseRow.version,
      updatedAt: courseRow.updated_at,
      course: courseRow.payload,
      library: (library || []).map((item) => ({
        id: item.item_id,
        title: item.title,
        sourceType: item.source_type,
        module: item.module,
        tier: item.tier,
        lot: item.lot,
        summary: item.summary,
        clinicalUse: item.clinical_use,
        caution: item.caution,
        tags: item.tags || [],
        originalRelation: item.original_relation,
      })),
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error
      ? error.message
      : "Error inesperado al cargar el contenido.";

    console.error("evidence-content error", error);
    return new Response(JSON.stringify({ message }), {
      status,
      headers: corsHeaders,
    });
  }
});
