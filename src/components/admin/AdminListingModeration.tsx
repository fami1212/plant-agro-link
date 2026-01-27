import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  MapPin,
  Calendar,
  User,
  ImageIcon,
  AlertTriangle,
  Shield,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  quantity_kg: number | null;
  location: string | null;
  images: string[] | null;
  category: string | null;
  status: string;
  listing_type: string;
  is_verified: boolean | null;
  created_at: string;
  user_id: string;
  seller_name?: string;
  seller_email?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  publie: { label: "Publié", color: "bg-success/10 text-success" },
  reserve: { label: "Réservé", color: "bg-primary/10 text-primary" },
  vendu: { label: "Vendu", color: "bg-purple-500/10 text-purple-600" },
  archive: { label: "Archivé", color: "bg-muted text-muted-foreground" },
};

const listingTypeConfig: Record<string, { label: string; color: string }> = {
  produit: { label: "Produit", color: "bg-green-500/10 text-green-600" },
  service: { label: "Service", color: "bg-blue-500/10 text-blue-600" },
  intrant: { label: "Intrant", color: "bg-orange-500/10 text-orange-600" },
  investissement: { label: "Investissement", color: "bg-purple-500/10 text-purple-600" },
};

export function AdminListingModeration() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set((data || []).map(l => l.user_id))];
      
      let profiles: any[] = [];
      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", sellerIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      const listingsWithSellers: Listing[] = (data || []).map(l => ({
        ...l,
        seller_name: profileMap.get(l.user_id)?.full_name || "Vendeur",
        seller_email: profileMap.get(l.user_id)?.email,
      }));

      setListings(listingsWithSellers);
    } catch (error) {
      console.error("Error fetching listings:", error);
      toast.error("Erreur lors du chargement des annonces");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listing: Listing) => {
    setProcessing(listing.id);
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ is_verified: true, status: "publie" })
        .eq("id", listing.id);

      if (error) throw error;
      toast.success("Annonce approuvée");
      fetchListings();
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedListing) return;
    setProcessing(selectedListing.id);
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ is_verified: false, status: "archive" })
        .eq("id", selectedListing.id);

      if (error) throw error;
      toast.success("Annonce rejetée");
      setSelectedListing(null);
      setRejectReason("");
      fetchListings();
    } catch (error) {
      toast.error("Erreur lors du rejet");
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    setProcessing(listing.id);
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listing.id);

      if (error) throw error;
      toast.success("Annonce supprimée");
      fetchListings();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setProcessing(null);
    }
  };

  const filteredListings = listings.filter(l => {
    const matchesSearch = 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.seller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const matchesType = typeFilter === "all" || l.listing_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats
  const stats = {
    total: listings.length,
    pending: listings.filter(l => l.status === "brouillon" || !l.is_verified).length,
    published: listings.filter(l => l.status === "publie").length,
    verified: listings.filter(l => l.is_verified).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 text-center">
          <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center bg-warning/5">
          <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
          <p className="text-lg font-bold text-warning">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground">En attente</p>
        </Card>
        <Card className="p-3 text-center bg-success/5">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-success" />
          <p className="text-lg font-bold text-success">{stats.published}</p>
          <p className="text-[10px] text-muted-foreground">Publiées</p>
        </Card>
        <Card className="p-3 text-center bg-primary/5">
          <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-primary">{stats.verified}</p>
          <p className="text-[10px] text-muted-foreground">Vérifiées</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(listingTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Listings */}
      {filteredListings.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="Aucune annonce"
          description="Aucune annonce ne correspond à vos critères"
        />
      ) : (
        <div className="space-y-3">
          {filteredListings.map((listing, index) => {
            const status = statusConfig[listing.status] || statusConfig.brouillon;
            const type = listingTypeConfig[listing.listing_type] || listingTypeConfig.produit;
            const isProcessing = processing === listing.id;
            const needsReview = !listing.is_verified && listing.status !== "archive";

            return (
              <Card
                key={listing.id}
                className={cn(
                  "overflow-hidden animate-fade-in",
                  needsReview && "border-warning/50 bg-warning/5",
                  `stagger-${(index % 5) + 1}`
                )}
                style={{ opacity: 0 }}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                      {listing.images?.[0] ? (
                        <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold truncate">{listing.title}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {listing.seller_name}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge className={type.color}>{type.label}</Badge>
                          <Badge className={status.color}>{status.label}</Badge>
                          {listing.is_verified && (
                            <Badge className="bg-success text-success-foreground">
                              <Shield className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {listing.price && (
                          <span className="font-semibold text-foreground">
                            {listing.price.toLocaleString()} F
                          </span>
                        )}
                        {listing.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {listing.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(listing.created_at), "dd/MM/yy", { locale: fr })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        {needsReview && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1"
                              onClick={() => handleApprove(listing)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setSelectedListing(listing)}
                              disabled={isProcessing}
                            >
                              <XCircle className="w-3 h-3" />
                              Rejeter
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(listing)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Rejeter l'annonce
            </DialogTitle>
          </DialogHeader>

          {selectedListing && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-semibold">{selectedListing.title}</p>
                <p className="text-sm text-muted-foreground">Par {selectedListing.seller_name}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Raison du rejet (optionnel)</label>
                <Textarea
                  placeholder="Expliquez pourquoi cette annonce est rejetée..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedListing(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing === selectedListing?.id}
            >
              {processing === selectedListing?.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Rejeter l'annonce
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
