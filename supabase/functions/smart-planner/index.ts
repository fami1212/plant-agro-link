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
    const { crops, livestock, existingTasks, weatherForecast } = await req.json();
    
    console.log("Smart Planner - Generating intelligent task suggestions...");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un assistant agricole expert qui génère des recommandations de tâches intelligentes.
Tu analyses le stade des cultures, la santé du bétail et les conditions météo pour suggérer des actions.

Retourne un JSON avec cette structure exacte:
{
  "suggestedTasks": [
    {
      "id": "string",
      "title": "string (max 50 chars)",
      "description": "string (max 100 chars)",
      "priority": "haute" | "moyenne" | "basse",
      "category": "irrigation" | "traitement" | "recolte" | "semis" | "betail" | "entretien",
      "dueDate": "YYYY-MM-DD",
      "relatedTo": "string (nom de la culture ou animal)",
      "weatherDependent": boolean,
      "estimatedDuration": "string (ex: 2h, 30min)"
    }
  ],
  "weeklyPlan": {
    "summary": "string (résumé de la semaine)",
    "criticalDays": ["YYYY-MM-DD"],
    "bestDaysForFieldWork": ["YYYY-MM-DD"]
  },
  "reminders": [
    {
      "type": "vaccination" | "traitement" | "recolte" | "semis",
      "message": "string",
      "daysUntil": number
    }
  ]
}

Génère 5-10 tâches pertinentes basées sur:
- Le stade actuel des cultures
- Les dates de récolte prévues
- La santé et les besoins du bétail
- Les conditions météo
- Les bonnes pratiques agricoles

Priorise selon l'urgence et l'impact.`;

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const userPrompt = `Date actuelle: ${today.toISOString().split('T')[0]}

CULTURES EN COURS:
${JSON.stringify(crops || [], null, 2)}

BÉTAIL:
${JSON.stringify(livestock || [], null, 2)}

TÂCHES EXISTANTES:
${JSON.stringify(existingTasks || [], null, 2)}

PRÉVISIONS MÉTÉO (7 jours):
${JSON.stringify(weatherForecast || {}, null, 2)}

Génère des suggestions de tâches intelligentes pour la semaine à venir.`;

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
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse((jsonMatch[1] || content).trim());
    } catch {
      // Default response if parsing fails
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      result = {
        suggestedTasks: [
          {
            id: "default-1",
            title: "Vérifier l'humidité du sol",
            description: "Contrôle quotidien de l'irrigation",
            priority: "moyenne",
            category: "irrigation",
            dueDate: tomorrow.toISOString().split('T')[0],
            relatedTo: "Toutes parcelles",
            weatherDependent: false,
            estimatedDuration: "30min"
          }
        ],
        weeklyPlan: {
          summary: "Semaine de maintenance régulière",
          criticalDays: [],
          bestDaysForFieldWork: [tomorrow.toISOString().split('T')[0]]
        },
        reminders: []
      };
    }

    console.log("Smart Planner - Generated", result.suggestedTasks?.length || 0, "tasks");

    return new Response(JSON.stringify({
      success: true,
      ...result,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Smart Planner error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur inconnue",
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
