import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AIContextualTipProps {
  context: string;
  data?: Record<string, any>;
  className?: string;
}

export function AIContextualTip({ context, data, className }: AIContextualTipProps) {
  const { user } = useAuth();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded && user) {
      loadTip();
      setHasLoaded(true);
    }
  }, [user, hasLoaded]);

  const loadTip = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-contextual-tip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ context, data }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setTip(result.tip);
      }
    } catch (error) {
      console.error("Error loading tip:", error);
    } finally {
      setLoading(false);
    }
  };

  if (dismissed || (!loading && !tip)) return null;

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {loading ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Conseil IA
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Analyse en cours...</p>
            ) : (
              <p className="text-sm">{tip}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setHasLoaded(false);
                loadTip();
              }}
              disabled={loading}
            >
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setDismissed(true)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}