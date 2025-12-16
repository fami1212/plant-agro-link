import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  X, 
  ArrowLeftRight, 
  Clock, 
  ArrowRight, 
  CreditCard,
  Package,
  Truck,
  MessageSquare,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PaymentOfferDialog } from "./PaymentOfferDialog";
import { CounterOfferDialog } from "./CounterOfferDialog";
import { ChatDialog } from "./ChatDialog";

interface OfferCardProps {
  offer: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    proposed_price: number;
    proposed_quantity?: string | null;
    message?: string | null;
    counter_offer_message?: string | null;
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
    other_party_name?: string;
  };
  onAccept?: () => void;
  onReject?: () => void;
  onCounterOffer?: () => void;
  onPaymentSuccess?: () => void;
  index?: number;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  en_attente: { label: "En attente", color: "text-warning", bgColor: "bg-warning/10" },
  acceptee: { label: "Acceptée", color: "text-success", bgColor: "bg-success/10" },
  refusee: { label: "Refusée", color: "text-destructive", bgColor: "bg-destructive/10" },
  contre_offre: { label: "Contre-offre", color: "text-primary", bgColor: "bg-primary/10" },
  expiree: { label: "Expirée", color: "text-muted-foreground", bgColor: "bg-muted" },
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
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
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

  const showPayButton = !offer.is_incoming && offer.status === "acceptee";
  const showRespondToCounter = !offer.is_incoming && offer.status === "contre_offre";

  return (
    <>
      <Card
        className={cn(
          "animate-fade-in overflow-hidden border-border/50",
          `stagger-${(index % 5) + 1}`
        )}
        style={{ opacity: 0 }}
      >
        <CardContent className="p-0">
          {/* Header with status */}
          <div className={cn("px-4 py-2 flex items-center justify-between", config.bgColor)}>
            <span className={cn("text-sm font-medium", config.color)}>
              {config.label}
            </span>
            {offer.expires_at && !isExpired && offer.status === "en_attente" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Expire le {format(new Date(offer.expires_at), "dd/MM", { locale: fr })}
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Product info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {offer.listing?.title || "Produit"}
                </h3>
                {offer.listing?.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {offer.listing.category}
                  </Badge>
                )}
              </div>
            </div>

            {/* Price info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Offre proposée</p>
                <p className="text-lg font-bold text-foreground">
                  {offer.proposed_price.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">FCFA</span>
                </p>
              </div>
              
              {offer.counter_offer_price && (
                <div className="p-3 rounded-xl bg-primary/10">
                  <p className="text-xs text-primary mb-1">Contre-offre</p>
                  <p className="text-lg font-bold text-primary">
                    {offer.counter_offer_price.toLocaleString()}
                    <span className="text-sm font-normal ml-1">FCFA</span>
                  </p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-2">
              {offer.proposed_quantity && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  {offer.proposed_quantity}
                </div>
              )}
              {offer.delivery_date && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4" />
                  Livraison: {format(new Date(offer.delivery_date), "dd MMM", { locale: fr })}
                </div>
              )}
            </div>

            {/* Messages */}
            {offer.message && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {offer.message}
                  </p>
                </div>
              </div>
            )}

            {offer.counter_offer_message && (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-primary">
                    {offer.counter_offer_message}
                  </p>
                </div>
              </div>
            )}

            {/* Date + Chat button */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {format(new Date(offer.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-primary"
                onClick={() => setShowChatDialog(true)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Message
              </Button>
            </div>

            {/* Actions for seller (incoming offers) */}
            {offer.is_incoming && offer.status === "en_attente" && (
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={handleAcceptWithPayment}>
                  <Check className="w-4 h-4 mr-1" />
                  Accepter
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowCounterDialog(true)}
                >
                  <ArrowLeftRight className="w-4 h-4 mr-1" />
                  Contre-offre
                </Button>
                <Button size="sm" variant="ghost" onClick={onReject}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Accept counter-offer (for buyer) */}
            {showRespondToCounter && (
              <div className="flex items-center gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={handleAcceptWithPayment}>
                  <Check className="w-4 h-4 mr-1" />
                  Accepter la contre-offre
                </Button>
                <Button size="sm" variant="ghost" onClick={onReject}>
                  <X className="w-4 h-4 mr-1" />
                  Refuser
                </Button>
              </div>
            )}

            {/* Pay button for buyer */}
            {showPayButton && (
              <Button size="sm" className="w-full" onClick={handlePayOffer}>
                <CreditCard className="w-4 h-4 mr-2" />
                Payer maintenant
              </Button>
            )}
          </div>
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
          proposed_price: offer.counter_offer_price || offer.proposed_price,
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

      {/* Counter-offer Dialog */}
      <CounterOfferDialog
        open={showCounterDialog}
        onOpenChange={setShowCounterDialog}
        offer={{
          id: offer.id,
          listing_id: offer.listing_id,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id,
          proposed_price: offer.proposed_price,
          proposed_quantity: offer.proposed_quantity,
          message: offer.message,
          listing: offer.listing,
        }}
        onSuccess={onCounterOffer}
      />

      {/* Chat Dialog */}
      <ChatDialog
        open={showChatDialog}
        onOpenChange={setShowChatDialog}
        offerId={offer.id}
        recipientId={offer.is_incoming ? offer.buyer_id : offer.seller_id}
        recipientName={offer.other_party_name || "Utilisateur"}
        productTitle={offer.listing?.title || "Produit"}
      />
    </>
  );
}