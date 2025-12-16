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
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
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
          "flex flex-col items-center p-3 rounded-2xl bg-card border border-border/40 shadow-soft",
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
        "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 shadow-soft transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-2xl",
          iconBgColors[iconBg]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground font-medium truncate">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-semibold",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}