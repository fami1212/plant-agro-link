import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface QuickActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "accent";
  className?: string;
}

const variants = {
  default: "bg-card border-border hover:border-primary/30",
  primary: "gradient-hero text-primary-foreground border-0",
  accent: "gradient-sunset text-accent-foreground border-0",
};

export function QuickActionCard({
  icon,
  title,
  description,
  onClick,
  variant = "default",
  className,
}: QuickActionCardProps) {
  const isColored = variant !== "default";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 shadow-soft hover:shadow-elevated active:scale-[0.99] w-full",
        variants[variant],
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl",
          isColored ? "bg-white/20" : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold",
            isColored ? "" : "text-foreground"
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-sm truncate",
            isColored ? "opacity-90" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={cn("w-5 h-5", isColored ? "opacity-70" : "text-muted-foreground")}
      />
    </button>
  );
}
