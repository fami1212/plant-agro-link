import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import logoIcon from "@/assets/plantera-icon.png";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  showLogo?: boolean;
}

export function PageHeader({ title, subtitle, action, className, showLogo = false }: PageHeaderProps) {
  return (
    <header className={cn("px-4 py-4 safe-top", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {showLogo && (
            <img
              src={logoIcon}
              alt="Plantera"
              className="w-8 h-8 rounded-xl shrink-0"
            />
          )}
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}
