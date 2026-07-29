import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COURSE_SLUG = "evidencia-aplicada";
const HOTMART_TEST_UCODE = "fb056612-bcc6-4217-9e6d-2a5d1110ac2f";
const HOTMART_TEST_PRODUCT_NAME = "Produto test postback2";
const APPROVE = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REVOKE = new Set([
  "PURCHASE_REFUNDED",
  "PURCHASE_CANCELED",
  "PURCHASE_CHARGEBACK",
  "PURCHASE_EXPIRED",
  "PURCHASE_PROTEST",
  "PURCHASE_DELAYED",
]);

function toIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const date = new Date(Number(raw));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isOlder(incoming: string | null, current: string | null): boolean {
  if (!incoming || !current) return false;
  const incomingTime = new Date(incoming).getTime();
  const currentTime = new Date(current).getTime();
  if (Number.isNaN(incomingTime) || Number.isNaN(currentTime)) return false;
  return incomingTime < currentTime;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const expectedHotTok = Deno.env.get("EVIDENCE_HOTMART_HOTTOK")?.trim();
  const expectedProductIdRaw = Deno.env.get("EVIDENCE_HOTMART_PRODUCT_ID")?.trim();
  const expectedProductId = Number(expectedProductIdRaw);

  if (!expectedHotTok || !expectedProductIdRaw || !Number.isFinite(expectedProductId)) {
    console.error("Missing or invalid EVIDENCE_HOTMART_HOTTOK / EVIDENCE_HOTMART_PRODUCT_ID");
    return Response.json({ error: "server_not_configured" }, { status: 503 });
  }

  const receivedHotTok = req.headers.get("x-hotmart-hottok")?.trim() || "";
  if (receivedHotTok !== expectedHotTok) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const event = String(body.event || "").trim();
  const data = body.data || {};
  const buyer = data.buyer || {};
  const product = data.product || {};
  const purchase = data.purchase || {};

  const email = String(buyer.email || "").trim().toLowerCase();
  const productUcode = String(product.ucode || "").trim();
  const productName = String(product.name || "").trim();
  const productId = Number(product.id ?? -1);
  const transactionId = String(purchase.transaction || "").trim();
  const eventId = String(body.id || `${event}:${transactionId}:${email}`).trim();
  const eventDate = toIso(
    body.creation_date
      || body.creationDate
      || data.creation_date
      || purchase.approved_date
      || purchase.order_date,
  ) || new Date().toISOString();

  if (!event) return Response.json({ error: "event_missing" }, { status: 400 });
  if (!email) return Response.json({ error: "email_missing" }, { status: 400 });
  if (!productUcode) return Response.json({ error: "product_ucode_missing" }, { status: 400 });

  const isOfficialHotmartTest =
    productId === 0
    && productName === HOTMART_TEST_PRODUCT_NAME
    && productUcode === HOTMART_TEST_UCODE
    && email.endsWith("@example.com");

  const isRealProduct = productId === expectedProductId;
  if (!isRealProduct && !isOfficialHotmartTest) {
    return Response.json({ ok: true, ignored: "different_product" });
  }

  const active = APPROVE.has(event) ? true : REVOKE.has(event) ? false : null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: existingEvent, error: existingError } = await supabase
    .from("hotmart_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingError) {
    return Response.json({ error: existingError.message }, { status: 500 });
  }
  if (existingEvent?.event_id) {
    return Response.json({ ok: true, duplicate: true, eventId });
  }

  let staleEvent = false;

  if (active !== null) {
    const { data: currentAccess, error: currentAccessError } = await supabase
      .from("course_access")
      .select("last_event_at,last_event,transaction_id")
      .eq("email", email)
      .eq("course_slug", COURSE_SLUG)
      .maybeSingle();

    if (currentAccessError) {
      return Response.json({ error: currentAccessError.message }, { status: 500 });
    }

    staleEvent = isOlder(eventDate, currentAccess?.last_event_at || null);

    if (!staleEvent) {
      const purchaseDate = toIso(purchase.approved_date || purchase.order_date);
      const warrantyDate = toIso(product.warranty_date);

      const { error: accessError } = await supabase.from("course_access").upsert({
        email,
        course_slug: COURSE_SLUG,
        active,
        hotmart_product_id: String(product.id || ""),
        product_ucode: productUcode,
        transaction_id: transactionId,
        last_event: event,
        last_event_at: eventDate,
        purchase_date: purchaseDate,
        warranty_date: warrantyDate,
        access_source: isOfficialHotmartTest ? "hotmart_test" : "hotmart",
        updated_at: new Date().toISOString(),
      }, { onConflict: "email,course_slug" });

      if (accessError) {
        // No se registra el evento todavía: Hotmart podrá reenviarlo y reparar la licencia.
        return Response.json({ error: accessError.message }, { status: 500 });
      }
    }
  }

  const { error: auditError } = await supabase.from("hotmart_events").insert({
    event_id: eventId,
    event_type: event,
    product_ucode: productUcode,
    buyer_email: email,
    transaction_id: transactionId,
    event_date: eventDate,
    payload: body,
  });

  if (auditError && auditError.code !== "23505") {
    return Response.json({ error: auditError.message }, { status: 500 });
  }

  if (active === null) {
    return Response.json({
      ok: true,
      ignored: event,
      eventId,
      testMode: isOfficialHotmartTest,
    });
  }

  if (staleEvent) {
    return Response.json({
      ok: true,
      ignored: "stale_event",
      eventId,
      email,
      courseSlug: COURSE_SLUG,
      eventDate,
    });
  }

  return Response.json({
    ok: true,
    eventId,
    email,
    active,
    courseSlug: COURSE_SLUG,
    testMode: isOfficialHotmartTest,
    productId,
    eventDate,
  });
});
