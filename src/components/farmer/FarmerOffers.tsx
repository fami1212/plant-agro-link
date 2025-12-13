import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HandCoins,
  Check,
  X,
  MessageCircle,
  Phone,
  Mail,
  Loader2,
  RefreshCw,
  DollarSign,
  Package,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  proposed_price: number;
  proposed_quantity: string | null;
  message: string | null;
  status: string;
  created_at: string;
  counter_offer_price: number | null;
  counter_offer_message: string | null;
  listing_title?: string;
  listing_category?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "bg-warning/15 text-warning" },
  acceptee: { label: "Acceptée", color: "bg-success/15 text-success" },
  refusee: { label: "Refusée", color: "bg-destructive/15 text-destructive" },
  contre_offre: { label: "Contre-offre", color: "bg-primary/15 text-primary" },
  expiree: { label: "Expirée", color: "bg-muted text-muted-foreground" },
};

export function FarmerOffers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [counterOfferPrice, setCounterOfferPrice] = useState("");
  const [counterOfferMessage, setCounterOfferMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchOffers = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: offersData, error } = await supabase
        .from("marketplace_offers")
        .select(`
          *,
          listing:marketplace_listings(id, title, category)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles
      const buyerIds = [...new Set((offersData || []).map(o => o.buyer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", buyerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedOffers = (offersData || []).map((offer: any) => {
        const profile = profileMap.get(offer.buyer_id);
        return {
          ...offer,
          listing_title: offer.listing?.title || "Produit",
          listing_category: offer.listing?.category,
          buyer_name: profile?.full_name || "Acheteur",
          buyer_email: profile?.email,
          buyer_phone: profile?.phone,
        };
      });

      setOffers(formattedOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  const handleAccept = async (offer: Offer) => {
    setProcessing(true);
    try {
      // Update offer status
      const { error: offerError } = await supabase
        .from("marketplace_offers")
        .update({ 
          status: "acceptee",
          responded_at: new Date().toISOString()
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      // Update listing status
      await supabase
        .from("marketplace_listings")
        .update({ status: "reserve" })
        .eq("id", offer.listing_id);

      toast.success("Offre acceptée !");
      fetchOffers();
    } catch (error) {
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (offer: Offer) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("marketplace_offers")
        .update({ 
          status: "refusee",
          responded_at: new Date().toISOString()
        })
        .eq("id", offer.id);

      if (error) throw error;
      toast.success("Offre refusée");
      fetchOffers();
    } catch (error) {
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!selectedOffer || !counterOfferPrice) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("marketplace_offers")
        .update({
          status: "contre_offre",
          counter_offer_price: parseFloat(counterOfferPrice),
          counter_offer_message: counterOfferMessage || null,
          responded_at: new Date().toISOString()
        })
        .eq("id", selectedOffer.id);

      if (error) throw error;
      toast.success("Contre-offre envoyée");
      setSelectedOffer(null);
      setCounterOfferPrice("");
      setCounterOfferMessage("");
      fetchOffers();
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setProcessing(false);
    }
  };

  const handleContact = (type: "call" | "whatsapp" | "email", offer: Offer) => {
    if (type === "call" && offer.buyer_phone) {
      window.open(`tel:${offer.buyer_phone}`, "_self");
    } else if (type === "whatsapp" && offer.buyer_phone) {
      window.open(`https://wa.me/${offer.buyer_phone.replace(/\s/g, "")}`, "_blank");
    } else if (type === "email" && offer.buyer_email) {
      window.open(`mailto:${offer.buyer_email}`, "_self");
    } else {
      toast.error("Contact non disponible");
    }
  };

  const pendingOffers = offers.filter(o => o.status === "en_attente");
  const otherOffers = offers.filter(o => o.status !== "en_attente");

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
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold text-warning">{pendingOffers.length}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <Check className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-success">
              {offers.filter(o => o.status === "acceptee").length}
            </p>
            <p className="text-xs text-muted-foreground">Acceptées</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <HandCoins className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-primary">{offers.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Offers */}
      {pendingOffers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-warning" />
              Offres en attente ({pendingOffers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingOffers.map((offer) => (
              <div key={offer.id} className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium">{offer.listing_title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {offer.buyer_name}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusConfig[offer.status]?.color}>
                    {statusConfig[offer.status]?.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2 rounded bg-background">
                    <p className="text-xs text-muted-foreground">Prix proposé</p>
                    <p className="font-bold text-primary">{offer.proposed_price.toLocaleString()} FCFA</p>
                  </div>
                  {offer.proposed_quantity && (
                    <div className="p-2 rounded bg-background">
                      <p className="text-xs text-muted-foreground">Quantité</p>
                      <p className="font-medium">{offer.proposed_quantity}</p>
                    </div>
                  )}
                </div>

                {offer.message && (
                  <p className="text-sm text-muted-foreground mb-3 p-2 bg-background rounded">
                    "{offer.message}"
                  </p>
                )}

                {/* Contact buttons */}
                <div className="flex gap-2 mb-3">
                  {offer.buyer_phone && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleContact("call", offer)}>
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleContact("whatsapp", offer)}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {offer.buyer_email && (
                    <Button variant="outline" size="sm" onClick={() => handleContact("email", offer)}>
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAccept(offer)}
                    disabled={processing}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOffer(offer);
                      setCounterOfferPrice(offer.proposed_price.toString());
                    }}
                    disabled={processing}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Négocier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReject(offer)}
                    disabled={processing}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Other Offers */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-primary" />
              Historique des offres
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchOffers}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <EmptyState
              icon={<Package className="w-8 h-8" />}
              title="Aucune offre"
              description="Publiez des produits pour recevoir des offres"
            />
          ) : (
            <div className="space-y-3">
              {otherOffers.map((offer) => (
                <div key={offer.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{offer.listing_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {offer.buyer_name} • {format(new Date(offer.created_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusConfig[offer.status]?.color}>
                      {statusConfig[offer.status]?.label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">
                    {offer.proposed_price.toLocaleString()} FCFA
                    {offer.counter_offer_price && (
                      <span className="text-primary ml-2">
                        → {offer.counter_offer_price.toLocaleString()} FCFA
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Counter Offer Dialog */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Faire une contre-offre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Prix proposé par l'acheteur</p>
              <p className="font-bold">{selectedOffer?.proposed_price.toLocaleString()} FCFA</p>
            </div>
            <div>
              <Label>Votre prix (FCFA)</Label>
              <Input
                type="number"
                value={counterOfferPrice}
                onChange={(e) => setCounterOfferPrice(e.target.value)}
                placeholder="Entrez votre prix"
              />
            </div>
            <div>
              <Label>Message (optionnel)</Label>
              <Input
                value={counterOfferMessage}
                onChange={(e) => setCounterOfferMessage(e.target.value)}
                placeholder="Ajoutez un message..."
              />
            </div>
            <Button onClick={handleCounterOffer} disabled={processing} className="w-full">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Envoyer la contre-offre
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
