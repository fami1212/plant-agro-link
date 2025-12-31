import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, ShoppingCart, Package, ClipboardList, Heart, 
  Filter, MapPin, Loader2, Phone, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type Offer = Database["public"]["Tables"]["marketplace_offers"]["Row"];

const categories = [
  { label: "Tous", value: "all", icon: "🌍" },
  { label: "Céréales", value: "Céréales", icon: "🌾" },
  { label: "Légumes", value: "Légumes", icon: "🥬" },
  { label: "Fruits", value: "Fruits", icon: "🍎" },
  { label: "Bétail", value: "Bétail", icon: "🐄" },
];

export default function MarketplaceBuyer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("catalogue");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Offer[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchListings(), fetchMyOrders(), fetchFavorites()]);
    setLoading(false);
  };

  const fetchListings = async () => {
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .in("status", ["publie", "consulte"])
      .order("created_at", { ascending: false });
    setListings(data || []);
  };

  const fetchMyOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, images, price)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setMyOrders(data || []);
  };

  const fetchFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_favorites")
      .select("listing_id")
      .eq("user_id", user.id);
    setFavorites(data?.map(f => f.listing_id) || []);
  };

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    
    if (favorites.includes(listingId)) {
      await supabase
        .from("marketplace_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      setFavorites(favorites.filter(id => id !== listingId));
    } else {
      await supabase
        .from("marketplace_favorites")
        .insert({ user_id: user.id, listing_id: listingId });
      setFavorites([...favorites, listingId]);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  const getOrderStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      en_attente: { color: "bg-yellow-100 text-yellow-800", label: "En attente" },
      acceptee: { color: "bg-green-100 text-green-800", label: "Acceptée" },
      refusee: { color: "bg-red-100 text-red-800", label: "Refusée" },
    };
    const c = config[status] || { color: "bg-gray-100", label: status };
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Catalogue"
        subtitle="Trouvez les meilleurs produits agricoles"
      />

      <div className="px-4 mb-4">
        <AIContextualTip context="marketplace" data={{ role: "acheteur" }} />
      </div>

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="catalogue" className="gap-1 text-xs">
              <Package className="w-4 h-4" />
              Catalogue
            </TabsTrigger>
            <TabsTrigger value="commandes" className="gap-1 text-xs">
              <ClipboardList className="w-4 h-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="favoris" className="gap-1 text-xs">
              <Heart className="w-4 h-4" />
              Favoris
            </TabsTrigger>
          </TabsList>

          {/* CATALOGUE */}
          <TabsContent value="catalogue" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={selectedCategory === cat.value ? "secondary" : "outline"}
                  className="shrink-0"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredListings.map((listing) => (
                  <ProductCard 
                    key={listing.id} 
                    listing={listing}
                    onClick={() => {}}
                    isFavorite={favorites.includes(listing.id)}
                    onFavorite={() => toggleFavorite(listing.id)}
                  />
                ))}
                {filteredListings.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucun produit trouvé</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* COMMANDES */}
          <TabsContent value="commandes" className="mt-4 space-y-4">
            {myOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune commande</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("catalogue")}
                >
                  Parcourir le catalogue
                </Button>
              </div>
            ) : (
              myOrders.map((order: any) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {order.listing?.images?.[0] ? (
                          <img 
                            src={order.listing.images[0]} 
                            className="w-full h-full object-cover rounded-lg" 
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{order.listing?.title}</h4>
                            <p className="text-lg font-bold text-primary">
                              {order.proposed_price.toLocaleString()} FCFA
                            </p>
                          </div>
                          {getOrderStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString("fr")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* FAVORIS */}
          <TabsContent value="favoris" className="mt-4 space-y-4">
            {favoriteListings.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun favori</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("catalogue")}
                >
                  Parcourir le catalogue
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {favoriteListings.map((listing) => (
                  <ProductCard 
                    key={listing.id} 
                    listing={listing}
                    onClick={() => {}}
                    isFavorite={true}
                    onFavorite={() => toggleFavorite(listing.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
