import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, ShoppingBag, TrendingUp, Activity, Banknote, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlatformStats {
  totalUsers: number;
  roleBreakdown: Record<string, number>;
  totalListings: number;
  activeListings: number;
  totalInvestments: number;
  totalInvested: number;
  totalBookings: number;
  totalEscrows: number;
}

export function AdminAnalytics() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [
        { count: usersCount },
        { data: rolesData },
        { count: listingsCount },
        { count: activeListingsCount },
        { count: investmentsCount },
        { data: investmentsData },
        { count: bookingsCount },
        { count: escrowsCount },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("role"),
        supabase.from("marketplace_listings").select("*", { count: "exact", head: true }),
        supabase.from("marketplace_listings").select("*", { count: "exact", head: true }).eq("status", "publie"),
        supabase.from("investments").select("*", { count: "exact", head: true }),
        supabase.from("investments").select("amount_invested"),
        supabase.from("service_bookings").select("*", { count: "exact", head: true }),
        supabase.from("escrow_contracts").select("*", { count: "exact", head: true }),
      ]);

      const roleBreakdown: Record<string, number> = {};
      (rolesData || []).forEach(r => {
        roleBreakdown[r.role] = (roleBreakdown[r.role] || 0) + 1;
      });

      const totalInvested = (investmentsData || []).reduce((s, i) => s + (i.amount_invested || 0), 0);

      setStats({
        totalUsers: usersCount || 0,
        roleBreakdown,
        totalListings: listingsCount || 0,
        activeListings: activeListingsCount || 0,
        totalInvestments: investmentsCount || 0,
        totalInvested,
        totalBookings: bookingsCount || 0,
        totalEscrows: escrowsCount || 0,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!stats) return null;

  const roleLabels: Record<string, string> = {
    agriculteur: "Agriculteurs",
    veterinaire: "Vétérinaires",
    acheteur: "Acheteurs",
    investisseur: "Investisseurs",
    admin: "Admins",
  };

  const roleColors: Record<string, string> = {
    agriculteur: "bg-success",
    veterinaire: "bg-primary",
    acheteur: "bg-warning",
    investisseur: "bg-purple-500",
    admin: "bg-destructive",
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Users, label: "Utilisateurs", value: stats.totalUsers, color: "text-primary" },
          { icon: ShoppingBag, label: "Annonces actives", value: stats.activeListings, color: "text-success" },
          { icon: TrendingUp, label: "Investissements", value: stats.totalInvestments, color: "text-purple-600" },
          { icon: Banknote, label: "Total investi", value: `${(stats.totalInvested / 1000).toFixed(0)}k F`, color: "text-warning" },
          { icon: Activity, label: "Réservations", value: stats.totalBookings, color: "text-primary" },
          { icon: BarChart3, label: "Escrows", value: stats.totalEscrows, color: "text-muted-foreground" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Répartition des rôles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.roleBreakdown).map(([role, count]) => {
            const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0;
            return (
              <div key={role} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{roleLabels[role] || role}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${roleColors[role] || "bg-muted-foreground"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Marketplace Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Marketplace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.totalListings}</p>
              <p className="text-xs text-muted-foreground">Total annonces</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.activeListings}</p>
              <p className="text-xs text-muted-foreground">Publiées</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
