import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Banknote,
  Calendar,
  ArrowUpRight,
  Coins,
  PiggyBank,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface Investment {
  id: string;
  title: string;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount: number | null;
  actual_return_date: string | null;
}

interface ReturnStats {
  totalInvested: number;
  totalReturns: number;
  realizedGains: number;
  unrealizedGains: number;
  avgROI: number;
  completedCount: number;
  pendingCount: number;
}

export function InvestorReturns() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState<ReturnStats>({
    totalInvested: 0,
    totalReturns: 0,
    realizedGains: 0,
    unrealizedGains: 0,
    avgROI: 0,
    completedCount: 0,
    pendingCount: 0,
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from("investments")
        .select("*")
        .eq("investor_id", user.id)
        .order("investment_date", { ascending: false });

      const invs = data || [];
      setInvestments(invs);

      // Calculate stats
      const totalInvested = invs.reduce((sum, inv) => sum + inv.amount_invested, 0);
      
      const completed = invs.filter(inv => inv.status === "complete" || inv.status === "rembourse");
      const pending = invs.filter(inv => inv.status === "en_cours" || inv.status === "actif");
      
      const realizedGains = completed.reduce((sum, inv) => {
        const actualReturn = inv.actual_return_amount || inv.amount_invested * (1 + (inv.expected_return_percent || 0) / 100);
        return sum + (actualReturn - inv.amount_invested);
      }, 0);
      
      const unrealizedGains = pending.reduce((sum, inv) => {
        return sum + (inv.amount_invested * (inv.expected_return_percent || 0) / 100);
      }, 0);
      
      const totalReturns = completed.reduce((sum, inv) => {
        return sum + (inv.actual_return_amount || inv.amount_invested * (1 + (inv.expected_return_percent || 0) / 100));
      }, 0);
      
      const avgROI = invs.length > 0 
        ? invs.reduce((sum, inv) => sum + (inv.expected_return_percent || 0), 0) / invs.length 
        : 0;

      setStats({
        totalInvested,
        totalReturns,
        realizedGains,
        unrealizedGains,
        avgROI,
        completedCount: completed.length,
        pendingCount: pending.length,
      });
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate chart data from investments
  const chartData = investments
    .slice(0, 12)
    .reverse()
    .map((inv) => ({
      date: format(new Date(inv.investment_date), "MMM", { locale: fr }),
      investi: inv.amount_invested / 1000,
      attendu: (inv.amount_invested * (1 + (inv.expected_return_percent || 0) / 100)) / 1000,
      realise: inv.actual_return_amount ? inv.actual_return_amount / 1000 : null,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="w-8 h-8" />}
        title="Aucun rendement"
        description="Investissez pour voir vos rendements ici"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Coins className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Total investi</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {(stats.totalInvested / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-success/20">
                <ArrowUpRight className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs text-muted-foreground">Gains réalisés</span>
            </div>
            <p className="text-2xl font-bold text-success">
              +{(stats.realizedGains / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-warning/20">
                <PiggyBank className="w-4 h-4 text-warning" />
              </div>
              <span className="text-xs text-muted-foreground">Gains en attente</span>
            </div>
            <p className="text-2xl font-bold text-warning">
              +{(stats.unrealizedGains / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">FCFA</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-accent/20">
                <Target className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">ROI moyen</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.avgROI.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">par projet</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance des investissements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorInvesti" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAttendu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => `${v}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(0)}k FCFA`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="investi"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorInvesti)"
                    name="Investi"
                  />
                  <Area
                    type="monotone"
                    dataKey="attendu"
                    stroke="hsl(var(--success))"
                    fillOpacity={1}
                    fill="url(#colorAttendu)"
                    name="Attendu"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            Historique des rendements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {investments.map((inv) => {
            const expectedReturn = inv.amount_invested * (1 + (inv.expected_return_percent || 0) / 100);
            const actualReturn = inv.actual_return_amount || expectedReturn;
            const gain = actualReturn - inv.amount_invested;
            const isCompleted = inv.status === "complete" || inv.status === "rembourse";
            const isPositive = gain >= 0;

            return (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{inv.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        isCompleted
                          ? "bg-success/10 text-success border-success/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      )}
                    >
                      {isCompleted ? "Terminé" : "En cours"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {(inv.amount_invested / 1000).toFixed(0)}k
                  </p>
                  <div className={cn(
                    "flex items-center justify-end gap-1 text-xs font-medium",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {isPositive ? "+" : ""}{(gain / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
