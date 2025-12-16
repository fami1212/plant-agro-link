import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fieldData, cropData, iotData, weatherData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating irrigation recommendations for field:', fieldData?.name || 'Unknown');

    const prompt = `Tu es un expert en irrigation et fertilisation agricole en Afrique de l'Ouest.

Analyse ces données et fournis des recommandations personnalisées:

**Parcelle:**
- Nom: ${fieldData?.name || 'Non spécifié'}
- Surface: ${fieldData?.area_hectares || 'Non spécifié'} hectares
- Type de sol: ${fieldData?.soil_type || 'Non spécifié'}
- Système d'irrigation: ${fieldData?.irrigation_system || 'Non installé'}

**Culture en cours:**
- Type: ${cropData?.crop_type || 'Non spécifié'}
- Variété: ${cropData?.variety || 'Non spécifié'}
- Stade: ${cropData?.status || 'Non spécifié'}
- Date de semis: ${cropData?.sowing_date || 'Non spécifié'}

**Données capteurs IoT (dernières 24h):**
${iotData ? JSON.stringify(iotData, null, 2) : 'Aucun capteur connecté'}

**Prévisions météo:**
${weatherData ? JSON.stringify(weatherData, null, 2) : 'Non disponibles'}

Fournis ta réponse en JSON avec cette structure:
{
  "irrigation": {
    "action_needed": <true/false>,
    "urgency": "<immédiate|aujourd'hui|cette semaine|non nécessaire>",
    "water_amount_liters": <nombre>,
    "best_time": "<matin tôt|soir|nuit>",
    "method_recommended": "<goutte à goutte|aspersion|gravitaire>",
    "frequency": "<quotidienne|tous les 2 jours|hebdomadaire>",
    "duration_minutes": <nombre>
  },
  "fertilization": {
    "action_needed": <true/false>,
    "type": "<NPK|urée|compost|fumier|aucun>",
    "quantity_kg_per_hectare": <nombre>,
    "timing": "<maintenant|semaine prochaine|après irrigation>",
    "application_method": "<épandage|fertigation|enfouissement>"
  },
  "soil_health": {
    "status": "<bon|moyen|attention nécessaire>",
    "ph_recommendation": "<string ou null>",
    "organic_matter_advice": "<string>"
  },
  "alerts": ["<alerte1>", "<alerte2>"],
  "recommendations": ["<conseil1>", "<conseil2>", "<conseil3>"],
  "water_savings_tips": ["<astuce1>", "<astuce2>"],
  "next_check_date": "<date ISO>",
  "confidence_score": <0-100>,
  "analysis_summary": "<résumé en 2-3 phrases>"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en irrigation et agronomie qui fournit des conseils précis et pratiques pour les agriculteurs africains. Réponds toujours en JSON valide.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, veuillez réessayer plus tard.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI response received:', content?.substring(0, 200));

    let recommendations;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      recommendations = {
        irrigation: { action_needed: false, urgency: 'non nécessaire' },
        fertilization: { action_needed: false },
        recommendations: ['Connectez des capteurs IoT pour des recommandations précises'],
        analysis_summary: content || 'Analyse non disponible'
      };
    }

    return new Response(JSON.stringify({
      success: true,
      recommendations,
      analyzed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Irrigation recommendations error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur lors de l\'analyse' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
