import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MapPin,
  Star,
  ShoppingBag,
  Phone,
  MessageCircle,
  X,
  Package,
  Store,
  Briefcase,
  TrendingUp,
  Eye,
  HandCoins,
  Filter,
  Loader2,
  Heart,
  Sprout,
  Truck,
  Wrench,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ListingForm } from "@/components/marketplace/ListingForm";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ServiceProviderCard } from "@/components/marketplace/ServiceProviderCard";
import { MyListings } from "@/components/marketplace/MyListings";
import { MarketplaceStats } from "@/components/marketplace/MarketplaceStats";
import { OfferCard } from "@/components/marketplace/OfferCard";
import { InputsGrid } from "@/components/marketplace/InputsGrid";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type ServiceProvider = Database["public"]["Tables"]["service_providers"]["Row"];
type Offer = Database["public"]["Tables"]["marketplace_offers"]["Row"];

const productCategories = [
  { name: "Tous", value: "all", icon: "🌍" },
  { name: "Céréales", value: "Céréales", icon: "🌾" },
  { name: "Légumes", value: "Légumes", icon: "🥬" },
  { name: "Fruits", value: "Fruits", icon: "🍎" },
  { name: "Légumineuses", value: "Légumineuses", icon: "🫘" },
  { name: "Bétail", value: "Bétail", icon: "🐄" },
];

const serviceCategories = [
  { name: "Tous", value: "all" },
  { name: "Vétérinaires", value: "veterinaire" },
  { name: "Techniciens IoT", value: "technicien_iot" },
  { name: "Transporteurs", value: "transporteur" },
  { name: "Conseillers", value: "conseiller" },
];

const inputCategories = [
  { name: "Engrais", value: "engrais", icon: "🧪" },
  { name: "Semences", value: "semences", icon: "🌱" },
  { name: "Matériel", value: "materiel", icon: "🔧" },
  { name: "Irrigation", value: "irrigation", icon: "💧" },
];

// Mock data for inputs (to be replaced with DB data later)
const mockInputs = [
  { id: "1", name: "NPK 15-15-15", category: "engrais", price: 25000, unit: "sac 50kg", supplier: "Agriplus Sénégal", location: "Dakar", available: true, image: "🧪" },
  { id: "2", name: "Semences Mil Souna 3", category: "semences", price: 15000, unit: "kg", supplier: "ISRA Seeds", location: "Thiès", available: true, image: "🌱" },
  { id: "3", name: "Pompe solaire 2HP", category: "irrigation", price: 450000, unit: "unité", supplier: "Solar Agri", location: "Saint-Louis", available: true, image: "💧" },
  { id: "4", name: "Pulvérisateur 16L", category: "materiel", price: 35000, unit: "unité", supplier: "Agri Équip", location: "Kaolack", available: false, image: "🔧" },
  { id: "5", name: "Urée 46%", category: "engrais", price: 22000, unit: "sac 50kg", supplier: "Fertil'Or", location: "Dakar", available: true, image: "🧪" },
  { id: "6", name: "Semences Arachide 55-437", category: "semences", price: 12000, unit: "kg", supplier: "UNIS Seeds", location: "Kaolack", available: true, image: "🌱" },
];

// Mock service providers
const mockProviders: Partial<ServiceProvider>[] = [
  { id: "1", business_name: "Dr. Amadou Diallo", service_category: "veterinaire", description: "Spécialiste bovins et ovins, 15 ans d'expérience", location: "Thiès", hourly_rate: 15000, rating: 4.8, reviews_count: 45, is_verified: true, phone: "+221771234567", whatsapp: "+221771234567", specializations: ["Bovins", "Ovins", "Chirurgie"] },
  { id: "2", business_name: "AgriTech Solutions", service_category: "technicien_iot", description: "Installation capteurs IoT et systèmes d'irrigation intelligente", location: "Dakar", hourly_rate: 25000, rating: 4.9, reviews_count: 32, is_verified: true, phone: "+221772345678", specializations: ["Capteurs sol", "Météo", "Irrigation auto"] },
  { id: "3", business_name: "Transport Ndiaye", service_category: "transporteur", description: "Transport agricole, camions réfrigérés disponibles", location: "Kaolack", hourly_rate: 50000, rating: 4.5, reviews_count: 28, is_verified: false, phone: "+221773456789", specializations: ["Réfrigéré", "Gros volumes", "Export"] },
  { id: "4", business_name: "Conseil Agri Pro", service_category: "conseiller", description: "Accompagnement technique et financier des exploitations", location: "Saint-Louis", hourly_rate: 20000, rating: 4.7, reviews_count: 18, is_verified: true, phone: "+221774567890", specializations: ["Business plan", "Subventions", "Formation"] },
];

export default function Marketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("acheter");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState("all");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("all");
  const [selectedInputCategory, setSelectedInputCategory] = useState("all");
  const [buySubTab, setBuySubTab] = useState<"produits" | "intrants" | "services">("produits");
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListingForm, setShowListingForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalOffers: 0,
  });

  useEffect(() => {
    fetchListings();
    if (user) {
      fetchStats();
      fetchOffers();
    }
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .in("status", ["publie", "consulte", "negociation"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    try {
      const { data: myListings } = await supabase
        .from("marketplace_listings")
        .select("id, status, views_count")
        .eq("user_id", user.id);

      const { count: offersCount } = await supabase
        .from("marketplace_offers")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (myListings) {
        setStats({
          totalListings: myListings.length,
          activeListings: myListings.filter(l => l.status === "publie").length,
          totalViews: myListings.reduce((sum, l) => sum + (l.views_count || 0), 0),
          totalOffers: offersCount || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchOffers = async () => {
    if (!user) return;
    try {
      const { data: sent } = await supabase
        .from("marketplace_offers")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      const { data: received } = await supabase
        .from("marketplace_offers")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setMyOffers(sent || []);
      setIncomingOffers(received || []);
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (listing.location?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesCategory =
      selectedProductCategory === "all" || listing.category === selectedProductCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredInputs = mockInputs.filter((input) => {
    const matchesSearch = input.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedInputCategory === "all" || input.category === selectedInputCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredProviders = mockProviders.filter((provider) => {
    const matchesSearch = 
      provider.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedServiceCategory === "all" || provider.service_category === selectedServiceCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContact = (type: "call" | "whatsapp", phone: string) => {
    if (type === "call") {
      window.open(`tel:${phone}`, "_self");
    } else {
      window.open(`https://wa.me/${phone.replace(/\s/g, "")}`, "_blank");
    }
  };

  const handleListingClick = async (listing: Listing) => {
    setSelectedListing(listing);
    // Increment view count
    if (user && listing.user_id !== user.id) {
      await supabase
        .from("marketplace_listings")
        .update({ views_count: (listing.views_count || 0) + 1 })
        .eq("id", listing.id);
    }
  };

  const handleMakeOffer = async (listing: Listing, price: number, message?: string) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    try {
      const { error } = await supabase.from("marketplace_offers").insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.user_id,
        proposed_price: price,
        message: message || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });

      if (error) throw error;
      toast.success("Offre envoyée avec succès !");
      fetchOffers();
      setSelectedListing(null);
    } catch (error) {
      console.error("Error making offer:", error);
      toast.error("Erreur lors de l'envoi de l'offre");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Marketplace"
        subtitle="Hub économique agricole"
        action={
          <Button variant="accent" size="icon" onClick={() => setShowListingForm(true)}>
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      {/* Stats for logged in users */}
      {user && (
        <div className="px-4 mb-4">
          <MarketplaceStats stats={stats} />
        </div>
      )}

      {/* Main Tabs */}
      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="acheter" className="flex flex-col gap-1 py-2 text-xs">
              <ShoppingBag className="w-4 h-4" />
              <span>Acheter</span>
            </TabsTrigger>
            <TabsTrigger value="vendre" className="flex flex-col gap-1 py-2 text-xs">
              <Store className="w-4 h-4" />
              <span>Vendre</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex flex-col gap-1 py-2 text-xs">
              <Briefcase className="w-4 h-4" />
              <span>Services</span>
            </TabsTrigger>
            <TabsTrigger value="offres" className="flex flex-col gap-1 py-2 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>Mes Offres</span>
            </TabsTrigger>
          </TabsList>

          {/* ACHETER TAB */}
          <TabsContent value="acheter" className="mt-4 space-y-4">
            {/* Sub-tabs for Buy section */}
            <div className="flex gap-2">
              <Button 
                variant={buySubTab === "produits" ? "default" : "outline"}
                size="sm"
                onClick={() => setBuySubTab("produits")}
                className="flex-1"
              >
                <Package className="w-4 h-4 mr-1" />
                Produits
              </Button>
              <Button 
                variant={buySubTab === "intrants" ? "default" : "outline"}
                size="sm"
                onClick={() => setBuySubTab("intrants")}
                className="flex-1"
              >
                <Sprout className="w-4 h-4 mr-1" />
                Intrants
              </Button>
              <Button 
                variant={buySubTab === "services" ? "default" : "outline"}
                size="sm"
                onClick={() => setBuySubTab("services")}
                className="flex-1"
              >
                <Wrench className="w-4 h-4 mr-1" />
                Services
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={
                  buySubTab === "produits" ? "Rechercher des produits..." :
                  buySubTab === "intrants" ? "Rechercher des intrants..." :
                  "Rechercher des services..."
                }
                className="pl-11 pr-12 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Products Sub-tab */}
            {buySubTab === "produits" && (
              <>
                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {productCategories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedProductCategory(cat.value)}
                      className={cn(
                        "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                        selectedProductCategory === cat.value
                          ? "gradient-hero text-primary-foreground shadow-soft"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Aucun produit trouvé</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pb-24">
                    {filteredListings.map((listing, index) => (
                      <ProductCard
                        key={listing.id}
                        listing={listing}
                        onClick={() => handleListingClick(listing)}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Intrants Sub-tab */}
            {buySubTab === "intrants" && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  <button
                    onClick={() => setSelectedInputCategory("all")}
                    className={cn(
                      "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all",
                      selectedInputCategory === "all"
                        ? "gradient-hero text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    Tous
                  </button>
                  {inputCategories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedInputCategory(cat.value)}
                      className={cn(
                        "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                        selectedInputCategory === cat.value
                          ? "gradient-hero text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pb-24">
                  <InputsGrid
                    inputs={filteredInputs}
                    onContact={(input) => toast.info(`Contact: ${input.supplier}`)}
                    onOrder={(input) => toast.success(`Commande de ${input.name} initiée`)}
                  />
                </div>
              </>
            )}

            {/* Services Sub-tab */}
            {buySubTab === "services" && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedServiceCategory(cat.value)}
                      className={cn(
                        "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all",
                        selectedServiceCategory === cat.value
                          ? "gradient-hero text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pb-24">
                  {filteredProviders.map((provider, index) => (
                    <ServiceProviderCard
                      key={provider.id}
                      provider={provider as any}
                      onBook={() => toast.success(`Réservation avec ${provider.business_name}`)}
                      onContact={(type) => handleContact(type, provider.phone || "")}
                      index={index}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* VENDRE TAB */}
          <TabsContent value="vendre" className="mt-4 pb-24">
            <div className="mb-4">
              <Button onClick={() => setShowListingForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Publier un nouveau produit
              </Button>
            </div>
            <MyListings 
              onAddNew={() => setShowListingForm(true)} 
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          {/* SERVICES TAB (for providers) */}
          <TabsContent value="services" className="mt-4 pb-24">
            <Card>
              <CardContent className="p-6 text-center">
                <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Devenir prestataire</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Proposez vos services aux agriculteurs de la région
                </p>
                <Button onClick={() => toast.info("Formulaire d'inscription prestataire bientôt disponible")}>
                  S'inscrire comme prestataire
                </Button>
              </CardContent>
            </Card>

            <div className="mt-4">
              <h3 className="font-semibold mb-3">Mes réservations</h3>
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune réservation en cours
              </div>
            </div>
          </TabsContent>

          {/* OFFRES TAB */}
          <TabsContent value="offres" className="mt-4 pb-24 space-y-6">
            {/* Incoming Offers */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-primary" />
                Offres reçues
                {incomingOffers.length > 0 && (
                  <Badge variant="secondary">{incomingOffers.length}</Badge>
                )}
              </h3>
              {incomingOffers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Aucune offre reçue pour le moment
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {incomingOffers.map((offer, index) => (
                    <OfferCard
                      key={offer.id}
                      offer={{ ...offer, is_incoming: true }}
                      onAccept={() => toast.success("Offre acceptée")}
                      onReject={() => toast.info("Offre refusée")}
                      onCounterOffer={() => toast.info("Contre-offre")}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sent Offers */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Mes offres envoyées
                {myOffers.length > 0 && (
                  <Badge variant="secondary">{myOffers.length}</Badge>
                )}
              </h3>
              {myOffers.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Vous n'avez envoyé aucune offre
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {myOffers.map((offer, index) => (
                    <OfferCard
                      key={offer.id}
                      offer={{ ...offer, is_incoming: false }}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Listing Form Dialog */}
      <ListingForm
        open={showListingForm}
        onOpenChange={setShowListingForm}
        onSuccess={() => {
          fetchListings();
          fetchStats();
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-7xl mb-4 relative">
                {selectedListing.category === "Céréales" ? "🌾" :
                 selectedListing.category === "Légumes" ? "🥬" :
                 selectedListing.category === "Fruits" ? "🍎" :
                 selectedListing.category === "Bétail" ? "🐄" : "📦"}
                {selectedListing.is_verified && (
                  <Badge className="absolute top-2 left-2 bg-primary">Vérifié</Badge>
                )}
                {selectedListing.traceability_qr && (
                  <Badge className="absolute top-2 right-2 bg-emerald-600">Traçable</Badge>
                )}
              </div>
              
              <DialogHeader>
                <DialogTitle>{selectedListing.title}</DialogTitle>
                <DialogDescription>
                  {selectedListing.location && `📍 ${selectedListing.location}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Prix</p>
                    <p className="text-xl font-bold text-primary">
                      {selectedListing.price ? `${selectedListing.price.toLocaleString()} FCFA` : "Sur demande"}
                    </p>
                    {selectedListing.price_negotiable && (
                      <p className="text-xs text-muted-foreground">Négociable</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Quantité</p>
                    <p className="font-semibold">{selectedListing.quantity || "Non spécifié"}</p>
                  </div>
                </div>

                {selectedListing.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">{selectedListing.description}</p>
                  </div>
                )}

                {selectedListing.traceability_qr && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700 mb-1">🔗 Traçabilité</p>
                    <p className="text-xs text-muted-foreground">
                      Ce produit dispose d'un historique de production vérifié.
                    </p>
                    <p className="text-xs font-mono mt-1">{selectedListing.traceability_qr}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span>{selectedListing.views_count || 0} vues</span>
                  {selectedListing.category && (
                    <>
                      <span className="mx-2">•</span>
                      <Badge variant="outline">{selectedListing.category}</Badge>
                    </>
                  )}
                </div>

                {user && selectedListing.user_id !== user.id && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => toast.info("Contact vendeur")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Appeler
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedListing.price) {
                          handleMakeOffer(selectedListing, selectedListing.price);
                        } else {
                          toast.info("Envoyez un message au vendeur");
                        }
                      }}
                    >
                      <HandCoins className="w-4 h-4 mr-2" />
                      Faire une offre
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
