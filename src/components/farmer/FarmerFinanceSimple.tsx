import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Eye,
  ShoppingBag,
  ArrowRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { fr } from "date-fns/locale";

interface FinanceData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeListings: number;
  totalOffers: number;
  acceptedOffers: number;
  recentTransactions: {
    id: string;
    type: "revenue" | "expense";
    description: string;
    amount: number;
    date: string;
  }[];
}

export function FarmerFinanceSimple() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FinanceData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeListings: 0,
    totalOffers: 0,
    acceptedOffers: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const sixMonthsAgo = subMonths(new Date(), 6);

      // Fetch listings
      const { data: listings } = await supabase
        .from("marketplace_listings")
        .select("id, status")
        .eq("user_id", user.id);

      // Fetch offers received
      const { data: offers } = await supabase
        .from("marketplace_offers")
        .select("id, status, proposed_price, created_at")
        .eq("seller_id", user.id)
        .gte("created_at", sixMonthsAgo.toISOString());

      // Fetch service bookings (expenses)
      const { data: bookings } = await supabase
        .from("service_bookings")
        .select("id, price, created_at, service_type")
        .eq("client_id", user.id)
        .in("status", ["terminee", "payee"])
        .gte("created_at", sixMonthsAgo.toISOString());

      const activeListings = listings?.filter((l) => l.status === "publie").length || 0;
      const totalOffers = offers?.length || 0;
      const acceptedOffers = offers?.filter((o) => o.status === "acceptee").length || 0;
      const totalRevenue = offers
        ?.filter((o) => o.status === "acceptee")
        .reduce((sum, o) => sum + (o.proposed_price || 0), 0) || 0;
      const totalExpenses = bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;

      // Recent transactions
      const recentTransactions: FinanceData["recentTransactions"] = [
        ...(offers?.filter(o => o.status === "acceptee") || []).map(o => ({
          id: o.id,
          type: "revenue" as const,
          description: "Vente produit",
          amount: o.proposed_price || 0,
          date: o.created_at,
        })),
        ...(bookings || []).map(b => ({
          id: b.id,
          type: "expense" as const,
          description: b.service_type || "Service",
          amount: b.price || 0,
          date: b.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        activeListings,
        totalOffers,
        acceptedOffers,
        recentTransactions,
      });
    } catch (error) {
      console.error("Error fetching finance data:", error);
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

  return (
    <div className="space-y-4">
      {/* Net Profit Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Bénéfice net (6 mois)</p>
              <p className="text-3xl font-bold mt-1">
                {data.netProfit.toLocaleString()} <span className="text-lg">FCFA</span>
              </p>
              <p className="text-sm mt-2 opacity-80">
                {data.acceptedOffers} ventes réalisées
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-success">
                  {(data.totalRevenue / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-muted-foreground">Revenus</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold text-destructive">
                  {(data.totalExpenses / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-muted-foreground">Dépenses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.activeListings}</p>
                <p className="text-xs text-muted-foreground">Annonces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold">{data.totalOffers}</p>
                <p className="text-xs text-muted-foreground">Offres</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      {data.recentTransactions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-sm mb-3">Dernières transactions</h3>
            <div className="space-y-2">
              {data.recentTransactions.map((txn) => (
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
                        {format(new Date(txn.date), "dd MMM", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    txn.type === "revenue" ? "text-success" : "text-destructive"
                  }`}>
                    {txn.type === "revenue" ? "+" : "-"}
                    {(txn.amount / 1000).toFixed(0)}k
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-3"
          onClick={() => navigate("/marketplace/farmer")}
        >
          <Package className="w-4 h-4 mr-2" />
          Mes annonces
        </Button>
        <Button 
          variant="outline"
          className="h-auto py-3"
          onClick={() => navigate("/farmer-investments")}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Financements
        </Button>
      </div>
    </div>
  );
}
