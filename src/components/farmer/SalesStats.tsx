import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Eye,
  ShoppingBag,
  ArrowRight,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SalesData {
  totalListings: number;
  activeListings: number;
  totalViews: number;
  totalOffers: number;
  acceptedOffers: number;
  totalRevenue: number;
  topProducts: { title: string; views: number; offers: number }[];
}

export function SalesStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SalesData>({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalOffers: 0,
    acceptedOffers: 0,
    totalRevenue: 0,
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSalesData();
  }, [user]);

  const fetchSalesData = async () => {
    if (!user) return;

    try {
      // Fetch user's listings
      const { data: listings } = await supabase
        .from("marketplace_listings")
        .select("id, title, status, views_count, price")
        .eq("user_id", user.id);

      // Fetch offers received
      const { data: offers } = await supabase
        .from("marketplace_offers")
        .select("id, status, proposed_price, listing_id")
        .eq("seller_id", user.id);

      const totalListings = listings?.length || 0;
      const activeListings = listings?.filter((l) => l.status === "publie").length || 0;
      const totalViews = listings?.reduce((sum, l) => sum + (l.views_count || 0), 0) || 0;
      const totalOffers = offers?.length || 0;
      const acceptedOffers = offers?.filter((o) => o.status === "acceptee").length || 0;
      const totalRevenue = offers
        ?.filter((o) => o.status === "acceptee")
        .reduce((sum, o) => sum + (o.proposed_price || 0), 0) || 0;

      // Top products by views
      const topProducts = listings
        ?.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
        .slice(0, 5)
        .map((l) => ({
          title: l.title,
          views: l.views_count || 0,
          offers: offers?.filter((o) => o.listing_id === l.id).length || 0,
        })) || [];

      setData({
        totalListings,
        activeListings,
        totalViews,
        totalOffers,
        acceptedOffers,
        totalRevenue,
        topProducts,
      });
    } catch (error) {
      console.error("Error fetching sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const conversionRate = data.totalOffers > 0 
    ? ((data.acceptedOffers / data.totalOffers) * 100).toFixed(0) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Revenue Card */}
      <Card className="overflow-hidden">
        <div className="gradient-hero p-5">
          <div className="flex items-center justify-between text-primary-foreground">
            <div>
              <p className="text-sm opacity-90">Revenus totaux</p>
              <p className="text-3xl font-bold mt-1">
                {data.totalRevenue.toLocaleString()} <span className="text-lg">FCFA</span>
              </p>
              <p className="text-sm mt-2 opacity-80">
                {data.acceptedOffers} ventes réalisées
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activeListings}</p>
                <p className="text-xs text-muted-foreground">Annonces actives</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalViews}</p>
                <p className="text-xs text-muted-foreground">Vues totales</p>
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
                <p className="text-2xl font-bold">{data.totalOffers}</p>
                <p className="text-xs text-muted-foreground">Offres reçues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taux conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" />
              Produits populaires
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")}>
              Voir tout
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.topProducts.length === 0 ? (
            <div className="text-center py-4">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucun produit publié</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => navigate("/marketplace")}
              >
                Publier un produit
              </Button>
            </div>
          ) : (
            data.topProducts.map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-medium line-clamp-1">
                    {product.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {product.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    {product.offers}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" onClick={() => navigate("/marketplace")}>
        <Package className="w-4 h-4 mr-2" />
        Gérer mes annonces
      </Button>
    </div>
  );
}
