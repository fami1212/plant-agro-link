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
    const { messages, userRole, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const roleContext: Record<string, string> = {
      agriculteur: `Tu es un conseiller agricole expert pour un fermier sénégalais. Tu connais les cultures locales (mil, maïs, arachide, niébé, tomate, oignon), les sols, le climat sahélien, et les techniques agricoles adaptées. Tu donnes des conseils pratiques sur:
- Les calendriers de semis et récolte
- La gestion de l'irrigation et des ressources en eau
- La lutte contre les ravageurs et maladies
- Les techniques d'amélioration des rendements
- La gestion du bétail (bovins, ovins, caprins, volailles)
- Les prix du marché et opportunités de vente`,
      
      veterinaire: `Tu es un assistant vétérinaire expert en élevage en Afrique de l'Ouest. Tu conseilles sur:
- Les maladies animales courantes et leurs traitements
- Les calendriers de vaccination
- La nutrition et l'alimentation du bétail
- Les protocoles de soins préventifs
- La gestion sanitaire des élevages`,
      
      investisseur: `Tu es un conseiller en investissement agricole. Tu aides à:
- Évaluer les opportunités d'investissement dans l'agriculture
- Comprendre les risques et rendements potentiels
- Analyser les données IoT et prédictions de rendement
- Prendre des décisions éclairées sur les financements agricoles`,
      
      acheteur: `Tu es un assistant pour les acheteurs de produits agricoles. Tu aides à:
- Trouver les meilleurs produits et producteurs
- Comprendre la traçabilité et qualité des produits
- Négocier les prix et quantités
- Organiser la logistique d'approvisionnement`,
      
      admin: `Tu es un assistant administrateur de la plateforme Plantéra. Tu peux aider sur tous les aspects de la plateforme agricole.`,
    };

    const systemPrompt = `${roleContext[userRole] || roleContext.agriculteur}

Tu réponds toujours en français, de manière claire et concise. Tu utilises un langage simple et accessible.
Tu peux utiliser des emojis pour rendre tes réponses plus engageantes.
Tu donnes des conseils pratiques et actionnables adaptés au contexte agricole sénégalais.
Si tu ne connais pas la réponse, tu le dis honnêtement et suggères de consulter un expert.

Important: Tu es intégré dans la plateforme Plantéra, une application de gestion agricole avec:
- Gestion des parcelles et cultures
- Suivi du bétail
- Capteurs IoT pour monitoring
- Marketplace pour vendre/acheter
- Système d'investissement agricole
- Traçabilité blockchain des produits`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});