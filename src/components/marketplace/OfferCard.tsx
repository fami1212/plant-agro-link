import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, MessageSquare, Clock, ArrowRight, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentOfferDialog } from "./PaymentOfferDialog";

interface OfferCardProps {
  offer: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    proposed_price: number;
    proposed_quantity?: string | null;
    message?: string | null;
    status: string;
    counter_offer_price?: number | null;
    created_at: string;
    expires_at?: string | null;
    delivery_date?: string | null;
    listing?: {
      id?: string;
      title: string;
      category?: string | null;
      price?: number | null;
      location?: string | null;
    } | null;
    is_incoming?: boolean;
  };
  onAccept?: () => void;
  onReject?: () => void;
  onCounterOffer?: () => void;
  onPaymentSuccess?: () => void;
  index?: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "bg-warning/10 text-warning" },
  acceptee: { label: "Acceptée", color: "bg-primary/10 text-primary" },
  refusee: { label: "Refusée", color: "bg-destructive/10 text-destructive" },
  contre_offre: { label: "Contre-offre", color: "bg-blue-500/10 text-blue-600" },
  expiree: { label: "Expirée", color: "bg-muted text-muted-foreground" },
};

export function OfferCard({ 
  offer, 
  onAccept, 
  onReject, 
  onCounterOffer, 
  onPaymentSuccess,
  index = 0 
}: OfferCardProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"accept" | "pay">("accept");
  
  const config = statusConfig[offer.status] || statusConfig.en_attente;
  const isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();

  const handleAcceptWithPayment = () => {
    setPaymentMode("accept");
    setShowPaymentDialog(true);
  };

  const handlePayOffer = () => {
    setPaymentMode("pay");
    setShowPaymentDialog(true);
  };

  // Show pay button for buyer when offer is accepted
  const showPayButton = !offer.is_incoming && offer.status === "acceptee";

  return (
    <>
      <Card
        className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
        style={{ opacity: 0 }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {offer.listing?.title || "Produit"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-xs", config.color)}>
                  {config.label}
                </Badge>
                {offer.listing?.category && (
                  <Badge variant="outline" className="text-xs">
                    {offer.listing.category}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-primary">
                {offer.proposed_price.toLocaleString()} FCFA
              </p>
              {offer.proposed_quantity && (
                <p className="text-xs text-muted-foreground">{offer.proposed_quantity}</p>
              )}
            </div>
          </div>

          {offer.message && (
            <div className="p-2 bg-muted rounded-lg mb-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                "{offer.message}"
              </p>
            </div>
          )}

          {offer.counter_offer_price && (
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg mb-3">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-600">
                Contre-offre: <strong>{offer.counter_offer_price.toLocaleString()} FCFA</strong>
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>
              {format(new Date(offer.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
            {offer.expires_at && !isExpired && (
              <div className="flex items-center gap-1 text-warning">
                <Clock className="w-3 h-3" />
                <span>Expire le {format(new Date(offer.expires_at), "dd/MM", { locale: fr })}</span>
              </div>
            )}
          </div>

          {/* Seller actions - Accept/Reject */}
          {offer.is_incoming && offer.status === "en_attente" && (
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={handleAcceptWithPayment}>
                <Check className="w-4 h-4 mr-1" />
                Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={onCounterOffer}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Contre-offre
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Buyer action - Pay after acceptance */}
          {showPayButton && (
            <Button size="sm" className="w-full" onClick={handlePayOffer}>
              <CreditCard className="w-4 h-4 mr-2" />
              Payer maintenant
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentOfferDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        offer={{
          id: offer.id,
          listing_id: offer.listing_id,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id,
          proposed_price: offer.proposed_price,
          proposed_quantity: offer.proposed_quantity,
          message: offer.message,
          delivery_date: offer.delivery_date,
          status: offer.status,
          listing: offer.listing ? {
            id: offer.listing.id || offer.listing_id,
            title: offer.listing.title,
            category: offer.listing.category,
            price: offer.listing.price,
            location: offer.listing.location,
          } : null,
        }}
        mode={paymentMode}
        onSuccess={() => {
          onPaymentSuccess?.();
          onAccept?.();
        }}
      />
    </>
  );
}
