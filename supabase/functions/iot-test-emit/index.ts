// Authenticated test emit: insère une lecture capteur pour un device du user connecté.
// Body: { device_token, metric, value, unit? }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { device_token, metric, value, unit } = await req.json();
    if (!device_token || !metric || value == null) {
      return new Response(JSON.stringify({ error: "device_token, metric, value required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);
    const { data: device, error: devErr } = await admin
      .from("iot_devices")
      .select("id, owner_id, is_active")
      .eq("device_token", device_token)
      .single();
    if (devErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (device.owner_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passe par iot-webhook (signé HMAC) pour appliquer la même validation et le journal.
    const secret = (Deno.env.get("IOT_WEBHOOK_SECRET") ?? "").trim();
    const body = JSON.stringify({ device_token, metric: String(metric), value, unit: unit ?? undefined });
    const ts = String(Math.floor(Date.now() / 1000));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${body}`))))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    const r = await fetch(`${url}/functions/v1/iot-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-plantera-timestamp": ts, "x-plantera-signature": `sha256=${sig}` },
      body,
    });
    const out = await r.text();
    return new Response(out, { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("iot-test-emit error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});