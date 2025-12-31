import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VolumeVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  variant?: "bars" | "wave" | "circle";
  className?: string;
}

export function VolumeVisualizer({ 
  stream, 
  isActive, 
  variant = "bars",
  className 
}: VolumeVisualizerProps) {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [volumeBars, setVolumeBars] = useState<number[]>(Array(12).fill(0));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      setVolumeLevel(0);
      setVolumeBars(Array(12).fill(0));
      return;
    }

    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current || !isActive) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedVolume = Math.min(average / 128, 1);
        setVolumeLevel(normalizedVolume);

        // Create bar visualization from frequency data
        const bars = [];
        const barCount = 12;
        const step = Math.floor(dataArray.length / barCount);
        for (let i = 0; i < barCount; i++) {
          const start = i * step;
          const end = start + step;
          const slice = dataArray.slice(start, end);
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
          bars.push(Math.min(avg / 255, 1));
        }
        setVolumeBars(bars);

        animationRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (error) {
      console.error("Error setting up audio analyser:", error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isActive]);

  if (!isActive) return null;

  if (variant === "bars") {
    return (
      <div className={cn("flex items-end justify-center gap-1 h-16", className)}>
        {volumeBars.map((level, i) => (
          <div
            key={i}
            className="w-2 bg-gradient-to-t from-primary to-primary/60 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(8, level * 100)}%`,
              opacity: 0.5 + level * 0.5,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div className={cn("flex items-center justify-center gap-0.5 h-12", className)}>
        {volumeBars.map((level, i) => (
          <div
            key={i}
            className="w-1 bg-red-500 rounded-full transition-all duration-75"
            style={{
              height: `${Math.max(4, level * 48)}px`,
              transform: `scaleY(${0.3 + level * 0.7})`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        <div
          className="absolute rounded-full bg-primary/20 transition-all duration-100"
          style={{
            width: `${80 + volumeLevel * 60}px`,
            height: `${80 + volumeLevel * 60}px`,
          }}
        />
        <div
          className="absolute rounded-full bg-primary/40 transition-all duration-75"
          style={{
            width: `${60 + volumeLevel * 40}px`,
            height: `${60 + volumeLevel * 40}px`,
          }}
        />
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {Math.round(volumeLevel * 100)}%
          </span>
        </div>
      </div>
    );
  }

  return null;
}
