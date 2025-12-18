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
  default: "bg-card border-border/30 hover:border-border",
  primary: "gradient-primary text-primary-foreground border-0",
  accent: "gradient-accent text-accent-foreground border-0",
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
        "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200 shadow-xs hover:shadow-soft active:scale-[0.98] w-full",
        variants[variant],
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
          isColored ? "bg-white/20" : "bg-primary/10 text-primary"
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-sm",
            isColored ? "" : "text-foreground"
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "text-xs truncate",
            isColored ? "opacity-80" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      </div>
      <ChevronRight
        className={cn("w-4 h-4 shrink-0", isColored ? "opacity-60" : "text-muted-foreground")}
      />
    </button>
  );
}
