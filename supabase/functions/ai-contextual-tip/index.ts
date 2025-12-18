import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contextPrompts: Record<string, string> = {
      dashboard: `Donne un conseil agricole du jour pour un fermier. Parle de la saison actuelle, des bonnes pratiques, ou d'une astuce utile. Maximum 2 phrases.`,
      
      parcelles: `Donne un conseil sur la gestion des parcelles agricoles: rotation des cultures, préparation du sol, ou optimisation de l'espace. Maximum 2 phrases.`,
      
      cultures: `Donne un conseil sur le suivi des cultures: stades de croissance, besoins en eau, ou signes de stress. Maximum 2 phrases.`,
      
      betail: `Donne un conseil sur l'élevage: santé animale, alimentation, ou gestion du troupeau. Maximum 2 phrases.`,
      
      marketplace: `Donne un conseil pour bien vendre ses produits agricoles: présentation, prix, ou négociation. Maximum 2 phrases.`,
      
      investisseur: `Donne un conseil sur l'investissement agricole: évaluation des risques, diversification, ou suivi des cultures financées. Maximum 2 phrases.`,
      
      veterinaire: `Donne un conseil vétérinaire professionnel: diagnostic, prévention des maladies, ou gestion d'un cabinet vétérinaire rural. Maximum 2 phrases.`,
      
      acheteur: `Donne un conseil pour bien acheter des produits agricoles: qualité, saisonnalité, ou négociation avec les producteurs. Maximum 2 phrases.`,
      
      iot: `Donne un conseil sur l'utilisation des capteurs IoT en agriculture: interprétation des données, seuils d'alerte, ou optimisation. Maximum 2 phrases.`,
    };

    const prompt = contextPrompts[context] || contextPrompts.dashboard;
    const dataContext = data ? `\nDonnées disponibles: ${JSON.stringify(data)}` : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es un conseiller agricole expert au Sénégal. Tu donnes des conseils courts, pratiques et adaptés au contexte local. Réponds en français, de manière engageante avec un emoji si pertinent.`,
          },
          {
            role: "user",
            content: prompt + dataContext,
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(
        JSON.stringify({ tip: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const tip = result.choices?.[0]?.message?.content || null;

    return new Response(
      JSON.stringify({ tip }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Contextual tip error:", error);
    return new Response(
      JSON.stringify({ tip: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});