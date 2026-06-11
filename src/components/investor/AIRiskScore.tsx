import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIRiskScoreProps {
  opportunityId?: string;
  sellerId?: string;
  compact?: boolean;
}

interface RiskResult {
  score: number;
  band: "faible" | "moyen" | "eleve";
  factors: string[];
  recommendations: string[];
  summary: string;
}

const bandStyles: Record<string, string> = {
  faible: "bg-success/10 text-success border-success/30",
  moyen: "bg-warning/10 text-warning border-warning/30",
  eleve: "bg-destructive/10 text-destructive border-destructive/30",
};

export function AIRiskScore({ opportunityId, sellerId, compact }: AIRiskScoreProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-risk-score", {
        body: { opportunity_id: opportunityId, seller_id: sellerId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as RiskResult);
    } catch (e: any) {
      toast.error("Analyse impossible", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={analyze}
        disabled={loading}
        className="gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Score de risque IA
      </Button>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span className="font-semibold">Score de risque IA</span>
          </div>
          <Badge variant="outline" className={cn(bandStyles[result.band] ?? bandStyles.moyen)}>
            {result.band}
          </Badge>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Score</span>
            <span className="font-semibold">{result.score}/100</span>
          </div>
          <Progress value={result.score} className="h-2" />
        </div>
        {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}
        {!!result.factors?.length && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Facteurs</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {result.factors.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {!!result.recommendations?.length && (
          <div>
            <p className="text-xs font-semibold text-foreground mb-1">Recommandations</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {result.recommendations.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}