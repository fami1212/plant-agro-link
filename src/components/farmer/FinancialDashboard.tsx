import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Receipt,
  Calendar,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  investmentsReceived: number;
  pendingPayments: number;
  monthlyData: { month: string; revenue: number; expenses: number }[];
  revenueByCategory: { name: string; value: number; color: string }[];
  expensesByCategory: { name: string; value: number; color: string }[];
  recentTransactions: {
    id: string;
    type: "revenue" | "expense";
    description: string;
    amount: number;
    date: string;
    category: string;
  }[];
}

const chartConfig = {
  revenue: { label: "Revenus", color: "hsl(var(--success))" },
  expenses: { label: "Dépenses", color: "hsl(var(--destructive))" },
};

export function FinancialDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    investmentsReceived: 0,
    pendingPayments: 0,
    monthlyData: [],
    revenueByCategory: [],
    expensesByCategory: [],
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"6m" | "12m">("6m");

  useEffect(() => {
    if (user) fetchFinancialData();
  }, [user, period]);

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const months = period === "6m" ? 6 : 12;
      const startDate = subMonths(new Date(), months);

      // Fetch accepted offers (revenue)
      const { data: offers } = await supabase
        .from("marketplace_offers")
        .select("id, proposed_price, status, created_at, listing_id")
        .eq("seller_id", user.id)
        .eq("status", "acceptee")
        .gte("created_at", startDate.toISOString());

      // Fetch investments received
      const { data: investments } = await supabase
        .from("investments")
        .select("id, amount_invested, status, created_at, title")
        .eq("farmer_id", user.id)
        .gte("created_at", startDate.toISOString());

      // Fetch pending offers
      const { data: pendingOffers } = await supabase
        .from("marketplace_offers")
        .select("proposed_price")
        .eq("seller_id", user.id)
        .eq("status", "en_attente");

      // Fetch service bookings (expenses for the farmer)
      const { data: bookings } = await supabase
        .from("service_bookings")
        .select("id, price, status, created_at, service_type")
        .eq("client_id", user.id)
        .in("status", ["terminee", "payee"])
        .gte("created_at", startDate.toISOString());

      // Calculate totals
      const totalRevenue = (offers || []).reduce((sum, o) => sum + (o.proposed_price || 0), 0);
      const investmentsReceived = (investments || []).reduce((sum, i) => sum + (i.amount_invested || 0), 0);
      const totalExpenses = (bookings || []).reduce((sum, b) => sum + (b.price || 0), 0);
      const pendingPayments = (pendingOffers || []).reduce((sum, o) => sum + (o.proposed_price || 0), 0);
      const netProfit = totalRevenue + investmentsReceived - totalExpenses;

      // Generate monthly data
      const monthlyData: { month: string; revenue: number; expenses: number }[] = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(monthStart);
        
        const monthRevenue = (offers || [])
          .filter(o => {
            const date = new Date(o.created_at);
            return date >= monthStart && date <= monthEnd;
          })
          .reduce((sum, o) => sum + (o.proposed_price || 0), 0);

        const monthExpenses = (bookings || [])
          .filter(b => {
            const date = new Date(b.created_at);
            return date >= monthStart && date <= monthEnd;
          })
          .reduce((sum, b) => sum + (b.price || 0), 0);

        monthlyData.push({
          month: format(monthStart, "MMM", { locale: fr }),
          revenue: monthRevenue,
          expenses: monthExpenses,
        });
      }

      // Revenue by category
      const revenueByCategory = [
        { name: "Ventes produits", value: totalRevenue, color: "hsl(var(--success))" },
        { name: "Investissements", value: investmentsReceived, color: "hsl(var(--primary))" },
      ].filter(c => c.value > 0);

      // Expenses by category
      const serviceTypes = [...new Set((bookings || []).map(b => b.service_type))];
      const expensesByCategory = serviceTypes.map((type, i) => ({
        name: type || "Autres",
        value: (bookings || [])
          .filter(b => b.service_type === type)
          .reduce((sum, b) => sum + (b.price || 0), 0),
        color: `hsl(${i * 60}, 70%, 50%)`,
      }));

      // Recent transactions
      const recentTransactions: FinancialData["recentTransactions"] = [
        ...(offers || []).map(o => ({
          id: o.id,
          type: "revenue" as const,
          description: "Vente produit",
          amount: o.proposed_price || 0,
          date: o.created_at,
          category: "Marketplace",
        })),
        ...(investments || []).map(i => ({
          id: i.id,
          type: "revenue" as const,
          description: i.title || "Investissement reçu",
          amount: i.amount_invested || 0,
          date: i.created_at,
          category: "Investissement",
        })),
        ...(bookings || []).map(b => ({
          id: b.id,
          type: "expense" as const,
          description: b.service_type || "Service",
          amount: b.price || 0,
          date: b.created_at,
          category: "Services",
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        investmentsReceived,
        pendingPayments,
        monthlyData,
        revenueByCategory,
        expensesByCategory,
        recentTransactions,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const profitMargin = data.totalRevenue > 0 
    ? ((data.netProfit / (data.totalRevenue + data.investmentsReceived)) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "6m" | "12m")}>
          <TabsList className="h-8">
            <TabsTrigger value="6m" className="text-xs px-3">6 mois</TabsTrigger>
            <TabsTrigger value="12m" className="text-xs px-3">12 mois</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Financial Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2 overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Bénéfice net</p>
                <p className="text-3xl font-bold mt-1">
                  {data.netProfit.toLocaleString()} <span className="text-lg">FCFA</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {Number(profitMargin) >= 0 ? (
                    <Badge className="bg-white/20 text-white">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      {profitMargin}% marge
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/50 text-white">
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                      {profitMargin}% marge
                    </Badge>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-7 h-7" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Revenus</p>
                <p className="text-xl font-bold text-success mt-1">
                  {(data.totalRevenue / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dépenses</p>
                <p className="text-xl font-bold text-destructive mt-1">
                  {(data.totalExpenses / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Investissements</p>
                <p className="text-xl font-bold text-primary mt-1">
                  {(data.investmentsReceived / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-xl font-bold text-warning mt-1">
                  {(data.pendingPayments / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue/Expenses Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Évolution financière
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="revenue" 
                    fill="hsl(var(--success))" 
                    radius={[4, 4, 0, 0]}
                    name="Revenus"
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                    name="Dépenses"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Distribution */}
      {data.revenueByCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.revenueByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                    >
                      {data.revenueByCategory.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {data.revenueByCategory.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {cat.value.toLocaleString()} F
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Transactions récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              Aucune transaction récente
            </div>
          ) : (
            data.recentTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    txn.type === "revenue" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    {txn.type === "revenue" ? (
                      <ArrowUpRight className="w-4 h-4 text-success" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{txn.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(txn.date), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <span className={`font-semibold ${
                  txn.type === "revenue" ? "text-success" : "text-destructive"
                }`}>
                  {txn.type === "revenue" ? "+" : "-"}
                  {txn.amount.toLocaleString()} F
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}