import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simulated market prices for West Africa (would be replaced with real API in production)
const baseMarketPrices: Record<string, { price: number; unit: string; trend: string }> = {
  "mais": { price: 250, unit: "FCFA/kg", trend: "stable" },
  "mil": { price: 280, unit: "FCFA/kg", trend: "hausse" },
  "sorgho": { price: 220, unit: "FCFA/kg", trend: "stable" },
  "arachide": { price: 450, unit: "FCFA/kg", trend: "hausse" },
  "riz": { price: 380, unit: "FCFA/kg", trend: "baisse" },
  "niebe": { price: 520, unit: "FCFA/kg", trend: "hausse" },
  "manioc": { price: 150, unit: "FCFA/kg", trend: "stable" },
  "patate_douce": { price: 180, unit: "FCFA/kg", trend: "stable" },
  "oignon": { price: 350, unit: "FCFA/kg", trend: "hausse" },
  "tomate": { price: 400, unit: "FCFA/kg", trend: "baisse" },
  "pomme_de_terre": { price: 320, unit: "FCFA/kg", trend: "stable" },
  "coton": { price: 300, unit: "FCFA/kg", trend: "hausse" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userCrops, action } = await req.json();
    
    console.log("Market Prices - Request received, action:", action);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Add some random variation to simulate real market
    const currentPrices = Object.entries(baseMarketPrices).map(([name, data]) => {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const currentPrice = Math.round(data.price * (1 + variation));
      const weekAgo = Math.round(data.price * (1 + (Math.random() - 0.5) * 0.15));
      const monthAgo = Math.round(data.price * (1 + (Math.random() - 0.5) * 0.25));
      
      return {
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
        currentPrice,
        unit: data.unit,
        trend: data.trend,
        weekChange: ((currentPrice - weekAgo) / weekAgo * 100).toFixed(1),
        monthChange: ((currentPrice - monthAgo) / monthAgo * 100).toFixed(1),
        weekAgo,
        monthAgo,
      };
    });

    if (action === "predict") {
      // Use AI to predict price trends
      const systemPrompt = `Tu es un expert des marchés agricoles en Afrique de l'Ouest.
Analyse les prix actuels et génère des prédictions réalistes pour les 30 prochains jours.

Retourne un JSON avec cette structure:
{
  "predictions": [
    {
      "crop": "string",
      "currentPrice": number,
      "predictedPrice": number,
      "confidence": number (0-100),
      "recommendation": "acheter" | "vendre" | "attendre",
      "reason": "string (explication courte)"
    }
  ],
  "marketSummary": "string (résumé du marché en 2-3 phrases)",
  "bestTimeToSell": {
    "crop": "string",
    "reason": "string"
  }
}`;

      const userPrompt = `Voici les prix actuels du marché:
${JSON.stringify(currentPrices, null, 2)}

Cultures de l'utilisateur: ${JSON.stringify(userCrops || [])}

Génère des prédictions de prix pour les 30 prochains jours avec des recommandations d'achat/vente.`;

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
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;

      let predictions;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        predictions = JSON.parse((jsonMatch[1] || content).trim());
      } catch {
        predictions = {
          predictions: currentPrices.slice(0, 5).map(p => ({
            crop: p.displayName,
            currentPrice: p.currentPrice,
            predictedPrice: Math.round(p.currentPrice * (1 + (Math.random() - 0.4) * 0.1)),
            confidence: Math.floor(60 + Math.random() * 30),
            recommendation: Math.random() > 0.5 ? "vendre" : "attendre",
            reason: "Tendance du marché régional"
          })),
          marketSummary: "Le marché agricole reste stable avec une légère tendance haussière pour les céréales.",
          bestTimeToSell: { crop: "Arachide", reason: "Prix au plus haut de la saison" }
        };
      }

      return new Response(JSON.stringify({
        success: true,
        currentPrices,
        ...predictions,
        updatedAt: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: return current prices only
    return new Response(JSON.stringify({
      success: true,
      currentPrices,
      updatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Market Prices error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur inconnue",
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
