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
  Plus, Search, ShoppingBag, Store, HandCoins, Package, Sprout, 
  Briefcase, Eye, Loader2, Check, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { InputsGrid } from "@/components/marketplace/InputsGrid";
import { ServicesGrid } from "@/components/marketplace/ServicesGrid";
import { ListingForm } from "@/components/marketplace/ListingForm";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type MarketplaceInput = Database["public"]["Tables"]["marketplace_inputs"]["Row"];
type Offer = Database["public"]["Tables"]["marketplace_offers"]["Row"] & {
  listing?: { title: string; category: string | null };
  other_party_name?: string;
};

export default function MarketplaceFarmer() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("acheter");
  const [buySubTab, setBuySubTab] = useState<"produits" | "intrants" | "services">("produits");
  const [searchQuery, setSearchQuery] = useState("");
  const [showListingForm, setShowListingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [marketplaceInputs, setMarketplaceInputs] = useState<MarketplaceInput[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchListings(),
      fetchMyListings(),
      fetchOffers(),
      fetchMarketplaceInputs(),
    ]);
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

  const fetchMyListings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setMyListings(data || []);
  };

  const fetchMarketplaceInputs = async () => {
    const { data, error } = await supabase
      .from("marketplace_inputs")
      .select("*")
      .eq("available", true)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching inputs:", error);
    }
    setMarketplaceInputs(data || []);
  };

  const fetchOffers = async () => {
    if (!user) return;
    
    const { data: incoming } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, category)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    
    const { data: sent } = await supabase
      .from("marketplace_offers")
      .select("*, listing:marketplace_listings(title, category)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    const allIds = [
      ...new Set([
        ...(incoming || []).map(o => o.buyer_id),
        ...(sent || []).map(o => o.seller_id),
      ])
    ];
    
    let profileMap = new Map<string, string>();
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", allIds);
      profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    }

    setIncomingOffers((incoming || []).map(o => ({
      ...o,
      other_party_name: profileMap.get(o.buyer_id) || "Acheteur"
    })));
    setMyOffers((sent || []).map(o => ({
      ...o,
      other_party_name: profileMap.get(o.seller_id) || "Vendeur"
    })));
  };

  const handleOfferAction = async (offerId: string, action: "acceptee" | "refusee") => {
    const { error } = await supabase
      .from("marketplace_offers")
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq("id", offerId);
    
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success(action === "acceptee" ? "Offre acceptée !" : "Offre refusée");
      fetchOffers();
    }
  };

  const handleInputContact = (input: MarketplaceInput) => {
    if (input.contact_phone) {
      window.open(`tel:${input.contact_phone}`, "_self");
    } else if (input.contact_whatsapp) {
      window.open(`https://wa.me/${input.contact_whatsapp.replace(/\s/g, "")}`, "_blank");
    } else {
      toast.info("Contact non disponible");
    }
  };

  const handleInputOrder = (input: MarketplaceInput) => {
    if (input.contact_whatsapp) {
      const message = encodeURIComponent(`Bonjour, je souhaite commander: ${input.name} (${input.price} FCFA)`);
      window.open(`https://wa.me/${input.contact_whatsapp.replace(/\s/g, "")}?text=${message}`, "_blank");
    } else {
      toast.info("Commande via WhatsApp non disponible");
    }
  };

  const filteredListings = listings.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    l.user_id !== user?.id
  );

  const filteredInputs = marketplaceInputs.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingIncoming = incomingOffers.filter(o => o.status === "en_attente");

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      en_attente: "bg-yellow-100 text-yellow-800",
      acceptee: "bg-green-100 text-green-800",
      refusee: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      en_attente: "En attente",
      acceptee: "Acceptée",
      refusee: "Refusée",
    };
    return <Badge className={styles[status]}>{labels[status] || status}</Badge>;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Marketplace"
        subtitle="Achetez et vendez vos produits"
        action={
          <Button variant="accent" size="icon" onClick={() => setShowListingForm(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 mb-4">
        <AIContextualTip context="marketplace" data={{ role: "agriculteur" }} />
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{myListings.length}</p>
          <p className="text-xs text-muted-foreground">Mes annonces</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{pendingIncoming.length}</p>
          <p className="text-xs text-muted-foreground">Offres reçues</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-500">
            {myListings.filter(l => l.status === "vendu").length}
          </p>
          <p className="text-xs text-muted-foreground">Vendus</p>
        </Card>
      </div>

      <div className="px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="acheter" className="gap-1 text-xs">
              <ShoppingBag className="w-4 h-4" />
              Acheter
            </TabsTrigger>
            <TabsTrigger value="vendre" className="gap-1 text-xs">
              <Store className="w-4 h-4" />
              Vendre
            </TabsTrigger>
            <TabsTrigger value="offres" className="gap-1 text-xs relative">
              <HandCoins className="w-4 h-4" />
              Offres
              {pendingIncoming.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {pendingIncoming.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ACHETER */}
          <TabsContent value="acheter" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button 
                size="sm" 
                variant={buySubTab === "produits" ? "secondary" : "outline"} 
                className="shrink-0"
                onClick={() => setBuySubTab("produits")}
              >
                <Package className="w-4 h-4 mr-1" /> Produits
              </Button>
              <Button 
                size="sm" 
                variant={buySubTab === "intrants" ? "secondary" : "outline"} 
                className="shrink-0"
                onClick={() => setBuySubTab("intrants")}
              >
                <Sprout className="w-4 h-4 mr-1" /> Intrants
              </Button>
              <Button 
                size="sm" 
                variant={buySubTab === "services" ? "secondary" : "outline"} 
                className="shrink-0"
                onClick={() => setBuySubTab("services")}
              >
                <Briefcase className="w-4 h-4 mr-1" /> Services
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {buySubTab === "produits" && (
                  <div className="grid gap-3">
                    {filteredListings.map((listing) => (
                      <ProductCard key={listing.id} listing={listing} onClick={() => {}} />
                    ))}
                    {filteredListings.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun produit trouvé
                      </p>
                    )}
                  </div>
                )}

                {buySubTab === "intrants" && (
                  <InputsGrid 
                    inputs={filteredInputs}
                    onContact={handleInputContact}
                    onOrder={handleInputOrder}
                  />
                )}

                {buySubTab === "services" && (
                  <ServicesGrid />
                )}
              </>
            )}
          </TabsContent>

          {/* VENDRE */}
          <TabsContent value="vendre" className="mt-4 space-y-4">
            <Button 
              variant="outline" 
              className="w-full border-dashed h-16"
              onClick={() => setShowListingForm(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une annonce
            </Button>

            <div className="space-y-3">
              {myListings.map((listing) => (
                <Card key={listing.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{listing.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {listing.price?.toLocaleString()} FCFA
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {listing.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {listing.views_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {myListings.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Aucune annonce créée
                </p>
              )}
            </div>
          </TabsContent>

          {/* OFFRES */}
          <TabsContent value="offres" className="mt-4 space-y-4">
            {pendingIncoming.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-orange-500" />
                    Offres reçues ({pendingIncoming.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingIncoming.map((offer) => (
                    <div key={offer.id} className="p-3 bg-background rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{offer.listing?.title}</p>
                          <p className="text-sm text-muted-foreground">
                            De: {offer.other_party_name}
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">
                            {offer.proposed_price.toLocaleString()} FCFA
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => handleOfferAction(offer.id, "refusee")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleOfferAction(offer.id, "acceptee")}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mes offres envoyées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {myOffers.map((offer) => (
                  <div key={offer.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{offer.listing?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          À: {offer.other_party_name}
                        </p>
                        <p className="font-semibold">
                          {offer.proposed_price.toLocaleString()} FCFA
                        </p>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                  </div>
                ))}
                {myOffers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune offre envoyée
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Listing Form Dialog */}
      <ListingForm 
        open={showListingForm}
        onOpenChange={setShowListingForm}
        onSuccess={() => {
          setShowListingForm(false);
          fetchMyListings();
          toast.success("Annonce créée avec succès");
        }}
      />
    </AppLayout>
  );
}
