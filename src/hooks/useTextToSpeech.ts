import { useState, useCallback, useRef } from "react";

interface UseTextToSpeechOptions {
  language?: string;
  autoPlay?: boolean;
}

export function useTextToSpeech({ language = "fr", autoPlay = true }: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (!("speechSynthesis" in window)) {
        console.error("Speech synthesis not supported");
        return;
      }

      stopSpeaking();
      setIsLoading(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Set language based on parameter
      const langMap: Record<string, string> = {
        fr: "fr-FR",
        en: "en-US",
        wo: "fr-FR", // Fallback to French for Wolof
      };
      utterance.lang = langMap[language] || "fr-FR";
      utterance.rate = 0.9;
      utterance.pitch = 1;

      // Try to find a good voice for the language
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith(language) || v.lang.startsWith(langMap[language]?.split("-")[0] || "fr")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsLoading(false);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        setIsSpeaking(false);
        setIsLoading(false);
      };

      if (autoPlay) {
        window.speechSynthesis.speak(utterance);
      }
    },
    [language, autoPlay, stopSpeaking]
  );

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    isLoading,
  };
}
