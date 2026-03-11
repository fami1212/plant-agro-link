import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768): Uint8Array {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Map language codes to ISO 639-3 for ElevenLabs
function mapLanguageCode(lang: string): string {
  const map: Record<string, string> = {
    fr: "fra",
    en: "eng",
    wo: "wol",
    "fr-FR": "fra",
    "en-US": "eng",
  };
  return map[lang] || "fra";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, language } = await req.json();
    
    if (!audio) {
      throw new Error("No audio data provided");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    console.log(`Processing voice-to-text with ElevenLabs, language: ${language || "fr"}`);

    const binaryAudio = processBase64Chunks(audio);
    
    const formData = new FormData();
    const arrayBuffer = binaryAudio.buffer.slice(0) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "audio/webm" });
    formData.append("file", blob, "audio.webm");
    formData.append("model_id", "scribe_v2");
    
    // Set language code for ElevenLabs
    const langCode = mapLanguageCode(language || "fr");
    formData.append("language_code", langCode);

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT error:", response.status, errorText);
      throw new Error(`Transcription API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Transcription successful:", result.text?.substring(0, 50));

    return new Response(
      JSON.stringify({ text: result.text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Voice-to-text error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
