import { useState, useCallback, useRef } from "react";

interface UseTextToSpeechOptions {
  language?: string;
  autoPlay?: boolean;
}

export function useTextToSpeech({ language = "fr", autoPlay = true }: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    queueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || isPlayingRef.current) {
      return;
    }

    isPlayingRef.current = true;
    const text = queueRef.current.shift()!;

    try {
      setIsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, language }),
        }
      );

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const { audioContent } = await response.json();
      
      // Use data URI for playback
      const audioUrl = `data:audio/mpeg;base64,${audioContent}`;
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = audioUrl;
      setIsLoading(false);
      setIsSpeaking(true);

      audioRef.current.onended = () => {
        isPlayingRef.current = false;
        if (queueRef.current.length > 0) {
          playNextInQueue();
        } else {
          setIsSpeaking(false);
        }
      };

      audioRef.current.onerror = () => {
        console.error("Audio playback error");
        isPlayingRef.current = false;
        setIsSpeaking(false);
        playNextInQueue();
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("TTS error:", error);
      isPlayingRef.current = false;
      setIsLoading(false);
      setIsSpeaking(false);
      playNextInQueue();
    }
  }, [language]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Split long text into sentences for better UX
      const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      
      queueRef.current.push(...sentences.filter((s) => s.trim()));

      if (autoPlay && !isPlayingRef.current) {
        playNextInQueue();
      }
    },
    [autoPlay, playNextInQueue]
  );

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    isLoading,
  };
}
