import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_OWNER_EMAILS = [
  "emmanuelkine@gmail.com",
  "emmanuelkine+owner@gmail.com",
  "emmanuel_fox@hotmail.com",
];

const DEFAULT_BETA_EMAILS = ["emmanuelkine+beta@gmail.com"];
const DEFAULT_BETA_TRIAL_DAYS = 5;

export class AccessError extends Error {
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

function configuredBetaDays(): number {
  const value = Number(Deno.env.get("KINECHECK_BETA_TRIAL_DAYS") || DEFAULT_BETA_TRIAL_DAYS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BETA_TRIAL_DAYS;
}

export type CourseAccessResult = {
  active: true;
  email: string;
  courseSlug: string;
  source: "owner" | "beta" | "course_access";
  expiresAt: string | null;
};

export async function authorizeCourse(
  authorization: string,
  courseSlug: string,
): Promise<{ admin: ReturnType<typeof createClient>; access: CourseAccessResult }> {
  if (!authorization.startsWith("Bearer ")) {
    throw new AccessError("Falta la sesión de usuario.", 401);
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

  const normalizedSlug = String(courseSlug || "").trim();
  if (!normalizedSlug) {
    throw new AccessError("No se indicó el curso solicitado.", 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const ownerEmails = configuredEmails("KINECHECK_OWNER_EMAILS", DEFAULT_OWNER_EMAILS);

  if (ownerEmails.has(email)) {
    return {
      admin,
      access: {
        active: true,
        email,
        courseSlug: normalizedSlug,
        source: "owner",
        expiresAt: null,
      },
    };
  }

  const betaEmails = configuredEmails("KINECHECK_BETA_EMAILS", DEFAULT_BETA_EMAILS);
  let betaExpired = false;

  if (betaEmails.has(email)) {
    const createdAt = new Date(user.created_at || 0);
    if (!Number.isNaN(createdAt.getTime())) {
      const expiresAt = new Date(
        createdAt.getTime() + configuredBetaDays() * 24 * 60 * 60 * 1000,
      );

      if (expiresAt.getTime() > Date.now()) {
        return {
          admin,
          access: {
            active: true,
            email,
            courseSlug: normalizedSlug,
            source: "beta",
            expiresAt: expiresAt.toISOString(),
          },
        };
      }
      betaExpired = true;
    }
  }

  const { data: license, error: licenseError } = await admin
    .from("course_access")
    .select("active")
    .eq("email", email)
    .eq("course_slug", normalizedSlug)
    .maybeSingle();

  if (licenseError) {
    console.error("course_access resolver error", licenseError);
    throw new AccessError("No fue posible verificar la licencia del curso.", 500);
  }

  if (license?.active) {
    return {
      admin,
      access: {
        active: true,
        email,
        courseSlug: normalizedSlug,
        source: "course_access",
        expiresAt: null,
      },
    };
  }

  if (betaExpired) {
    throw new AccessError(
      "La prueba Beta terminó y no encontramos una compra activa asociada a este correo.",
      403,
    );
  }

  throw new AccessError(
    "No encontramos una compra activa asociada a este correo.",
    403,
  );
}
