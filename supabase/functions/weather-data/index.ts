import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Real weather data using Open-Meteo (free, no API key required)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, location } = await req.json();

    // Default to Dakar if no coordinates
    const lat = latitude || 14.6928;
    const lon = longitude || -17.4467;

    console.log(`Weather request for: ${location || "Unknown"} (${lat}, ${lon})`);

    // Open-Meteo free API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Africa%2FDakar&forecast_days=7`;

    const response = await fetch(weatherUrl);
    if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);

    const weatherData = await response.json();

    const weatherCodes: Record<number, { label: string; icon: string }> = {
      0: { label: "Ciel dégagé", icon: "☀️" },
      1: { label: "Principalement dégagé", icon: "🌤️" },
      2: { label: "Partiellement nuageux", icon: "⛅" },
      3: { label: "Couvert", icon: "☁️" },
      45: { label: "Brouillard", icon: "🌫️" },
      51: { label: "Bruine légère", icon: "🌦️" },
      53: { label: "Bruine modérée", icon: "🌦️" },
      61: { label: "Pluie légère", icon: "🌧️" },
      63: { label: "Pluie modérée", icon: "🌧️" },
      65: { label: "Pluie forte", icon: "⛈️" },
      80: { label: "Averses légères", icon: "🌦️" },
      81: { label: "Averses modérées", icon: "🌧️" },
      95: { label: "Orage", icon: "⛈️" },
    };

    const current = weatherData.current;
    const daily = weatherData.daily;

    const forecast = daily.time.map((date: string, i: number) => ({
      date,
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      precipitation: daily.precipitation_sum[i],
      precipProbability: daily.precipitation_probability_max[i],
      windSpeed: daily.wind_speed_10m_max[i],
    }));

    const code = current.weather_code;
    const weather = weatherCodes[code] || { label: "Inconnu", icon: "🌡️" };

    // Agricultural recommendations based on weather
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let recommendations = "";

    if (LOVABLE_API_KEY) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: "Tu es un conseiller agricole. Donne 2-3 recommandations courtes basées sur la météo pour un agriculteur en Afrique de l'Ouest. Réponds en français, max 100 mots.",
              },
              {
                role: "user",
                content: `Météo actuelle: ${weather.label}, ${current.temperature_2m}°C, humidité ${current.relative_humidity_2m}%, précipitations ${current.precipitation}mm, vent ${current.wind_speed_10m}km/h. Prévisions 3 jours: pluie ${forecast.slice(0, 3).map((f: any) => f.precipitation + "mm").join(", ")}.`,
              },
            ],
          }),
        });
        if (aiResp.ok) {
          const aiData = await aiResp.json();
          recommendations = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI recommendation error:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      location: location || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        weatherCode: code,
        weatherLabel: weather.label,
        weatherIcon: weather.icon,
      },
      forecast,
      recommendations,
      updatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weather error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
