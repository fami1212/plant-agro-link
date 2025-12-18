import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    positive: boolean;
  };
  iconBg?: "primary" | "accent" | "secondary" | "success" | "warning";
  className?: string;
  compact?: boolean;
}

const iconBgColors = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  iconBg = "primary",
  className,
  compact = false,
}: StatCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center p-4 rounded-2xl bg-card border border-border/30 shadow-xs",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl mb-2",
            iconBgColors[iconBg]
          )}
        >
          {icon}
        </div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground text-center">{label}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/30 shadow-xs transition-all duration-200 hover:shadow-soft hover:-translate-y-0.5",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl shrink-0",
          iconBgColors[iconBg]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-xl font-bold text-foreground">{value}</p>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
