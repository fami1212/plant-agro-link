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
  Sparkles,
  Pause,
  Play,
  Square,
  Settings2,
  Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

// Available languages
const languages = [
  { code: "fr-FR", label: "Français", flag: "🇫🇷" },
  { code: "wo", label: "Wolof", flag: "🇸🇳" },
  { code: "en-US", label: "English", flag: "🇬🇧" },
];

// Clean text for speech (remove asterisks, markdown, etc.)
const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\*\*/g, "") // Remove bold markdown
    .replace(/\*/g, "") // Remove italic markdown
    .replace(/_/g, "") // Remove underscores
    .replace(/#{1,6}\s/g, "") // Remove headers
    .replace(/`/g, "") // Remove code ticks
    .replace(/\n{2,}/g, ". ") // Replace multiple newlines with pause
    .replace(/\n/g, " ") // Replace single newlines with space
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRealtimeMode, setIsRealtimeMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("fr-FR");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Auto-select a voice for the current language
      const langVoice = voices.find(v => v.lang.startsWith(selectedLanguage.split("-")[0]));
      if (langVoice && !selectedVoice) {
        setSelectedVoice(langVoice.name);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedLanguage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
      disconnectRealtime();
    };
  }, []);

  // Get voices filtered by language
  const getVoicesForLanguage = (langCode: string) => {
    const langPrefix = langCode === "wo" ? "fr" : langCode.split("-")[0];
    return availableVoices.filter(v => v.lang.startsWith(langPrefix));
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setStatusMessage("");
    currentUtteranceRef.current = null;
  };

  // Pause speaking
  const pauseSpeaking = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setStatusMessage("⏸️");
    }
  };

  // Resume speaking
  const resumeSpeaking = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setStatusMessage("🔊");
    }
  };

  // Speak text using Web Speech API (browser native TTS)
  const speakText = async (text: string) => {
    if (!("speechSynthesis" in window)) {
      console.error("Speech synthesis not supported");
      return;
    }

    // Stop any ongoing speech
    stopSpeaking();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    setIsSpeaking(true);
    setStatusMessage("🔊");

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      currentUtteranceRef.current = utterance;
      
      // Set language (Wolof falls back to French)
      utterance.lang = selectedLanguage === "wo" ? "fr-FR" : selectedLanguage;
      utterance.rate = speechRate;
      utterance.pitch = 1;

      // Set selected voice
      if (selectedVoice) {
        const voice = availableVoices.find(v => v.name === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
      } else {
        // Auto-select a voice for the language
        const langVoice = getVoicesForLanguage(selectedLanguage)[0];
        if (langVoice) {
          utterance.voice = langVoice;
        }
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setStatusMessage("");
        currentUtteranceRef.current = null;
        resolve();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setStatusMessage("");
        currentUtteranceRef.current = null;
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

  // Interrupt speaking to ask new question
  const interruptAndListen = () => {
    stopSpeaking();
    startListening();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4 safe-area-inset">
      {/* Back button and settings */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
        >
          <Home className="w-6 h-6" />
        </Button>

        {/* Settings Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings2 className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                Paramètres vocaux
              </SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 py-6">
              {/* Language selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Langue</label>
                <div className="flex gap-2">
                  {languages.map((lang) => (
                    <Button
                      key={lang.code}
                      variant={selectedLanguage === lang.code ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setSelectedVoice("");
                      }}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-xs">{lang.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Voice selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Voix</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Voix automatique" />
                  </SelectTrigger>
                  <SelectContent>
                    {getVoicesForLanguage(selectedLanguage).map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.name} {voice.localService ? "📱" : "☁️"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speech rate */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Vitesse: {speechRate.toFixed(1)}x</label>
                <div className="flex gap-2">
                  {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                    <Button
                      key={rate}
                      variant={speechRate === rate ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSpeechRate(rate)}
                    >
                      {rate}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Language indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
          <span className="text-2xl">
            {languages.find(l => l.code === selectedLanguage)?.flag}
          </span>
          <span className="text-sm font-medium">
            {languages.find(l => l.code === selectedLanguage)?.label}
          </span>
        </div>

        {/* Status indicator - large emoji/icon */}
        <div className="text-6xl h-20 flex items-center justify-center">
          {statusMessage || (
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
          )}
        </div>

        {/* Main mic button - LARGE */}
        <button
          onClick={isSpeaking ? interruptAndListen : (isRealtimeMode ? disconnectRealtime : toggleListening)}
          disabled={isProcessing}
          className={cn(
            "relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300",
            "shadow-2xl hover:scale-105 active:scale-95",
            isSpeaking
              ? "bg-orange-500 hover:bg-orange-600"
              : isListening || isRealtimeMode
              ? "bg-red-500 hover:bg-red-600"
              : "bg-primary hover:bg-primary/90",
            isProcessing && "opacity-50 cursor-not-allowed",
            pulseAnimation && "animate-pulse"
          )}
        >
          {/* Pulse rings when active */}
          {(isListening || isRealtimeMode) && !isSpeaking && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              <span className="absolute inset-2 rounded-full bg-red-400 animate-ping opacity-20 animation-delay-150" />
            </>
          )}
          
          {isProcessing ? (
            <Loader2 className="w-20 h-20 text-white animate-spin" />
          ) : isSpeaking ? (
            <Mic className="w-20 h-20 text-white" />
          ) : isListening || isRealtimeMode ? (
            <MicOff className="w-20 h-20 text-white" />
          ) : (
            <Mic className="w-20 h-20 text-white" />
          )}
        </button>

        {/* Playback controls when speaking */}
        {isSpeaking && (
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full"
              onClick={isPaused ? resumeSpeaking : pauseSpeaking}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full"
              onClick={stopSpeaking}
            >
              <Square className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Realtime mode toggle */}
        {!isSpeaking && (
          <Button
            variant={isRealtimeMode ? "destructive" : "outline"}
            size="lg"
            className="gap-2 rounded-full px-6"
            onClick={isRealtimeMode ? disconnectRealtime : connectRealtime}
            disabled={isProcessing || isListening}
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
        )}

        {/* Voice shortcuts grid - icons only */}
        <div className="grid grid-cols-3 gap-4 w-full mt-4">
          {voiceShortcuts.map((shortcut, i) => (
            <button
              key={i}
              onClick={() => handleShortcut(shortcut.command)}
              disabled={isProcessing || isListening}
              className={cn(
                "aspect-square rounded-2xl flex items-center justify-center",
                "transition-all duration-200 hover:scale-105 active:scale-95",
                "shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                shortcut.color,
                isSpeaking && "opacity-70"
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
