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
    const { imageBase64, cropType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert agronome spécialisé dans la détection des maladies des plantes en Afrique de l'Ouest.
Analyse l'image fournie et identifie:
1. La maladie ou le problème détecté (ou "Plante saine" si aucun problème)
2. Le niveau de confiance (pourcentage)
3. La description du problème
4. Les causes probables
5. Les traitements recommandés (biologiques et chimiques si applicables)
6. Les mesures préventives
7. L'urgence d'action (faible/moyenne/élevée/critique)

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "disease_name": "nom de la maladie ou Plante saine",
  "confidence": 85,
  "severity": "moderate",
  "description": "description détaillée",
  "causes": ["cause 1", "cause 2"],
  "treatments": [
    {"type": "biologique", "name": "traitement", "dosage": "dosage", "application": "méthode"}
  ],
  "prevention": ["mesure 1", "mesure 2"],
  "urgency": "moyenne",
  "additional_notes": "notes supplémentaires"
}`;

    const userPrompt = cropType 
      ? `Analyse cette image d'une plante de type "${cropType}" pour détecter d'éventuelles maladies ou problèmes.`
      : "Analyse cette image de plante pour détecter d'éventuelles maladies ou problèmes.";

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
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      result = {
        disease_name: "Analyse non disponible",
        confidence: 0,
        severity: "unknown",
        description: content,
        causes: [],
        treatments: [],
        prevention: [],
        urgency: "faible",
        additional_notes: "L'analyse n'a pas pu être structurée correctement."
      };
    }

    return new Response(
      JSON.stringify({ success: true, analysis: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in detect-disease function:", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});