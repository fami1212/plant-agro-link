import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
}

const iconBgColors = {
  primary: "bg-primary/15 text-primary",
  accent: "bg-accent/15 text-accent",
  secondary: "bg-secondary/15 text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  iconBg = "primary",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl bg-card border border-border shadow-soft",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl",
          iconBgColors[iconBg]
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-foreground">{value}</p>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.positive ? "+" : ""}
              {trend.value}%
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
