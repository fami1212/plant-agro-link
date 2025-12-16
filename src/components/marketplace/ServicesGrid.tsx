import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  User,
  MapPin,
  Phone,
  MessageCircle,
  Loader2,
  Filter,
  Star,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VetBookingDialog } from "@/components/veterinaire/VetBookingDialog";
import { ServiceBookingDialog } from "@/components/marketplace/ServiceBookingDialog";
import { useAuth } from "@/hooks/useAuth";

interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  service_category: string;
  specializations: string[] | null;
  location: string | null;
  phone: string | null;
  whatsapp: string | null;
  hourly_rate: number | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
}

const categoryLabels: Record<string, string> = {
  veterinaire: "Vétérinaire",
  technicien_iot: "Technicien IoT",
  transporteur: "Transporteur",
  conseiller: "Conseiller agricole",
  cooperative: "Coopérative",
  autre: "Autre",
};

export function ServicesGrid() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error("Error fetching providers:", error);
      toast.error("Erreur lors du chargement des prestataires");
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter((provider) => {
    const matchesSearch =
      provider.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specializations?.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCategory =
      categoryFilter === "all" || provider.service_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleContact = (phone: string | null, type: "call" | "whatsapp") => {
    if (!phone) {
      toast.error("Numéro non disponible");
      return;
    }
    const cleanPhone = phone.replace(/\s/g, "");
    if (type === "whatsapp") {
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    } else {
      window.open(`tel:${cleanPhone}`, "_blank");
    }
  };

  const handleBook = (provider: ServiceProvider) => {
    if (!user) {
      toast.error("Connectez-vous pour réserver");
      return;
    }
    setSelectedProvider(provider);
    setBookingDialogOpen(true);
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
      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prestataire..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredProviders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium">Aucun prestataire disponible</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== "all"
                ? "Essayez de modifier vos critères de recherche"
                : "Aucun prestataire inscrit pour le moment"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredProviders.map((provider) => (
            <Card key={provider.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[provider.service_category] ||
                          provider.service_category}
                      </Badge>
                      {provider.is_verified && (
                        <Badge className="bg-green-500 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{provider.business_name}</h3>
                    {provider.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {provider.description}
                      </p>
                    )}

                    {/* Specializations */}
                    {provider.specializations && provider.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.specializations.slice(0, 3).map((spec, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {provider.specializations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{provider.specializations.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {provider.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {provider.location}
                        </span>
                      )}
                      {provider.rating !== null && provider.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          {provider.rating.toFixed(1)}
                          {provider.reviews_count && ` (${provider.reviews_count})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  {provider.hourly_rate && (
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {provider.hourly_rate.toLocaleString()} F
                      </p>
                      <p className="text-xs text-muted-foreground">/heure</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleContact(provider.phone, "call")}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Appeler
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      handleContact(provider.whatsapp || provider.phone, "whatsapp")
                    }
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleBook(provider)}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Réserver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Dialogs */}
      {selectedProvider && selectedProvider.service_category === "veterinaire" && (
        <VetBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          provider={{
            id: selectedProvider.id,
            business_name: selectedProvider.business_name,
            specializations: selectedProvider.specializations,
            hourly_rate: selectedProvider.hourly_rate,
          }}
        />
      )}

      {selectedProvider && selectedProvider.service_category !== "veterinaire" && (
        <ServiceBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          provider={{
            id: selectedProvider.id,
            user_id: selectedProvider.user_id,
            business_name: selectedProvider.business_name,
            service_category: selectedProvider.service_category,
            hourly_rate: selectedProvider.hourly_rate,
            phone: selectedProvider.phone,
          }}
        />
      )}
    </div>
  );
}