import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Eye, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Archive, 
  CheckCircle,
  Clock,
  MessageSquare,
  Loader2,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["marketplace_listings"]["Row"];

interface MyListingsProps {
  onAddNew: () => void;
  refreshTrigger?: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  brouillon: { label: "Brouillon", color: "bg-muted text-muted-foreground", icon: Edit },
  publie: { label: "Publié", color: "bg-primary/10 text-primary", icon: CheckCircle },
  consulte: { label: "Consulté", color: "bg-blue-500/10 text-blue-600", icon: Eye },
  negociation: { label: "En négo.", color: "bg-warning/10 text-warning", icon: MessageSquare },
  reserve: { label: "Réservé", color: "bg-orange-500/10 text-orange-600", icon: Clock },
  vendu: { label: "Vendu", color: "bg-primary/10 text-primary", icon: CheckCircle },
  archive: { label: "Archivé", color: "bg-muted text-muted-foreground", icon: Archive },
};

const categoryEmojis: Record<string, string> = {
  "Céréales": "🌾",
  "Légumes": "🥬",
  "Fruits": "🍎",
  "Légumineuses": "🫘",
  "Bétail": "🐄",
  "default": "📦"
};

export function MyListings({ onAddNew, refreshTrigger }: MyListingsProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user, refreshTrigger]);

  const fetchListings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (listingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ status: newStatus as Listing["status"] })
        .eq("id", listingId);

      if (error) throw error;
      toast.success("Statut mis à jour");
      fetchListings();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const deleteListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", listingId);

      if (error) throw error;
      toast.success("Annonce supprimée");
      fetchListings();
    } catch (error) {
      console.error("Error deleting listing:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold mb-1">Aucune annonce</p>
        <p className="text-sm text-muted-foreground mb-4">Publiez votre première récolte sur le marketplace</p>
        <Button onClick={onAddNew}>Publier un produit</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing, index) => {
        const config = statusConfig[listing.status] || statusConfig.brouillon;
        const StatusIcon = config.icon;
        const emoji = categoryEmojis[listing.category || ""] || categoryEmojis.default;

        return (
          <Card
            key={listing.id}
            className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
            style={{ opacity: 0 }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={cn("text-xs gap-1", config.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        {listing.views_count !== undefined && listing.views_count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.views_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {listing.status === "brouillon" && (
                          <DropdownMenuItem onClick={() => updateStatus(listing.id, "publie")}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Publier
                          </DropdownMenuItem>
                        )}
                        {listing.status === "publie" && (
                          <DropdownMenuItem onClick={() => updateStatus(listing.id, "vendu")}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marquer vendu
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => updateStatus(listing.id, "archive")}>
                          <Archive className="w-4 h-4 mr-2" />
                          Archiver
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteListing(listing.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="font-bold text-primary">
                        {listing.price ? `${listing.price.toLocaleString()} FCFA` : "Prix sur demande"}
                      </span>
                      {listing.quantity && (
                        <span className="text-sm text-muted-foreground ml-2">
                          • {listing.quantity}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(listing.created_at), "dd MMM", { locale: fr })}
                    </span>
                  </div>

                  {listing.traceability_qr && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                      <span className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">📋</span>
                      <span>QR: {listing.traceability_qr}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
