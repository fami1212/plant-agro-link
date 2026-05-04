import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HubAction {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string | number;
  color?: "primary" | "accent" | "success" | "warning";
  onClick: () => void;
}

interface SimpleHubProps {
  actions: HubAction[];
  greeting?: string;
  helperText?: string;
}

const colorMap = {
  primary: "bg-primary/10 text-primary border-primary/20",
  accent: "bg-accent/30 text-accent-foreground border-accent/40",
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  warning: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
};

export function SimpleHub({ actions, greeting, helperText }: SimpleHubProps) {
  return (
    <div className="space-y-3">
      {(greeting || helperText) && (
        <div className="px-1 py-2">
          {greeting && <h2 className="text-base font-semibold text-foreground">{greeting}</h2>}
          {helperText && (
            <p className="text-sm text-muted-foreground mt-0.5">{helperText}</p>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          const colorClass = colorMap[action.color || "primary"];
          return (
            <Card
              key={action.id}
              role="button"
              tabIndex={0}
              onClick={action.onClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") action.onClick();
              }}
              className="p-4 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                    colorClass
                  )}
                >
                  <Icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {action.title}
                    </h3>
                    {action.badge !== undefined && action.badge !== 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground font-bold min-w-[18px] text-center">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {action.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}