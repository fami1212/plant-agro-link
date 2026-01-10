import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isOwn?: boolean;
}

export function VoiceMessagePlayer({ audioUrl, duration = 0, isOwn = false }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setTotalDuration(Math.floor(audio.duration) || duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl, duration]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * (audioRef.current.duration || totalDuration);
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [totalDuration]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={cn(
      "flex items-center gap-2 min-w-[180px] p-1",
      isOwn ? "flex-row-reverse" : "flex-row"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full shrink-0",
          isOwn 
            ? "bg-white/20 hover:bg-white/30 text-foreground" 
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        )}
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>
      
      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform visualization (simplified) */}
        <div 
          ref={progressRef}
          className="relative h-6 flex items-center cursor-pointer"
          onClick={handleProgressClick}
        >
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {Array.from({ length: 25 }).map((_, i) => {
              const height = Math.random() * 100;
              const isPast = (i / 25) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-full transition-colors",
                    isPast 
                      ? isOwn ? "bg-foreground/80" : "bg-primary" 
                      : isOwn ? "bg-foreground/30" : "bg-primary/30"
                  )}
                  style={{ height: `${Math.max(15, height)}%` }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Duration */}
        <span className={cn(
          "text-[10px]",
          isOwn ? "text-foreground/60" : "text-muted-foreground"
        )}>
          {formatTime(isPlaying ? currentTime : totalDuration)}
        </span>
      </div>
    </div>
  );
}
