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
    const { cropData, fieldData, historicalData, iotData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Predicting yield for crop:', cropData?.name || 'Unknown');

    const prompt = `Tu es un expert agronome spécialisé en prédiction de rendement agricole en Afrique de l'Ouest.

Analyse ces données et fournis une prédiction de rendement détaillée:

**Culture:**
- Type: ${cropData?.crop_type || 'Non spécifié'}
- Variété: ${cropData?.variety || 'Non spécifié'}
- Nom: ${cropData?.name || 'Non spécifié'}
- Surface: ${cropData?.area_hectares || fieldData?.area_hectares || 'Non spécifié'} hectares
- Date de semis: ${cropData?.sowing_date || 'Non spécifié'}
- Date de récolte prévue: ${cropData?.expected_harvest_date || 'Non spécifié'}
- Rendement attendu: ${cropData?.expected_yield_kg || 'Non spécifié'} kg

**Parcelle:**
- Type de sol: ${fieldData?.soil_type || 'Non spécifié'}
- Système d'irrigation: ${fieldData?.irrigation_system || 'Non spécifié'}

**Données IoT récentes:**
${iotData ? JSON.stringify(iotData, null, 2) : 'Aucune donnée disponible'}

**Historique des récoltes:**
${historicalData ? JSON.stringify(historicalData, null, 2) : 'Aucun historique disponible'}

Fournis ta réponse en JSON avec cette structure exacte:
{
  "predicted_yield_kg": <nombre>,
  "predicted_yield_per_hectare": <nombre>,
  "confidence_score": <0-100>,
  "yield_range": {
    "min_kg": <nombre>,
    "max_kg": <nombre>
  },
  "factors_positive": ["<facteur1>", "<facteur2>"],
  "factors_negative": ["<facteur1>", "<facteur2>"],
  "recommendations": ["<recommandation1>", "<recommandation2>"],
  "weather_impact": "<faible|moyen|élevé>",
  "disease_risk": "<faible|moyen|élevé>",
  "optimal_harvest_date": "<date ISO>",
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
            content: 'Tu es un expert agronome qui fournit des prédictions de rendement précises basées sur les données agricoles. Réponds toujours en JSON valide.'
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

    // Extract JSON from response
    let prediction;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      prediction = {
        predicted_yield_kg: cropData?.expected_yield_kg || 0,
        confidence_score: 50,
        analysis_summary: content || 'Analyse non disponible',
        recommendations: ['Vérifiez vos données et réessayez']
      };
    }

    return new Response(JSON.stringify({
      success: true,
      prediction,
      analyzed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Yield prediction error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur lors de la prédiction' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
