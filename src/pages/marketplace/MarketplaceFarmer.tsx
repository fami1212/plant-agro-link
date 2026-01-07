import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, Search, ShoppingBag, Store, HandCoins, 
  Package, Loader2, Check, X, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ListingForm } from "@/components/marketplace/ListingForm";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { MessagingButton } from "@/components/marketplace/MessagingButton";
import { MessagesIndicator } from "@/components/marketplace/MessagesIndicator";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type Offer = Database["public"]["Tables"]["marketplace_offers"]["Row"] & {
  listing?: { title: string; price: number | null };
  buyer_name?: string;
  seller_name?: string;
};

export default function MarketplaceFarmer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("acheter");
  const [searchQuery, setSearchQuery] = useState("");
  const [showListingForm, setShowListingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Listing | null>(null);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchListings(),
      fetchMyListings(),
      fetchOffers(),
    ]);
    setLoading(false);
  };

  const fetchListings = async () => {
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .in("status", ["publie", "consulte"])
      .neq("user_id", user?.id || "")
      .order("created_at", { ascending: false })
      .limit(20);
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

  const fetchMyListings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMyListings(data || []);
  };

  const fetchOffers = async () => {
    if (!user) return;
    
    // Received offers - exclude messaging placeholders
    const { data: received } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, price)")
      .eq("seller_id", user.id)
      .neq("proposed_price", 0)
      .order("created_at", { ascending: false });
    
    // Sent offers - exclude messaging placeholders
    const { data: sent } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, price)")
      .eq("buyer_id", user.id)
      .neq("proposed_price", 0)
      .order("created_at", { ascending: false });

    // Get names
    const userIds = [...new Set([
      ...(received || []).map(o => o.buyer_id),
      ...(sent || []).map(o => o.seller_id),
    ])];
    
    let nameMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    }

    setReceivedOffers((received || []).map(o => ({
      ...o,
      buyer_name: nameMap.get(o.buyer_id) || "Acheteur"
    })));
    setSentOffers((sent || []).map(o => ({
      ...o,
      seller_name: nameMap.get(o.seller_id) || "Vendeur"
    })));
  };

  const handleOfferAction = async (offerId: string, action: "acceptee" | "refusee") => {
    const { error } = await supabase
      .from("marketplace_offers")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", offerId);
    
    if (error) {
      toast.error("Erreur");
    } else {
      toast.success(action === "acceptee" ? "Offre acceptée !" : "Offre refusée");
      fetchOffers();
    }
  };

  const handleBuy = (listing: Listing) => {
    setSelectedItem(listing);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSelectedItem(null);
    toast.success("Achat effectué avec succès !");
    fetchData();
  };

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingOffers = receivedOffers.filter(o => o.status === "en_attente");

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      en_attente: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "En attente" },
      acceptee: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Acceptée" },
      refusee: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Refusée" },
    };
    const c = config[status] || { color: "bg-muted", label: status };
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getListingStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      brouillon: { color: "bg-muted text-muted-foreground", label: "Brouillon" },
      publie: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Publié" },
      vendu: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", label: "Vendu" },
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
        subtitle="Achetez et vendez vos produits"
        action={
          <div className="flex items-center gap-2">
            <MessagesIndicator />
            <Button size="sm" onClick={() => setShowListingForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Vendre
            </Button>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{myListings.length}</p>
          <p className="text-[11px] text-muted-foreground">Annonces</p>
        </Card>
        <Card className="p-3 text-center relative">
          <p className="text-xl font-bold text-orange-500">{pendingOffers.length}</p>
          <p className="text-[11px] text-muted-foreground">Offres reçues</p>
          {pendingOffers.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-green-600">
            {myListings.filter(l => l.status === "vendu").length}
          </p>
          <p className="text-[11px] text-muted-foreground">Vendus</p>
        </Card>
      </div>

      <div className="px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="acheter" className="flex flex-col gap-0.5 text-[11px]">
              <ShoppingBag className="w-4 h-4" />
              Acheter
            </TabsTrigger>
            <TabsTrigger value="vendre" className="flex flex-col gap-0.5 text-[11px]">
              <Store className="w-4 h-4" />
              Vendre
            </TabsTrigger>
            <TabsTrigger value="offres" className="flex flex-col gap-0.5 text-[11px] relative">
              <HandCoins className="w-4 h-4" />
              Offres
              {pendingOffers.length > 0 && (
                <span className="absolute -top-0.5 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {pendingOffers.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ACHETER */}
          <TabsContent value="acheter" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredListings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun produit disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 text-2xl">
                          {listing.category === "Céréales" ? "🌾" : 
                           listing.category === "Légumes" ? "🥬" :
                           listing.category === "Fruits" ? "🍎" : "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                          <p className="text-lg font-bold text-primary">
                            {listing.price?.toLocaleString() || "—"} FCFA
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {listing.location || "Sénégal"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <MessagingButton
                          sellerId={listing.user_id}
                          sellerName={sellerNames[listing.user_id] || "Vendeur"}
                          listingId={listing.id}
                          listingTitle={listing.title}
                          size="sm"
                          className="flex-1"
                        />
                        <Button 
                          size="sm" 
                          className="flex-1"
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

          {/* VENDRE */}
          <TabsContent value="vendre" className="mt-4 space-y-3">
            <Button 
              variant="outline" 
              className="w-full border-dashed h-14"
              onClick={() => setShowListingForm(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle annonce
            </Button>

            {myListings.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune annonce</p>
                <p className="text-sm text-muted-foreground">Créez votre première annonce</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myListings.map((listing) => (
                  <Card key={listing.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xl">
                        📦
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{listing.title}</h4>
                        <p className="text-sm text-primary font-semibold">
                          {listing.price?.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getListingStatusBadge(listing.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {listing.views_count || 0}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* OFFRES */}
          <TabsContent value="offres" className="mt-4 space-y-4">
            {/* Received Offers */}
            {pendingOffers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Offres à traiter
                </h3>
                {pendingOffers.map((offer) => (
                  <Card key={offer.id} className="p-3 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{offer.listing?.title}</p>
                        <p className="text-xs text-muted-foreground">De: {offer.buyer_name}</p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {offer.proposed_price.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:bg-red-100"
                          onClick={() => handleOfferAction(offer.id, "refusee")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon"
                          className="h-8 w-8 bg-green-500 hover:bg-green-600"
                          onClick={() => handleOfferAction(offer.id, "acceptee")}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* All offers */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Historique</h3>
              {sentOffers.length === 0 && receivedOffers.filter(o => o.status !== "en_attente").length === 0 ? (
                <div className="text-center py-8">
                  <HandCoins className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune offre</p>
                </div>
              ) : (
                <>
                  {sentOffers.map((offer) => (
                    <Card key={offer.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{offer.listing?.title}</p>
                          <p className="text-xs text-muted-foreground">À: {offer.seller_name}</p>
                          <p className="font-semibold text-primary">
                            {offer.proposed_price.toLocaleString()} FCFA
                          </p>
                        </div>
                        {getStatusBadge(offer.status)}
                      </div>
                    </Card>
                  ))}
                  {receivedOffers.filter(o => o.status !== "en_attente").map((offer) => (
                    <Card key={offer.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{offer.listing?.title}</p>
                          <p className="text-xs text-muted-foreground">De: {offer.buyer_name}</p>
                          <p className="font-semibold text-primary">
                            {offer.proposed_price.toLocaleString()} FCFA
                          </p>
                        </div>
                        {getStatusBadge(offer.status)}
                      </div>
                    </Card>
                  ))}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Listing Form */}
      <ListingForm 
        open={showListingForm}
        onOpenChange={setShowListingForm}
        onSuccess={() => {
          setShowListingForm(false);
          fetchMyListings();
          toast.success("Annonce créée !");
        }}
      />

      {/* Mobile Money Payment */}
      {selectedItem && (
        <MobileMoneyPayment
          open={showPayment}
          onOpenChange={setShowPayment}
          amount={selectedItem.price || 0}
          description={`Achat: ${selectedItem.title}`}
          paymentType="marketplace"
          referenceId={selectedItem.id}
          onSuccess={handlePaymentSuccess}
        />
      )}

    </AppLayout>
  );
}
