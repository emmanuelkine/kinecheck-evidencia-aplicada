import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COURSE_SLUG = "evidencia-aplicada";
const DEFAULT_OWNER_EMAILS = [
  "emmanuelkine@gmail.com",
  "emmanuelkine+owner@gmail.com",
  "emmanuel_fox@hotmail.com",
];
const DEFAULT_BETA_EMAILS = ["emmanuelkine+beta@gmail.com"];
const DEFAULT_BETA_TRIAL_DAYS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store, max-age=0",
};

class AccessError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AccessError";
    this.status = status;
  }
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function configuredEmails(name: string, fallback: string[]): Set<string> {
  const configured = Deno.env.get(name)?.trim();
  const values = configured ? configured.split(",") : fallback;
  return new Set(values.map(normalizeEmail).filter(Boolean));
}

function betaTrialDays(): number {
  const value = Number(Deno.env.get("KINECHECK_BETA_TRIAL_DAYS") || DEFAULT_BETA_TRIAL_DAYS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BETA_TRIAL_DAYS;
}

function usableLicense(license: any): boolean {
  if (!license?.active) return false;
  const owner = String(license.access_source || "").toLowerCase() === "owner"
    || String(license.last_event || "").toUpperCase() === "OWNER_ACCESS";
  if (owner) return true;
  if (!license.access_expires_at) return true;
  const time = new Date(license.access_expires_at).getTime();
  return Number.isFinite(time) && time > Date.now();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Método no permitido." }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) {
      throw new AccessError("Falta la sesión de usuario.", 401);
    }

    const body = await req.json().catch(() => ({}));
    if (String(body.courseSlug || "").trim() !== COURSE_SLUG) {
      throw new AccessError("Curso no autorizado.", 403);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new AccessError("La autorización del curso no está configurada.", 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const email = normalizeEmail(user?.email);
    if (userError || !user || !email) {
      throw new AccessError("La sesión no es válida o expiró.", 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    let access: any = null;

    if (configuredEmails("KINECHECK_OWNER_EMAILS", DEFAULT_OWNER_EMAILS).has(email)) {
      access = { active: true, email, courseSlug: COURSE_SLUG, source: "owner", expiresAt: null };
    }

    let betaExpired = false;
    if (!access && configuredEmails("KINECHECK_BETA_EMAILS", DEFAULT_BETA_EMAILS).has(email)) {
      const createdAt = new Date(user.created_at || 0);
      if (!Number.isNaN(createdAt.getTime())) {
        const expiresAt = new Date(createdAt.getTime() + betaTrialDays() * 24 * 60 * 60 * 1000);
        if (expiresAt.getTime() > Date.now()) {
          access = { active: true, email, courseSlug: COURSE_SLUG, source: "beta", expiresAt: expiresAt.toISOString() };
        } else {
          betaExpired = true;
        }
      }
    }

    if (!access) {
      const { data: license, error: licenseError } = await admin
        .from("course_access")
        .select("active,access_expires_at,access_source,last_event")
        .eq("email", email)
        .eq("course_slug", COURSE_SLUG)
        .maybeSingle();
      if (licenseError) throw new AccessError("No fue posible verificar la licencia del curso.", 500);
      if (usableLicense(license)) {
        access = {
          active: true,
          email,
          courseSlug: COURSE_SLUG,
          source: "course_access",
          expiresAt: license?.access_expires_at || null,
        };
      } else if (license?.active && license?.access_expires_at) {
        const time = new Date(license.access_expires_at).getTime();
        if (Number.isFinite(time) && time <= Date.now()) {
          throw new AccessError("El período de acceso de este producto finalizó.", 403);
        }
      }
    }

    if (!access) {
      if (betaExpired) {
        throw new AccessError("La prueba Beta terminó y no encontramos una compra activa asociada a este correo.", 403);
      }
      throw new AccessError("No encontramos una compra activa asociada a este correo.", 403);
    }

    const { data: courseRow, error: courseError } = await admin
      .from("course_content")
      .select("version,payload,updated_at")
      .eq("course_slug", COURSE_SLUG)
      .eq("published", true)
      .maybeSingle();
    if (courseError) throw new AccessError("No fue posible cargar el curso.", 500);
    if (!courseRow?.payload) throw new AccessError("El contenido protegido aún no fue publicado.", 503);

    const { data: library, error: libraryError } = await admin
      .from("evidence_library")
      .select("item_id,title,source_type,module,tier,lot,summary,clinical_use,caution,tags,original_relation")
      .eq("course_slug", COURSE_SLUG)
      .eq("published", true)
      .order("sort_order", { ascending: true });
    if (libraryError) throw new AccessError("No fue posible cargar la biblioteca científica.", 500);

    const { data: weeklyRows, error: weeklyError } = await admin
      .from("evidence_weekly_alerts")
      .select("alert_date,payload,sort_order")
      .eq("course_slug", COURSE_SLUG)
      .eq("published", true)
      .order("alert_date", { ascending: false })
      .order("sort_order", { ascending: true });
    if (weeklyError) throw new AccessError("No fue posible cargar las alertas de evidencia.", 500);

    const latestAlertDate = weeklyRows?.[0]?.alert_date || null;
    const weeklyEvidence = {
      version: latestAlertDate ? `${latestAlertDate}.1` : "sin-alertas",
      lastReviewed: latestAlertDate,
      editorialNote: "Contenido completo para usuarios con acceso a Evidencia Aplicada. Cada alerta separa hallazgo, calidad y limitaciones, implicación clínica e implicación docente.",
      items: (weeklyRows || []).map((row: any) => row.payload),
      watchlist: [],
    };

    return new Response(JSON.stringify({
      access,
      version: courseRow.version,
      updatedAt: courseRow.updated_at,
      course: courseRow.payload,
      library: (library || []).map((item: any) => ({
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
      weeklyEvidence,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Error inesperado al cargar el contenido.";
    console.error("evidence-content error", error);
    return new Response(JSON.stringify({ message }), { status, headers: corsHeaders });
  }
});
