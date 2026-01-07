import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, ShoppingCart, Package, Heart, 
  Loader2, MapPin, Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { MessagingButton } from "@/components/marketplace/MessagingButton";
import { MessagesIndicator } from "@/components/marketplace/MessagesIndicator";
import { SellerRating } from "@/components/marketplace/SellerRating";
import { ReviewDialog } from "@/components/marketplace/ReviewDialog";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type Order = Database["public"]["Tables"]["marketplace_offers"]["Row"] & {
  listing?: { title: string; images: string[] | null; price: number | null };
};

const categories = [
  { label: "Tous", value: "all", icon: "🌍" },
  { label: "Céréales", value: "Céréales", icon: "🌾" },
  { label: "Légumes", value: "Légumes", icon: "🥬" },
  { label: "Fruits", value: "Fruits", icon: "🍎" },
];

export default function MarketplaceBuyer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("catalogue");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  
  // Review state
  const [showReview, setShowReview] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; name: string; offerId?: string } | null>(null);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetchData();
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
      .order("created_at", { ascending: false })
      .limit(30);
    setListings(data || []);
    
    // Fetch seller names
    if (data && data.length > 0) {
      const sellerIds = [...new Set(data.map(l => l.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", sellerIds);
      
      const names: Record<string, string> = {};
      profiles?.forEach(p => { names[p.user_id] = p.full_name; });
      setSellerNames(names);
    }
  };

  const fetchMyOrders = async () => {
    if (!user) return;
    // Only fetch actual orders (with payment), not messaging placeholders
    const { data } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, images, price)")
      .eq("buyer_id", user.id)
      .neq("proposed_price", 0) // Exclude messaging placeholders
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
      toast.success("Retiré des favoris");
    } else {
      await supabase
        .from("marketplace_favorites")
        .insert({ user_id: user.id, listing_id: listingId });
      setFavorites([...favorites, listingId]);
      toast.success("Ajouté aux favoris");
    }
  };

  const handleBuy = (listing: Listing) => {
    setSelectedListing(listing);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedListing || !user) return;
    
    // Create offer record
    await supabase.from("marketplace_offers").insert({
      listing_id: selectedListing.id,
      buyer_id: user.id,
      seller_id: selectedListing.user_id,
      proposed_price: selectedListing.price || 0,
      status: "acceptee",
      payment_status: "paid",
    });
    
    setShowPayment(false);
    setSelectedListing(null);
    toast.success("Achat effectué avec succès !");
    fetchData();
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteListings = listings.filter(l => favorites.includes(l.id));

  const handleReview = (order: Order) => {
    setReviewTarget({
      id: order.seller_id,
      name: "Vendeur",
      offerId: order.id,
    });
    setShowReview(true);
  };

  const getOrderStatus = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      en_attente: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "En attente" },
      acceptee: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Confirmé" },
      refusee: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Refusé" },
    };
    const c = config[status] || { color: "bg-muted", label: status };
    return <Badge className={c.color}>{c.label}</Badge>;
  };

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
        title="Marketplace"
        subtitle="Achetez les meilleurs produits agricoles"
        action={<MessagesIndicator />}
      />

      <div className="px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="catalogue" className="flex flex-col gap-0.5 text-[11px]">
              <Package className="w-4 h-4" />
              Produits
            </TabsTrigger>
            <TabsTrigger value="commandes" className="flex flex-col gap-0.5 text-[11px]">
              <ShoppingCart className="w-4 h-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="favoris" className="flex flex-col gap-0.5 text-[11px]">
              <Heart className="w-4 h-4" />
              Favoris
            </TabsTrigger>
          </TabsList>

          {/* CATALOGUE */}
          <TabsContent value="catalogue" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={selectedCategory === cat.value ? "secondary" : "ghost"}
                  className="shrink-0 h-8"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </Button>
              ))}
            </div>

            {filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun produit trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted flex items-center justify-center text-3xl relative">
                        {listing.category === "Céréales" ? "🌾" : 
                         listing.category === "Légumes" ? "🥬" :
                         listing.category === "Fruits" ? "🍎" : "📦"}
                        <button
                          onClick={() => toggleFavorite(listing.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80"
                        >
                          <Heart className={`w-4 h-4 ${favorites.includes(listing.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                      <div className="p-2">
                        <h4 className="text-sm font-medium truncate">{listing.title}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {listing.location || "Sénégal"}
                          </p>
                          <SellerRating sellerId={listing.user_id} showCount={false} />
                        </div>
                        <p className="text-sm font-bold text-primary mt-1">
                          {listing.price?.toLocaleString() || "—"} FCFA
                        </p>
                        <div className="flex gap-1 mt-2">
                          <MessagingButton
                            sellerId={listing.user_id}
                            sellerName={sellerNames[listing.user_id] || "Vendeur"}
                            listingId={listing.id}
                            listingTitle={listing.title}
                            size="sm"
                            className="flex-1 h-8"
                          />
                          <Button
                            size="sm" 
                            className="flex-1 h-8"
                            onClick={() => handleBuy(listing)}
                          >
                            Acheter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* COMMANDES */}
          <TabsContent value="commandes" className="mt-4 space-y-3">
            {myOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune commande</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("catalogue")}
                >
                  Voir les produits
                </Button>
              </div>
            ) : (
              myOrders.map((order: any) => (
                <Card key={order.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">
                      📦
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">{order.listing?.title}</h4>
                        {getOrderStatus(order.status)}
                      </div>
                      <p className="text-primary font-bold">
                        {order.proposed_price.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("fr")}
                      </p>
                      {order.status === "acceptee" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs"
                          onClick={() => handleReview(order)}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Évaluer
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* FAVORIS */}
          <TabsContent value="favoris" className="mt-4 space-y-3">
            {favoriteListings.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun favori</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("catalogue")}
                >
                  Voir les produits
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favoriteListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-muted flex items-center justify-center text-3xl relative">
                        📦
                        <button
                          onClick={() => toggleFavorite(listing.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80"
                        >
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-2">
                        <h4 className="text-sm font-medium truncate">{listing.title}</h4>
                        <p className="text-sm font-bold text-primary mt-1">
                          {listing.price?.toLocaleString() || "—"} FCFA
                        </p>
                        <Button 
                          size="sm" 
                          className="w-full mt-2 h-8"
                          onClick={() => handleBuy(listing)}
                        >
                          Acheter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Money Payment */}
      {selectedListing && (
        <MobileMoneyPayment
          open={showPayment}
          onOpenChange={setShowPayment}
          amount={selectedListing.price || 0}
          description={`Achat: ${selectedListing.title}`}
          paymentType="marketplace"
          referenceId={selectedListing.id}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Review Dialog */}
      {reviewTarget && (
        <ReviewDialog
          open={showReview}
          onOpenChange={setShowReview}
          targetId={reviewTarget.id}
          targetType="seller"
          targetName={reviewTarget.name}
          offerId={reviewTarget.offerId}
          onSuccess={() => setReviewTarget(null)}
        />
      )}
    </AppLayout>
  );
}
