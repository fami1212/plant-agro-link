import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Investment {
  id: string;
  title: string;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount: number | null;
  farmer_name?: string;
}

interface PortfolioCardProps {
  investment: Investment;
  index?: number;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours", color: "bg-warning/10 text-warning border-warning/30" },
  actif: { label: "Actif", color: "bg-primary/10 text-primary border-primary/30" },
  complete: { label: "Terminé", color: "bg-success/10 text-success border-success/30" },
  rembourse: { label: "Remboursé", color: "bg-success/10 text-success border-success/30" },
  annule: { label: "Annulé", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function PortfolioCard({ investment, index = 0, onClick }: PortfolioCardProps) {
  const expectedReturn = investment.amount_invested * (1 + investment.expected_return_percent / 100);
  const actualReturn = investment.actual_return_amount || expectedReturn;
  const gain = actualReturn - investment.amount_invested;
  const status = statusConfig[investment.status] || statusConfig.en_cours;
  
  // Calculate progress to harvest
  const harvestProgress = investment.expected_harvest_date 
    ? Math.min(100, Math.max(0, 
        100 - (differenceInDays(new Date(investment.expected_harvest_date), new Date()) / 
               differenceInDays(new Date(investment.expected_harvest_date), new Date(investment.investment_date))) * 100
      ))
    : 50;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 hover:shadow-soft transition-all duration-300 cursor-pointer",
        `animate-fade-in stagger-${(index % 5) + 1}`
      )}
      style={{ opacity: 0 }}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{investment.title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              <User className="w-3 h-3" />
              <span>{investment.farmer_name || "Agriculteur"}</span>
              <span>•</span>
              <span>{format(new Date(investment.investment_date), "dd MMM yy", { locale: fr })}</span>
            </div>
          </div>
          <Badge variant="outline" className={status.color}>
            {status.label}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-muted text-center">
            <p className="text-lg font-bold text-foreground">
              {(investment.amount_invested / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">Investi</p>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-center">
            <p className="text-lg font-bold text-primary">
              {(expectedReturn / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">Attendu</p>
          </div>
          <div className="p-2.5 rounded-xl bg-success/10 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              <p className="text-lg font-bold text-success">
                +{investment.expected_return_percent}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground">ROI</p>
          </div>
        </div>

        {/* Progress to harvest */}
        {investment.expected_harvest_date && investment.status !== "complete" && investment.status !== "rembourse" && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Progression vers récolte
              </span>
              <span className="font-medium">
                {format(new Date(investment.expected_harvest_date), "dd MMM yyyy", { locale: fr })}
              </span>
            </div>
            <Progress value={harvestProgress} className="h-1.5" />
          </div>
        )}

        {/* Footer with arrow */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            Gain estimé: <span className="font-semibold text-success">+{(gain / 1000).toFixed(0)}k FCFA</span>
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
