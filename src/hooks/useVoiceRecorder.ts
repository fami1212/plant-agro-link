import { useState, useRef, useCallback } from "react";

interface UseVoiceRecorderOptions {
  onTranscription?: (text: string) => void;
  language?: string;
}

export function useVoiceRecorder({ onTranscription, language = "fr" }: UseVoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

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
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        if (onTranscription && audioBlob.size > 0) {
          setIsProcessing(true);
          try {
            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(",")[1];
              
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                  },
                  body: JSON.stringify({ audio: base64, language }),
                }
              );

              if (response.ok) {
                const { text } = await response.json();
                if (text) {
                  onTranscription(text);
                }
              }
              setIsProcessing(false);
            };
          } catch (error) {
            console.error("Transcription error:", error);
            setIsProcessing(false);
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }, [onTranscription, language]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
