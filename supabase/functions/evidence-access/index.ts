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

    const { access } = await authorizeCourse(
      req.headers.get("Authorization") || "",
      COURSE_SLUG,
    );

    return new Response(JSON.stringify(access), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error
      ? error.message
      : "Error inesperado de validación.";

    console.error("evidence-access error", error);
    return new Response(JSON.stringify({ message }), {
      status,
      headers: corsHeaders,
    });
  }
});
