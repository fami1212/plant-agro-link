import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Home, 
  Wheat, 
  CloudSun, 
  TrendingUp,
  Stethoscope,
  ShoppingCart,
  Loader2,
  Phone,
  PhoneOff,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Voice shortcuts with icons (no text needed for illiterate users)
const voiceShortcuts = [
  { 
    icon: TrendingUp, 
    color: "bg-green-500", 
    command: "Donne-moi les prix du marché pour le maïs et le mil",
    label: "Prix"
  },
  { 
    icon: CloudSun, 
    color: "bg-blue-500", 
    command: "Quelle est la météo prévue pour demain et cette semaine ?",
    label: "Météo"
  },
  { 
    icon: Wheat, 
    color: "bg-amber-500", 
    command: "Quel est l'état de mes cultures actuellement ?",
    label: "Cultures"
  },
  { 
    icon: Stethoscope, 
    color: "bg-red-500", 
    command: "Y a-t-il des alertes santé pour mon bétail ?",
    label: "Santé"
  },
  { 
    icon: ShoppingCart, 
    color: "bg-purple-500", 
    command: "Quelles sont mes offres en attente sur le marketplace ?",
    label: "Offres"
  },
  { 
    icon: Home, 
    color: "bg-gray-500", 
    command: "Donne-moi un résumé de mon exploitation",
    label: "Résumé"
  },
];

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRealtimeMode, setIsRealtimeMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      disconnectRealtime();
    };
  }, []);

  // Speak text using Web Speech API (browser native TTS)
  const speakText = async (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.error("Speech synthesis not supported");
      return;
    }

    setIsSpeaking(true);
    setStatusMessage("🔊");

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.9;
      utterance.pitch = 1;

      // Try to find a French voice
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setStatusMessage("");
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setStatusMessage("");
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  // Send message to AI and speak response
  const sendToAI = async (message: string) => {
    setIsProcessing(true);
    setStatusMessage("🤔");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: message }],
            userRole: "agriculteur",
            userId: user?.id,
          }),
        }
      );

      if (!response.ok) throw new Error("AI request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {}
            }
          }
        }
      }

      setIsProcessing(false);
      if (fullResponse) {
        await speakText(fullResponse);
      }
    } catch (error) {
      console.error("AI error:", error);
      setIsProcessing(false);
      await speakText("Désolé, une erreur s'est produite. Réessayez.");
    }
  };

  // Start listening (one-shot mode)
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        
        if (audioBlob.size > 0) {
          setIsProcessing(true);
          setStatusMessage("⏳");
          
          // Transcribe
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(",")[1];
            
            try {
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  },
                  body: JSON.stringify({ audio: base64, language: "fr" }),
                }
              );

              if (response.ok) {
                const { text } = await response.json();
                if (text) {
                  await sendToAI(text);
                }
              }
            } catch (error) {
              console.error("Transcription error:", error);
              setIsProcessing(false);
            }
          };
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      setStatusMessage("🎤");
      setPulseAnimation(true);
    } catch (error) {
      toast({
        title: "Microphone requis",
        description: "Autorisez l'accès au microphone",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setPulseAnimation(false);
    }
  };

  // Toggle main mic button
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Connect to realtime conversation
  const connectRealtime = async () => {
    try {
      setIsRealtimeMode(true);
      setStatusMessage("📞");
      
      // Get ephemeral token
      const tokenResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-realtime-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!tokenResponse.ok) {
        throw new Error("Failed to get realtime session");
      }

      const { client_secret } = await tokenResponse.json();
      
      toast({
        title: "Mode conversation",
        description: "Parlez naturellement, je vous écoute en continu",
      });

      // For now, fall back to regular mode since full WebRTC implementation is complex
      setIsRealtimeMode(true);
      startListening();
      
    } catch (error) {
      console.error("Realtime connection error:", error);
      toast({
        title: "Erreur connexion",
        description: "Mode conversation non disponible",
        variant: "destructive",
      });
      setIsRealtimeMode(false);
    }
  };

  const disconnectRealtime = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopListening();
    setIsRealtimeMode(false);
    setStatusMessage("");
  };

  // Handle shortcut click
  const handleShortcut = async (command: string) => {
    setPulseAnimation(true);
    await sendToAI(command);
    setPulseAnimation(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4 safe-area-inset">
      {/* Back button - icon only */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4"
        onClick={() => navigate("/dashboard")}
      >
        <Home className="w-6 h-6" />
      </Button>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 max-w-md w-full">
        {/* Status indicator - large emoji/icon */}
        <div className="text-6xl h-20 flex items-center justify-center">
          {statusMessage || (
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
          )}
        </div>

        {/* Main mic button - LARGE */}
        <button
          onClick={isRealtimeMode ? disconnectRealtime : toggleListening}
          disabled={isProcessing || isSpeaking}
          className={cn(
            "relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-2xl hover:scale-105 active:scale-95",
            isListening || isRealtimeMode
              ? "bg-red-500 hover:bg-red-600"
              : "bg-primary hover:bg-primary/90",
            (isProcessing || isSpeaking) && "opacity-50 cursor-not-allowed",
            pulseAnimation && "animate-pulse"
          )}
        >
          {/* Pulse rings when active */}
          {(isListening || isRealtimeMode) && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              <span className="absolute inset-2 rounded-full bg-red-400 animate-ping opacity-20 animation-delay-150" />
            </>
          )}
          
          {isProcessing ? (
            <Loader2 className="w-20 h-20 text-white animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-20 h-20 text-white animate-pulse" />
          ) : isListening || isRealtimeMode ? (
            <MicOff className="w-20 h-20 text-white" />
          ) : (
            <Mic className="w-20 h-20 text-white" />
          )}
        </button>

        {/* Realtime mode toggle */}
        <Button
          variant={isRealtimeMode ? "destructive" : "outline"}
          size="lg"
          className="gap-2 rounded-full px-6"
          onClick={isRealtimeMode ? disconnectRealtime : connectRealtime}
          disabled={isProcessing || isSpeaking || isListening}
        >
          {isRealtimeMode ? (
            <>
              <PhoneOff className="w-5 h-5" />
              <span className="sr-only">Raccrocher</span>
            </>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              <span className="sr-only">Mode conversation</span>
            </>
          )}
        </Button>

        {/* Voice shortcuts grid - icons only */}
        <div className="grid grid-cols-3 gap-4 w-full mt-4">
          {voiceShortcuts.map((shortcut, i) => (
            <button
              key={i}
              onClick={() => handleShortcut(shortcut.command)}
              disabled={isProcessing || isSpeaking || isListening}
              className={cn(
                "aspect-square rounded-2xl flex items-center justify-center",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                "shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                shortcut.color
              )}
            >
              <shortcut.icon className="w-10 h-10 text-white" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
