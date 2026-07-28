import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "Falta la sesión de usuario." }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ message: "La sesión no es válida o expiró." }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const courseSlug = String(body.courseSlug || "").trim();
    if (!courseSlug) {
      return new Response(JSON.stringify({ message: "No se indicó el curso solicitado." }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: access, error: accessError } = await adminClient
      .from("course_access")
      .select("active")
      .eq("email", user.email.toLowerCase())
      .eq("course_slug", courseSlug)
      .maybeSingle();

    if (accessError) {
      console.error("evidence-access course_access error", accessError);
      return new Response(JSON.stringify({ message: "No fue posible verificar el acceso al curso." }), { status: 500, headers: corsHeaders });
    }

    if (!access?.active) {
      return new Response(JSON.stringify({ message: "No encontramos una compra activa asociada a este correo." }), { status: 403, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ active: true, courseSlug, email: user.email.toLowerCase() }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("evidence-access error", error);
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : "Error inesperado de validación." }), { status: 500, headers: corsHeaders });
  }
});
