import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sprout,
  MapPin,
  Banknote,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InvestmentOpportunity {
  id: string;
  farmer_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  expected_return_percent: number;
  risk_level: string;
  status: string;
  expected_harvest_date: string | null;
  location: string | null;
  farmer_name?: string;
  investors_count?: number;
}

interface OpportunityCardProps {
  opportunity: InvestmentOpportunity;
  onInvest: (opportunity: InvestmentOpportunity) => void;
  index?: number;
}

const riskConfig: Record<string, { label: string; color: string }> = {
  faible: { label: "Risque faible", color: "bg-success/10 text-success border-success/30" },
  moyen: { label: "Risque moyen", color: "bg-warning/10 text-warning border-warning/30" },
  eleve: { label: "Risque élevé", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function OpportunityCard({ opportunity, onInvest, index = 0 }: OpportunityCardProps) {
  const progress = (opportunity.current_amount / opportunity.target_amount) * 100;
  const remaining = opportunity.target_amount - opportunity.current_amount;
  const risk = riskConfig[opportunity.risk_level] || riskConfig.moyen;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 hover:shadow-soft transition-all duration-300",
        `animate-fade-in stagger-${(index % 5) + 1}`
      )}
      style={{ opacity: 0 }}
    >
      <CardContent className="p-0">
        {/* Header with gradient */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-lg leading-tight">
                {opportunity.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Sprout className="w-3.5 h-3.5 text-primary" />
                  <span>{opportunity.farmer_name}</span>
                </div>
                {opportunity.location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[100px]">{opportunity.location}</span>
                  </div>
                )}
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0", risk.color)}>
              {risk.label}
            </Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 rounded-xl bg-primary/10">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-primary">
                {opportunity.expected_return_percent}%
              </p>
              <p className="text-xs text-muted-foreground">ROI attendu</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Banknote className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {(opportunity.target_amount / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-muted-foreground">Objectif</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {opportunity.expected_harvest_date
                  ? format(new Date(opportunity.expected_harvest_date), "MMM yy", { locale: fr })
                  : "-"}
              </p>
              <p className="text-xs text-muted-foreground">Récolte</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Financement</span>
              <span className="font-semibold text-foreground">
                {(opportunity.current_amount / 1000).toFixed(0)}k / {(opportunity.target_amount / 1000).toFixed(0)}k
              </span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1.5 text-right">
              {Math.round(progress)}% financé
            </p>
          </div>

          {/* Description if exists */}
          {opportunity.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {opportunity.description}
            </p>
          )}

          {/* CTA */}
          <Button 
            className="w-full h-12"
            onClick={() => onInvest(opportunity)}
            disabled={remaining <= 0}
          >
            <Banknote className="w-4 h-4 mr-2" />
            {remaining > 0 
              ? `Investir • ${(remaining / 1000).toFixed(0)}k restants`
              : "Financement complet"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
