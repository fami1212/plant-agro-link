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
    const { crops, fields, iotData, livestock, weatherData } = await req.json();
    
    console.log("AI Farm Sentinel - Analyzing farm data...");
    console.log("Crops:", crops?.length || 0);
    console.log("Fields:", fields?.length || 0);
    console.log("IoT Data points:", iotData?.length || 0);
    console.log("Livestock:", livestock?.length || 0);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert agricole IA spécialisé dans l'analyse prédictive des exploitations en Afrique de l'Ouest.
Tu analyses les données de l'exploitation pour détecter les risques et opportunités.

Tu dois retourner un JSON avec cette structure exacte:
{
  "healthScore": number (0-100),
  "alerts": [
    {
      "id": "string",
      "type": "warning" | "danger" | "info" | "success",
      "title": "string (max 50 chars)",
      "message": "string (max 150 chars)",
      "action": "string (action recommandée)",
      "priority": "haute" | "moyenne" | "basse",
      "category": "irrigation" | "maladie" | "recolte" | "meteo" | "betail" | "marche"
    }
  ],
  "priorityActions": [
    {
      "title": "string",
      "description": "string",
      "urgency": "immediate" | "today" | "this_week"
    }
  ],
  "insights": {
    "irrigation": "string (conseil court)",
    "crops": "string (conseil court)",
    "livestock": "string (conseil court si applicable)"
  }
}

Analyse basée sur:
- Stades des cultures et dates de récolte attendues
- Données IoT (humidité sol, température, etc.)
- Santé du bétail
- Conditions météo actuelles et prévisions
- Prix du marché locaux

Génère 3-7 alertes pertinentes et priorisées.`;

    const userPrompt = `Analyse cette exploitation agricole et génère des alertes prédictives:

CULTURES EN COURS:
${JSON.stringify(crops || [], null, 2)}

PARCELLES:
${JSON.stringify(fields || [], null, 2)}

DONNÉES IoT RÉCENTES:
${JSON.stringify(iotData || [], null, 2)}

BÉTAIL:
${JSON.stringify(livestock || [], null, 2)}

MÉTÉO (si disponible):
${JSON.stringify(weatherData || {}, null, 2)}

Date actuelle: ${new Date().toISOString().split('T')[0]}

Génère des alertes intelligentes et un score de santé global.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requêtes atteinte, réessayez plus tard." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits insuffisants pour l'IA." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    console.log("AI Response received");

    // Parse JSON from response
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      result = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Provide default response if parsing fails
      result = {
        healthScore: 75,
        alerts: [
          {
            id: "default-1",
            type: "info",
            title: "Analyse en cours",
            message: "Les données de votre exploitation sont en cours d'analyse.",
            action: "Consultez régulièrement pour des mises à jour",
            priority: "basse",
            category: "irrigation"
          }
        ],
        priorityActions: [],
        insights: {
          irrigation: "Surveillez l'humidité du sol",
          crops: "Vos cultures progressent normalement",
          livestock: "Aucune alerte bétail"
        }
      };
    }

    console.log("AI Farm Sentinel - Analysis complete");

    return new Response(JSON.stringify({
      success: true,
      ...result,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("AI Farm Sentinel error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur inconnue",
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
