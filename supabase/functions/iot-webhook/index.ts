// Public IoT ingestion endpoint — HTTPS direct, signé HMAC-SHA256.
//
// Headers requis:
//   x-plantera-timestamp: <unix seconds>
//   x-plantera-signature: sha256=<hex hmac(IOT_WEBHOOK_SECRET, `${timestamp}.${rawBody}`)>
//
// Body: { device_token, metric, value, unit?, recorded_at? }
// Ou batch: { device_token, readings: [{metric,value,unit?,recorded_at?}] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_SKEW_SECONDS = 300;

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-plantera-signature, x-plantera-timestamp",
      },
    });
  }
  if (req.method !== "POST") return fail(405, "Method not allowed");

  try {
    const secret = (Deno.env.get("IOT_WEBHOOK_SECRET") ?? "").trim();
    if (!secret) return fail(500, "Server misconfigured");

    const rawBody = await req.text();
    const timestamp = req.headers.get("x-plantera-timestamp") ?? "";
    const provided = (req.headers.get("x-plantera-signature") ?? "").replace(/^sha256=/i, "").trim().toLowerCase();

    const ts = Number(timestamp);
    if (!timestamp || Number.isNaN(ts)) return fail(401, "Missing or invalid x-plantera-timestamp");
    if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_SKEW_SECONDS) return fail(401, "Timestamp expired");
    if (!provided) return fail(401, "Missing x-plantera-signature");

    const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
    if (!timingSafeEqual(provided, expected)) return fail(401, "Invalid signature");

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return fail(400, "Invalid JSON body");
    }

    const device_token = body?.device_token;
    if (!device_token || typeof device_token !== "string") return fail(400, "device_token required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: device, error: devErr } = await admin
      .from("iot_devices")
      .select("id, owner_id, is_active")
      .eq("device_token", device_token)
      .maybeSingle();
    if (devErr) throw devErr;
    if (!device) return fail(404, "Device not found");
    if (device.is_active === false) return fail(403, "Device disabled");

    const items = Array.isArray(body.readings)
      ? body.readings
      : [{ metric: body.metric, value: body.value, unit: body.unit, recorded_at: body.recorded_at }];

    const rows = items
      .filter((r: any) => r?.metric != null && r?.value != null && !Number.isNaN(Number(r.value)))
      .slice(0, 500)
      .map((r: any) => ({
        device_id: device.id,
        metric: String(r.metric).slice(0, 64),
        value: Number(r.value),
        unit: r.unit ? String(r.unit).slice(0, 16) : null,
        recorded_at: r.recorded_at ?? new Date().toISOString(),
      }));

    if (rows.length === 0) return fail(400, "No valid readings");

    const { error: insErr } = await admin.from("device_data").insert(rows);
    if (insErr) throw insErr;

    await admin.from("iot_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    return new Response(JSON.stringify({ success: true, inserted: rows.length }), { headers: jsonHeaders });
  } catch (e) {
    console.error("iot-webhook error", e);
    return fail(500, String((e as Error)?.message ?? e));
  }
});
