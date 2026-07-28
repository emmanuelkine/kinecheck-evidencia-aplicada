import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COURSE_SLUG = "evidencia-aplicada";
const APPROVE = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REVOKE = new Set(["PURCHASE_REFUNDED", "PURCHASE_CANCELED", "PURCHASE_CHARGEBACK", "SUBSCRIPTION_CANCELLATION"]);

serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

  const expectedHotTok = Deno.env.get("HOTMART_HOTTOK");
  const expectedProductUcode = Deno.env.get("HOTMART_PRODUCT_UCODE");
  if (!expectedHotTok || !expectedProductUcode) {
    console.error("Missing HOTMART_HOTTOK or HOTMART_PRODUCT_UCODE");
    return Response.json({ error: "server_not_configured" }, { status: 503 });
  }

  const receivedHotTok = req.headers.get("x-hotmart-hottok") || req.headers.get("X-HOTMART-HOTTOK") || "";
  if (receivedHotTok !== expectedHotTok) return Response.json({ error: "invalid_token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const event = String(body.event || body.type || "");
  const eventId = String(body.id || `${event}:${body.creation_date || crypto.randomUUID()}`);
  const buyer = body.data?.buyer || body.buyer || {};
  const product = body.data?.product || body.product || {};
  const purchase = body.data?.purchase || body.purchase || {};
  const email = String(buyer.email || "").trim().toLowerCase();
  const productUcode = String(product.ucode || "").trim();
  const transactionId = String(purchase.transaction || purchase.order_id || purchase.transaction_ext || "");

  if (!email) return Response.json({ error: "email_missing" }, { status: 400 });
  if (!productUcode || productUcode !== expectedProductUcode) return Response.json({ ok: true, ignored: "different_product" });

  const active = APPROVE.has(event) ? true : REVOKE.has(event) ? false : null;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: existing } = await supabase.from("hotmart_events").select("event_id").eq("event_id", eventId).maybeSingle();
  if (existing?.event_id) return Response.json({ ok: true, duplicate: true, eventId });

  const { error: auditError } = await supabase.from("hotmart_events").insert({
    event_id: eventId,
    event_type: event,
    product_ucode: productUcode,
    buyer_email: email,
    transaction_id: transactionId,
    payload: body,
  });
  if (auditError) return Response.json({ error: auditError.message }, { status: 500 });

  if (active === null) return Response.json({ ok: true, ignored: event, eventId });

  const purchaseDate = purchase.approved_date || purchase.order_date || null;
  const warrantyDate = product.warranty_date || null;
  const { error } = await supabase.from("course_access").upsert({
    email,
    course_slug: COURSE_SLUG,
    active,
    hotmart_product_id: String(product.id || ""),
    product_ucode: productUcode,
    transaction_id: transactionId,
    last_event: event,
    purchase_date: purchaseDate,
    warranty_date: warrantyDate,
    access_source: "hotmart",
    updated_at: new Date().toISOString(),
  }, { onConflict: "email,course_slug" });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, eventId, email, active, courseSlug: COURSE_SLUG });
});