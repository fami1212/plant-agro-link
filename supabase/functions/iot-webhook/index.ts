// Public IoT ingestion endpoint. Auth via device_token + IOT_WEBHOOK_SECRET.
// Body: { device_token, secret, metric, value, unit?, recorded_at? }
// Or batch: { device_token, secret, readings: [{metric,value,unit?,recorded_at?}] }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const expected = Deno.env.get("IOT_WEBHOOK_SECRET");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { device_token, secret, readings } = body;
    if (!device_token || !secret || secret !== expected) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: device, error: devErr } = await admin
      .from("iot_devices")
      .select("id, owner_id")
      .eq("device_token", device_token)
      .single();
    if (devErr || !device) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = readings ?? [{ metric: body.metric, value: body.value, unit: body.unit, recorded_at: body.recorded_at }];
    const rows = items
      .filter((r: any) => r.metric != null && r.value != null)
      .map((r: any) => ({
        device_id: device.id,
        metric: String(r.metric),
        value: Number(r.value),
        unit: r.unit ?? null,
        recorded_at: r.recorded_at ?? new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "No valid readings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin.from("device_data").insert(rows);
    if (insErr) throw insErr;

    await admin.from("iot_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);

    return new Response(JSON.stringify({ success: true, inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("iot-webhook error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});