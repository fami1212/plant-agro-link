// Direct AI proxy: routes prompts to Google Gemini (GOOGLE_AI_API_KEY) or OpenAI.
// Avoids Lovable AI Gateway dependency.
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { provider = "gemini", model, system, prompt, messages } = await req.json();
    if (!prompt && !messages) {
      return new Response(JSON.stringify({ error: "prompt or messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "gemini") {
      const key = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!key) throw new Error("GOOGLE_AI_API_KEY not configured");
      const m = model || "gemini-2.0-flash";
      const contents = messages
        ? messages.map((msg: any) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          }))
        : [{ role: "user", parts: [{ text: prompt }] }];
      const body: any = { contents };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      const text = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
      return new Response(JSON.stringify({ text, raw: j, provider: "gemini", model: m }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "openai") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key) throw new Error("OPENAI_API_KEY not configured");
      const m = model || "gpt-4o-mini";
      const msgs = messages || [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ];
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: m, messages: msgs }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      return new Response(
        JSON.stringify({ text: j.choices?.[0]?.message?.content ?? "", raw: j, provider: "openai", model: m }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown provider" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-proxy error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});