import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// USSD/SMS Gateway - handles incoming USSD sessions and SMS messages
// In production, connect this to Twilio, Africa's Talking, or Orange SMS API
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { type, phone, sessionId, input, message } = body;

    console.log(`USSD/SMS Gateway - type: ${type}, phone: ${phone}`);

    if (type === "ussd") {
      return handleUSSD(sb, sessionId, phone, input);
    } else if (type === "sms") {
      return handleSMS(sb, phone, message);
    } else if (type === "send_sms") {
      return sendSMS(body);
    }

    return new Response(JSON.stringify({ error: "Type non supporté" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gateway error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erreur",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleUSSD(sb: any, sessionId: string, phone: string, input: string) {
  // USSD menu tree
  const menus: Record<string, string> = {
    "": `CON Bienvenue sur Plantera
1. Mes parcelles
2. Prix du marché
3. Mes commandes
4. Alertes météo
5. Contacter support`,
    
    "1": `CON Mes Parcelles:
Chargement...`,
    
    "2": `CON Prix du marché (FCFA/kg):
Maïs: 250
Riz: 380
Arachide: 450
Mil: 280
Oignon: 350
0. Retour`,
    
    "3": `CON Mes commandes:
Aucune commande en cours.
0. Retour`,
    
    "4": `CON Alertes météo:
Température: 32°C
Pluie prévue demain
0. Retour`,
    
    "5": `END Contactez-nous:
WhatsApp: +221 77 XXX XX XX
Email: support@plantera.app`,
  };

  // Dynamic parcelles
  if (input === "1") {
    const { data: profile } = await sb
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (profile) {
      const { data: fields } = await sb
        .from("fields")
        .select("name, area_hectares, soil_type")
        .eq("user_id", profile.user_id)
        .limit(5);

      if (fields && fields.length > 0) {
        const list = fields.map((f: any, i: number) => `${i + 1}. ${f.name} (${f.area_hectares}ha)`).join("\n");
        return respond(`CON Mes Parcelles:\n${list}\n0. Retour`);
      }
    }
    return respond("CON Aucune parcelle trouvée.\nInscrivez-vous sur plantera.app\n0. Retour");
  }

  const response = menus[input] || menus[""];
  return respond(response);
}

async function handleSMS(sb: any, phone: string, message: string) {
  const cmd = message?.trim().toLowerCase() || "";

  let reply = "Bienvenue sur Plantera! Envoyez:\nPRIX - Prix du marché\nMETEO - Alertes météo\nAIDE - Aide";

  if (cmd === "prix" || cmd === "price") {
    reply = "Prix du marché (FCFA/kg):\nMaïs: 250\nRiz: 380\nArachide: 450\nMil: 280\nOignon: 350\n\nMise à jour: aujourd'hui";
  } else if (cmd === "meteo" || cmd === "weather") {
    reply = "Météo Dakar:\n32°C, Ensoleillé\nHumidité: 65%\nPluie prévue: demain\n\nConseil: Arrosez ce soir";
  } else if (cmd === "aide" || cmd === "help") {
    reply = "Plantera - Aide:\nPRIX - Prix du marché\nMETEO - Alertes météo\nSTATUT - Mes commandes\n\nWeb: plantera.app\nTel: +221 77 XXX XX XX";
  }

  return new Response(JSON.stringify({
    success: true,
    reply,
    phone,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendSMS(body: any) {
  // In production: integrate with Africa's Talking, Twilio, or Orange SMS API
  const { to, message } = body;

  console.log(`[SMS] Sending to ${to}: ${message}`);

  // Simulate SMS sending
  return new Response(JSON.stringify({
    success: true,
    messageId: `SMS-${Date.now().toString(36)}`,
    to,
    status: "queued",
    note: "SMS gateway simulation - connectez une API SMS réelle en production",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function respond(text: string) {
  return new Response(JSON.stringify({ success: true, response: text }), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}
