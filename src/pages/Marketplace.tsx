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
  DollarSign,
  Calendar,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ListingForm } from "@/components/marketplace/ListingForm";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { ServiceProviderCard } from "@/components/marketplace/ServiceProviderCard";
import { ServiceProviderForm } from "@/components/marketplace/ServiceProviderForm";
import { MyListings } from "@/components/marketplace/MyListings";
import { MarketplaceStats } from "@/components/marketplace/MarketplaceStats";
import { OfferCard } from "@/components/marketplace/OfferCard";
import { InputsGrid } from "@/components/marketplace/InputsGrid";
import { FarmerOffers } from "@/components/farmer/FarmerOffers";
import { VetBookingDialog } from "@/components/veterinaire/VetBookingDialog";
import { ServiceBookingDialog } from "@/components/marketplace/ServiceBookingDialog";
import { EscrowManager } from "@/components/escrow/EscrowManager";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];
type ServiceProvider = Database["public"]["Tables"]["service_providers"]["Row"];
type Offer = Database["public"]["Tables"]["marketplace_offers"]["Row"];
type InvestmentOpportunity = Database["public"]["Tables"]["investment_opportunities"]["Row"];

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

type MarketplaceInput = Database["public"]["Tables"]["marketplace_inputs"]["Row"];

const inputCategoryIcons: Record<string, string> = {
  engrais: "🧪",
  semences: "🌱",
  materiel: "🔧",
  irrigation: "💧",
  phytosanitaire: "🧫",
  autre: "📦",
};

export default function Marketplace() {
  const { user } = useAuth();
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();
  
  // Determine default tab based on role
  const getDefaultTab = () => {
    if (isInvestisseur && !isAgriculteur && !isAdmin) return "acheter";
    if (isAcheteur && !isAgriculteur && !isAdmin) return "acheter";
    if (isVeterinaire && !isAgriculteur && !isAdmin) return "acheter";
    return "acheter";
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductCategory, setSelectedProductCategory] = useState("all");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("all");
  const [selectedInputCategory, setSelectedInputCategory] = useState("all");
  const [buySubTab, setBuySubTab] = useState<"produits" | "intrants" | "services">("produits");
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [marketplaceInputs, setMarketplaceInputs] = useState<MarketplaceInput[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([]);
  const [investmentOpportunities, setInvestmentOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<Offer[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showListingForm, setShowListingForm] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [selectedProviderForBooking, setSelectedProviderForBooking] = useState<ServiceProvider | null>(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
    totalOffers: 0,
  });

  const canSell = isAgriculteur || isAdmin;
  const canInvest = isInvestisseur || isAdmin;

  useEffect(() => {
    fetchListings();
    fetchServiceProviders();
    fetchMarketplaceInputs();
    if (user) {
      fetchStats();
      fetchOffers();
      fetchMyBookings();
      if (canInvest) {
        fetchInvestmentOpportunities();
      }
    }
  }, [user]);

  const fetchServiceProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      setServiceProviders(data || []);
    } catch (error) {
      console.error("Error fetching service providers:", error);
    }
  };

  const fetchMarketplaceInputs = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_inputs")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMarketplaceInputs(data || []);
    } catch (error) {
      console.error("Error fetching marketplace inputs:", error);
    }
  };

  const fetchInvestmentOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("investment_opportunities")
        .select("*")
        .eq("status", "ouverte")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestmentOpportunities(data || []);
    } catch (error) {
      console.error("Error fetching investment opportunities:", error);
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("service_bookings")
        .select(`
          *,
          provider:service_providers(business_name, service_category)
        `)
        .or(`client_id.eq.${user.id}`)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setMyBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

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
      // Fetch sent offers with listing info
      const { data: sent } = await supabase
        .from("marketplace_offers")
        .select(`
          *,
          listing:marketplace_listings(id, title, category)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch received offers with listing info
      const { data: received } = await supabase
        .from("marketplace_offers")
        .select(`
          *,
          listing:marketplace_listings(id, title, category)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      // Get profiles for other parties
      const sellerIds = [...new Set((sent || []).map(o => o.seller_id))];
      const buyerIds = [...new Set((received || []).map(o => o.buyer_id))];
      const allIds = [...sellerIds, ...buyerIds];

      let profileMap = new Map<string, string>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", allIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      }

      setMyOffers((sent || []).map(o => ({
        ...o,
        other_party_name: profileMap.get(o.seller_id) || "Vendeur"
      })));
      setIncomingOffers((received || []).map(o => ({
        ...o,
        other_party_name: profileMap.get(o.buyer_id) || "Acheteur"
      })));
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

  const filteredInputs = marketplaceInputs.filter((input) => {
    const matchesSearch = input.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedInputCategory === "all" || input.category === selectedInputCategory;
    return matchesSearch && matchesCategory;
  });

  // Use real service providers from DB
  const filteredProviders = serviceProviders.filter((provider) => {
    const matchesSearch = 
      provider.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedServiceCategory === "all" || provider.service_category === selectedServiceCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter investment opportunities
  const filteredOpportunities = investmentOpportunities.filter((opp) => {
    const matchesSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

  // Determine which tabs to show based on role
  const getTabs = () => {
    if (isInvestisseur && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Produits", icon: ShoppingBag },
        { value: "investir", label: "Opportunités", icon: TrendingUp },
        { value: "offres", label: "Mes Offres", icon: HandCoins },
        { value: "escrow", label: "Escrow", icon: Shield },
      ];
    }
    if (isAcheteur && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Acheter", icon: ShoppingBag },
        { value: "services", label: "Services", icon: Briefcase },
        { value: "offres", label: "Mes Offres", icon: HandCoins },
        { value: "escrow", label: "Escrow", icon: Shield },
      ];
    }
    if (isVeterinaire && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Produits", icon: ShoppingBag },
        { value: "mes-services", label: "Mes Services", icon: Briefcase },
        { value: "reservations", label: "Réservations", icon: Eye },
        { value: "escrow", label: "Escrow", icon: Shield },
      ];
    }
    return [
      { value: "acheter", label: "Acheter", icon: ShoppingBag },
      { value: "vendre", label: "Vendre", icon: Store },
      { value: "offres", label: "Offres", icon: HandCoins },
      { value: "escrow", label: "Escrow", icon: Shield },
    ];
  };

  const tabs = getTabs();
  const gridCols = tabs.length <= 4 ? `grid-cols-${tabs.length}` : "grid-cols-4";

  return (
    <AppLayout>
      <PageHeader
        title="Marketplace"
        subtitle={isInvestisseur && !isAgriculteur ? "Opportunités d'investissement" : "Hub économique agricole"}
        action={
          canSell ? (
            <Button variant="accent" size="icon" onClick={() => setShowListingForm(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          ) : null
        }
      />

      {/* Stats for logged in users */}
      {user && canSell && (
        <div className="px-4 mb-4">
          <MarketplaceStats stats={stats} />
        </div>
      )}

      {/* Main Tabs */}
      <div className="px-4 mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${gridCols} h-auto p-1`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col gap-1 py-2 text-xs">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
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
                    onContact={(input) => toast.info(`Contact: ${input.supplier_name} - ${input.contact_phone || input.contact_whatsapp || "Non disponible"}`)}
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
                  {filteredProviders.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-4xl mb-3 block">🔧</span>
                      <p className="text-muted-foreground">Aucun prestataire trouvé</p>
                      <p className="text-sm text-muted-foreground mt-1">Revenez plus tard pour voir les services disponibles</p>
                    </div>
                  ) : (
                    filteredProviders.map((provider, index) => (
                      <ServiceProviderCard
                        key={provider.id}
                        provider={provider as any}
                        onBook={() => setSelectedProviderForBooking(provider)}
                        onContact={(type) => handleContact(type, provider.phone || "")}
                        index={index}
                      />
                    ))
                  )}
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

          {/* INVESTIR TAB (for investors) */}
          <TabsContent value="investir" className="mt-4 pb-24 space-y-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Rechercher des opportunités..."
                className="pl-11 h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune opportunité disponible</p>
                <p className="text-sm text-muted-foreground mt-2">Revenez plus tard pour voir de nouvelles opportunités</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOpportunities.map((opp) => (
                  <Card key={opp.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{opp.title}</h3>
                        {opp.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {opp.location}
                          </p>
                        )}
                      </div>
                      <Badge variant={opp.risk_level === "faible" ? "default" : opp.risk_level === "moyen" ? "secondary" : "destructive"}>
                        Risque {opp.risk_level}
                      </Badge>
                    </div>
                    {opp.description && <p className="text-sm text-muted-foreground mb-3">{opp.description}</p>}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Objectif</p>
                        <p className="font-semibold">{opp.target_amount?.toLocaleString()} FCFA</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Collecté</p>
                        <p className="font-semibold text-primary">{(opp.current_amount || 0).toLocaleString()} FCFA</p>
                      </div>
                      <div className="bg-muted p-2 rounded">
                        <p className="text-xs text-muted-foreground">Rendement attendu</p>
                        <p className="font-semibold text-green-600">+{opp.expected_return_percent}%</p>
                      </div>
                      {opp.expected_harvest_date && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-xs text-muted-foreground">Récolte prévue</p>
                          <p className="font-semibold">{new Date(opp.expected_harvest_date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2 mb-4">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${Math.min(100, ((opp.current_amount || 0) / opp.target_amount) * 100)}%` }}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        window.location.href = "/investisseur";
                      }}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Investir • {((opp.target_amount - (opp.current_amount || 0)) / 1000).toFixed(0)}k restants
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MES SERVICES TAB (for vets) */}
          <TabsContent value="mes-services" className="mt-4 pb-24">
            <Card>
              <CardContent className="p-6 text-center">
                <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Gérer mes services</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configurez vos services et disponibilités
                </p>
                <Button onClick={() => setShowProviderForm(true)}>
                  Configurer mes services
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RESERVATIONS TAB (for vets) */}
          <TabsContent value="reservations" className="mt-4 pb-24">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Mes réservations
            </h3>
            {myBookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  Aucune réservation en cours
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myBookings.map((booking) => (
                  <Card key={booking.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{booking.service_type}</h4>
                        <p className="text-sm text-muted-foreground">{booking.provider?.business_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.scheduled_date).toLocaleDateString('fr-FR')}
                          {booking.scheduled_time && ` à ${booking.scheduled_time}`}
                        </p>
                      </div>
                      <Badge variant={booking.status === "confirme" ? "default" : "secondary"}>
                        {booking.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SERVICES TAB (for providers) */}
          <TabsContent value="services" className="mt-4 pb-24">
            <Card className="mb-4">
              <CardContent className="p-6 text-center">
                <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Devenir prestataire</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Proposez vos services aux agriculteurs de la région
                </p>
                <Button onClick={() => setShowProviderForm(true)}>
                  S'inscrire comme prestataire
                </Button>
              </CardContent>
            </Card>

            {/* List service providers */}
            <div className="mt-4 space-y-3">
              <h3 className="font-semibold">Prestataires disponibles</h3>
              {filteredProviders.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Aucun prestataire disponible</p>
              ) : (
                filteredProviders.map((provider, index) => (
                  <ServiceProviderCard
                    key={provider.id}
                    provider={provider as any}
                    onBook={() => setSelectedProviderForBooking(provider)}
                    onContact={(type) => handleContact(type, provider.phone || "")}
                    index={index}
                  />
                ))
              )}
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
                      onAccept={async () => {
                        try {
                          const { error } = await supabase
                            .from("marketplace_offers")
                            .update({ status: "acceptee", responded_at: new Date().toISOString() })
                            .eq("id", offer.id);
                          if (error) throw error;
                          
                          // Update listing status
                          await supabase
                            .from("marketplace_listings")
                            .update({ status: "reserve" })
                            .eq("id", offer.listing_id);
                          
                          toast.success("Offre acceptée avec succès !");
                          fetchOffers();
                        } catch (error) {
                          console.error("Error accepting offer:", error);
                          toast.error("Erreur lors de l'acceptation");
                        }
                      }}
                      onReject={async () => {
                        try {
                          const { error } = await supabase
                            .from("marketplace_offers")
                            .update({ status: "refusee", responded_at: new Date().toISOString() })
                            .eq("id", offer.id);
                          if (error) throw error;
                          toast.info("Offre refusée");
                          fetchOffers();
                        } catch (error) {
                          console.error("Error rejecting offer:", error);
                          toast.error("Erreur lors du refus");
                        }
                      }}
                      onCounterOffer={() => toast.info("Fonctionnalité contre-offre à venir")}
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

          {/* Escrow Tab */}
          <TabsContent value="escrow" className="mt-4 pb-24">
            <EscrowManager />
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

      {/* Service Provider Form Dialog */}
      <ServiceProviderForm
        open={showProviderForm}
        onOpenChange={setShowProviderForm}
        onSuccess={() => {
          fetchServiceProviders();
        }}
      />

      {/* Vet Booking Dialog - for veterinaires only */}
      {selectedProviderForBooking && selectedProviderForBooking.service_category === "veterinaire" && (
        <VetBookingDialog
          open={!!selectedProviderForBooking}
          onOpenChange={(open) => !open && setSelectedProviderForBooking(null)}
          provider={{
            id: selectedProviderForBooking.id,
            business_name: selectedProviderForBooking.business_name,
            hourly_rate: selectedProviderForBooking.hourly_rate,
            specializations: selectedProviderForBooking.specializations,
          }}
          onSuccess={() => {
            fetchMyBookings();
            setSelectedProviderForBooking(null);
          }}
        />
      )}

      {/* Service Booking Dialog - for other services */}
      {selectedProviderForBooking && selectedProviderForBooking.service_category !== "veterinaire" && (
        <ServiceBookingDialog
          open={!!selectedProviderForBooking}
          onOpenChange={(open) => !open && setSelectedProviderForBooking(null)}
          provider={{
            id: selectedProviderForBooking.id,
            user_id: selectedProviderForBooking.user_id,
            business_name: selectedProviderForBooking.business_name,
            service_category: selectedProviderForBooking.service_category,
            hourly_rate: selectedProviderForBooking.hourly_rate,
            phone: selectedProviderForBooking.phone,
          }}
          onSuccess={() => {
            fetchMyBookings();
            setSelectedProviderForBooking(null);
          }}
        />
      )}
    </AppLayout>
  );
}
