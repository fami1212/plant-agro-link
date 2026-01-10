import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseChatVoiceRecorderOptions {
  onAudioReady?: (audioUrl: string, duration: number) => void;
}

export function useChatVoiceRecorder({ onAudioReady }: UseChatVoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      
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

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start timer for duration display
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Impossible d'accéder au microphone");
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (userId: string): Promise<{ url: string; duration: number } | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      mediaRecorder.onstop = async () => {
        // Clean up timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (chunksRef.current.length === 0) {
          setIsRecording(false);
          setRecordingDuration(0);
          resolve(null);
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        if (audioBlob.size < 1000) {
          // Audio too short
          setIsRecording(false);
          setRecordingDuration(0);
          resolve(null);
          return;
        }

        setIsUploading(true);

        try {
          // Upload to storage
          const fileName = `${userId}/${Date.now()}-voice.webm`;
          
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(fileName, audioBlob, {
              contentType: "audio/webm",
            });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            toast.error("Erreur lors de l'envoi du message vocal");
            setIsUploading(false);
            setIsRecording(false);
            setRecordingDuration(0);
            resolve(null);
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("chat-attachments")
            .getPublicUrl(fileName);

          setIsUploading(false);
          setIsRecording(false);
          setRecordingDuration(0);
          
          onAudioReady?.(publicUrl, duration);
          resolve({ url: publicUrl, duration });
          
        } catch (error) {
          console.error("Error uploading voice message:", error);
          toast.error("Erreur lors de l'envoi du message vocal");
          setIsUploading(false);
          setIsRecording(false);
          setRecordingDuration(0);
          resolve(null);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording, onAudioReady]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  }, [isRecording]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isRecording,
    recordingDuration,
    isUploading,
    startRecording,
    stopRecording,
    cancelRecording,
    formatDuration,
  };
}
