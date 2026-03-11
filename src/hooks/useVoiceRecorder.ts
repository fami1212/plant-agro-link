import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderOptions {
  onTranscription?: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  language?: string;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

export function useVoiceRecorder({ 
  onTranscription, 
  onPartialTranscript,
  language = "fr" 
}: UseVoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Start Web Speech API for real-time transcription
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "fr" ? "fr-FR" : language === "wo" ? "fr-FR" : "en-US";

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const currentText = finalTranscript || interimTranscript;
          setPartialTranscript(currentText);
          onPartialTranscript?.(currentText);
        };

        recognition.onerror = (event: Event) => {
          console.error("Speech recognition error:", event);
        };

        recognitionRef.current = recognition;
        recognition.start();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop speech recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }

        stream.getTracks().forEach((track) => track.stop());

        // Use Web Speech API transcript (no server call needed)
        const finalText = partialTranscript.trim();
        if (finalText && onTranscription) {
          onTranscription(finalText);
        }
        setIsProcessing(false);
        setPartialTranscript("");
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setPartialTranscript("");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }, [onTranscription, onPartialTranscript, language]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [isRecording]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    partialTranscript,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
