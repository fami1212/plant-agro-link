import { cn } from "@/lib/utils";

interface AudioWaveAnimationProps {
  isActive: boolean;
  variant?: "listening" | "speaking";
  className?: string;
}

export function AudioWaveAnimation({ 
  isActive, 
  variant = "listening",
  className 
}: AudioWaveAnimationProps) {
  if (!isActive) return null;

  const bars = variant === "listening" ? 5 : 7;
  const baseColor = variant === "listening" ? "bg-red-500" : "bg-primary";

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full transition-all",
            baseColor,
            variant === "listening" ? "w-1" : "w-1.5"
          )}
          style={{
            height: variant === "listening" ? "24px" : "32px",
            animation: `audioWave ${0.5 + Math.random() * 0.3}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes audioWave {
          0% {
            transform: scaleY(0.3);
            opacity: 0.5;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
