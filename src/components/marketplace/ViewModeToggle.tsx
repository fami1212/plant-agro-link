import { Button } from "@/components/ui/button";
import { Sparkles, LayoutGrid } from "lucide-react";
import { useViewMode } from "@/hooks/useViewMode";
import { cn } from "@/lib/utils";

export function ViewModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useViewMode();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted/60 p-1",
        className
      )}
    >
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setMode("simple")}
        className={cn(
          "h-7 rounded-full px-3 text-xs gap-1",
          mode === "simple" && "bg-background shadow-sm text-foreground"
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        Simple
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setMode("advanced")}
        className={cn(
          "h-7 rounded-full px-3 text-xs gap-1",
          mode === "advanced" && "bg-background shadow-sm text-foreground"
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Avancé
      </Button>
    </div>
  );
}