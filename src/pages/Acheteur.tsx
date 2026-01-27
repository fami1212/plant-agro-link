import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Search,
  Heart,
  Package,
  RefreshCw,
  Loader2,
  MapPin,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { BuyerCart } from "@/components/buyer/BuyerCart";
import { BuyerOrderTracking } from "@/components/buyer/BuyerOrderTracking";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  quantity_kg: number | null;
  location: string | null;
  images: string[] | null;
  category: string | null;
  is_verified: boolean | null;
  seller_name?: string;
  seller_phone?: string;
}

interface Favorite {
  id: string;
  listing_id: string;
  product?: Product;
}

interface Order {
  id: string;
  listing_id: string;
  proposed_price: number;
  proposed_quantity: string | null;
  status: string;
  created_at: string;
  product_title?: string;
  seller_name?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-warning/10 text-warning", icon: Clock },
  acceptee: { label: "Acceptée", color: "bg-success/10 text-success", icon: CheckCircle2 },
  refusee: { label: "Refusée", color: "bg-destructive/10 text-destructive", icon: Package },
  en_cours: { label: "En livraison", color: "bg-primary/10 text-primary", icon: Truck },
};

export default function Acheteur() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("produits");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProducts(), fetchFavorites(), fetchOrders()]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("listing_type", "produit")
      .eq("status", "publie")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const sellerIds = [...new Set((data || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", sellerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setProducts((data || []).map(p => ({
      ...p,
      seller_name: profileMap.get(p.user_id)?.full_name || "Vendeur",
      seller_phone: profileMap.get(p.user_id)?.phone,
    })));
  };

  const fetchFavorites = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("marketplace_favorites")
      .select("*, marketplace_listings(*)")
      .eq("user_id", user.id);

    if (error) throw error;

    setFavorites((data || []).map(f => ({
      id: f.id,
      listing_id: f.listing_id,
      product: f.marketplace_listings as any,
    })));
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("marketplace_offers")
      .select("*, marketplace_listings(title, user_id)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const sellerIds = [...new Set((data || []).map(o => o.marketplace_listings?.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", sellerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    setOrders((data || []).map(o => ({
      id: o.id,
      listing_id: o.listing_id,
      proposed_price: o.proposed_price,
      proposed_quantity: o.proposed_quantity,
      status: o.status,
      created_at: o.created_at,
      product_title: o.marketplace_listings?.title,
      seller_name: profileMap.get(o.marketplace_listings?.user_id) || "Vendeur",
    })));
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;

    const existing = favorites.find(f => f.listing_id === productId);
    
    if (existing) {
      await supabase.from("marketplace_favorites").delete().eq("id", existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      toast.success("Retiré des favoris");
    } else {
      const { data, error } = await supabase
        .from("marketplace_favorites")
        .insert({ user_id: user.id, listing_id: productId })
        .select()
        .single();
      
      if (!error && data) {
        const product = products.find(p => p.id === productId);
        setFavorites(prev => [...prev, { id: data.id, listing_id: productId, product }]);
        toast.success("Ajouté aux favoris");
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "en_attente").length;
  const acceptedOrders = orders.filter(o => o.status === "acceptee").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Mes achats"
        subtitle="Trouvez les meilleurs produits locaux"
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      {/* AI Contextual Tip */}
      <div className="px-4 mb-4">
        <AIContextualTip 
          context="marketplace" 
          data={{ productsCount: products.length, favoritesCount: favorites.length }} 
        />
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Package, value: totalOrders, label: "Commandes", color: "primary" },
            { icon: Clock, value: pendingOrders, label: "En attente", color: "warning" },
            { icon: CheckCircle2, value: acceptedOrders, label: "Acceptées", color: "success" },
            { icon: Heart, value: favorites.length, label: "Favoris", color: "destructive" },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className={cn(`bg-${color}/5 border-${color}/20`)}>
              <CardContent className="p-3 text-center">
                <Icon className={cn("w-4 h-4 mx-auto mb-1", `text-${color}`)} />
                <p className={cn("text-lg font-bold", `text-${color}`)}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4 h-12">
            <TabsTrigger value="produits" className="gap-1 text-xs">
              <ShoppingBag className="w-4 h-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="panier" className="gap-1 text-xs">
              <ShoppingCart className="w-4 h-4" />
              Panier
            </TabsTrigger>
            <TabsTrigger value="commandes" className="gap-1 text-xs">
              <Package className="w-4 h-4" />
              Suivi
            </TabsTrigger>
            <TabsTrigger value="favoris" className="gap-1 text-xs">
              <Heart className="w-4 h-4" />
              Favoris
            </TabsTrigger>
          </TabsList>

          {/* Cart Tab */}
          <TabsContent value="panier">
            <BuyerCart onCheckout={() => {
              fetchData();
              setActiveTab("commandes");
            }} />
          </TabsContent>

          {/* Order Tracking Tab */}
          <TabsContent value="commandes">
            <BuyerOrderTracking />
          </TabsContent>

          {/* Products */}
          <TabsContent value="produits" className="space-y-3">
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="w-8 h-8" />}
                title="Aucun produit"
                description="Revenez bientôt pour découvrir des produits"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product, index) => {
                  const isFavorite = favorites.some(f => f.listing_id === product.id);
                  return (
                    <Card
                      key={product.id}
                      className={cn("overflow-hidden animate-fade-in", `stagger-${(index % 5) + 1}`)}
                      style={{ opacity: 0 }}
                    >
                      <div className="aspect-square bg-muted relative">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                          onClick={() => toggleFavorite(product.id)}
                        >
                          <Heart className={cn("w-4 h-4", isFavorite && "fill-destructive text-destructive")} />
                        </Button>
                        {product.is_verified && (
                          <Badge className="absolute top-2 left-2 bg-success text-success-foreground">
                            Vérifié
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {product.seller_name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-primary">
                            {product.price?.toLocaleString()} F
                          </p>
                          {product.quantity_kg && (
                            <span className="text-xs text-muted-foreground">
                              {product.quantity_kg} kg
                            </span>
                          )}
                        </div>
                        {product.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{product.location}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Favorites */}
          <TabsContent value="favoris" className="space-y-3">
            {favorites.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-8 h-8" />}
                title="Aucun favori"
                description="Ajoutez des produits à vos favoris"
                action={{
                  label: "Voir produits",
                  onClick: () => setActiveTab("produits"),
                }}
              />
            ) : (
              favorites.map((fav, index) => (
                <Card
                  key={fav.id}
                  className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
                  style={{ opacity: 0 }}
                >
                  <CardContent className="p-4 flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                      {fav.product?.images?.[0] ? (
                        <img
                          src={fav.product.images[0]}
                          alt={fav.product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{fav.product?.title || "Produit"}</h3>
                      <p className="text-lg font-bold text-primary">
                        {fav.product?.price?.toLocaleString()} FCFA
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive mt-1 p-0 h-auto"
                        onClick={() => toggleFavorite(fav.listing_id)}
                      >
                        <Heart className="w-4 h-4 fill-current mr-1" />
                        Retirer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
