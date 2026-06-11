// AI risk-score for investment opportunities (and sellers).
// Uses Lovable AI Gateway (Gemini) to return a risk score 0-100,
// a risk band, key factors and recommendations.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { opportunity_id, seller_id, context } = body ?? {};
    if (!opportunity_id && !seller_id && !context) {
      return new Response(JSON.stringify({ error: "opportunity_id, seller_id or context required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather features (best-effort, RLS-respecting via user client)
    let features: Record<string, unknown> = { ...(context ?? {}) };
    if (opportunity_id) {
      const { data: opp } = await supabase
        .from("investment_opportunities")
        .select("*")
        .eq("id", opportunity_id)
        .maybeSingle();
      if (opp) {
        features.opportunity = opp;
        // Farmer's track record: prior harvests count + total kg
        const { data: harvests } = await supabase
          .from("harvest_records")
          .select("quantity_kg, harvest_date")
          .eq("user_id", opp.farmer_id);
        features.farmer_track_record = {
          harvests_count: harvests?.length ?? 0,
          total_kg: (harvests ?? []).reduce((s, h: any) => s + Number(h.quantity_kg || 0), 0),
        };
        // Avg seller rating
        const { data: reviews } = await supabase
          .from("marketplace_reviews")
          .select("rating")
          .eq("seller_id", opp.farmer_id);
        if (reviews?.length) {
          features.seller_rating = {
            count: reviews.length,
            avg: reviews.reduce((s, r: any) => s + Number(r.rating || 0), 0) / reviews.length,
          };
        }
      }
    }
    if (seller_id) {
      const { data: reviews } = await supabase
        .from("marketplace_reviews")
        .select("rating, comment")
        .eq("seller_id", seller_id);
      features.seller_reviews = reviews ?? [];
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Tu es un analyste de risque agricole. Sur la base des données suivantes (JSON), retourne UNIQUEMENT un JSON conforme au schema:
{ "score": number (0-100, 0=sûr, 100=très risqué), "band": "faible"|"moyen"|"eleve", "factors": string[], "recommendations": string[], "summary": string }
Données:
${JSON.stringify(features).slice(0, 8000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu réponds STRICTEMENT en JSON valide, aucun texte hors JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", details: t }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ai = await aiRes.json();
    const raw = ai.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : raw);
    } catch {
      parsed = { score: 50, band: "moyen", factors: [], recommendations: [], summary: raw };
    }

    return new Response(JSON.stringify({ ...parsed, features_used: Object.keys(features) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-risk-score error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});