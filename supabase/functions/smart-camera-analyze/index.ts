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
    const { imageBase64, context, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant IA agricole expert qui analyse des images pour une application de gestion agricole au Sénégal.
IMPORTANT: Tu dois TOUJOURS répondre en FRANÇAIS.

Analyse l'image fournie et détermine son contenu principal. Tu dois:
1. Identifier le TYPE de contenu (culture, animal, terrain, maladie végétale, maturité de récolte)
2. Extraire les DÉTAILS pertinents EN FRANÇAIS
3. Fournir un niveau de CONFIANCE (0-1)

Contexte actuel de l'utilisateur: ${context || "general"}

TYPES DE RÉPONSE:
- "crop_identification": Pour une plante/culture (extraire: cropName, cropType, variety, growthStage, healthIssue si visible)
- "disease_detection": Pour une maladie visible sur plante (extraire: diseaseName, severity, affectedPart, treatment)
- "livestock_identification": Pour un animal (extraire: species, breed, estimatedWeight, healthConcern si visible)
- "harvest_maturity": Pour évaluer maturité récolte (extraire: cropName, maturityLevel 0-100, suggestedHarvestDate, qualityIndicators)
- "field_analysis": Pour un terrain/parcelle (extraire: soilType, vegetation, estimatedArea, fieldName suggestion)
- "unknown": Si non identifiable

Cultures locales communes: mil, maïs, arachide, niébé, tomate, oignon, manioc, riz, sorgho, pastèque
Animaux communs: bovins (Ndama, Zébu Gobra), ovins (Touabire, Peul), caprins, volailles

RÈGLES IMPORTANTES POUR LES VALEURS:
- species: utilise les valeurs françaises: "bovin", "ovin", "caprin", "volaille", "porcin", "equin", "autre"
- soilType: utilise les valeurs françaises: "argileux", "sableux", "limoneux", "calcaire", "humifere", "mixte"
- cropType: utilise les valeurs: "cereale", "legumineuse", "oleagineux", "tubercule", "maraicher", "fruitier", "fourrage", "autre"
- estimatedWeight: un nombre uniquement (sans unité)
- estimatedArea: un nombre uniquement (en hectares)
- Tous les textes descriptifs doivent être EN FRANÇAIS

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "type": "crop_identification|disease_detection|livestock_identification|harvest_maturity|field_analysis|unknown",
  "confidence": 0.85,
  "analysis": {
    // champs spécifiques au type, TOUS EN FRANÇAIS
  }
}`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse cette image et identifie son contenu pour l'application agricole. Réponds en français."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes dépassée. Réessayez plus tard." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    console.log("AI Response:", content);

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      result = {
        type: "unknown",
        confidence: 0.3,
        analysis: {
          rawResponse: content,
          error: "Impossible d'analyser la réponse de l'IA"
        }
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Smart Camera error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
