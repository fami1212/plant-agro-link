import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  title: string;
  message: string;
  type?: "warning" | "error" | "info" | "success";
  dismissible?: boolean;
  className?: string;
}

const typeStyles = {
  warning: "bg-warning/15 border-warning/30 text-warning",
  error: "bg-destructive/15 border-destructive/30 text-destructive",
  info: "bg-primary/15 border-primary/30 text-primary",
  success: "bg-success/15 border-success/30 text-success",
};

export function AlertBanner({
  title,
  message,
  type = "warning",
  dismissible = true,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border",
        typeStyles[type],
        className
      )}
    >
      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-background/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
