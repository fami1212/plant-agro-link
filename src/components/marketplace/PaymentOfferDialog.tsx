import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  Wallet, 
  Package,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Listing {
  id: string;
  title: string;
  category?: string | null;
  price?: number | null;
  location?: string | null;
}

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  proposed_price: number;
  proposed_quantity?: string | null;
  message?: string | null;
  delivery_date?: string | null;
  status: string;
  listing?: Listing | null;
}

interface PaymentOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer;
  onSuccess: () => void;
  mode: "accept" | "pay"; // "accept" for seller accepting, "pay" for buyer paying
}

export function PaymentOfferDialog({
  open,
  onOpenChange,
  offer,
  onSuccess,
  mode,
}: PaymentOfferDialogProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleAcceptOffer = async () => {
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

      toast.success("Offre acceptée ! En attente du paiement.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      // Update offer with payment info
      const { error: offerError } = await supabase
        .from("marketplace_offers")
        .update({ 
          payment_method: "mobile_money",
          status: "acceptee"
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      // Update listing as sold
      await supabase
        .from("marketplace_listings")
        .update({ status: "vendu" })
        .eq("id", offer.listing_id);

      toast.success("Paiement effectué avec succès !");
      onSuccess();
      setShowPayment(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing payment:", error);
    }
  };

  const listingTitle = offer.listing?.title || "Produit";
  const listingCategory = offer.listing?.category;

  return (
    <>
      <Dialog open={open && !showPayment} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === "accept" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Accepter l'offre
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payer l'offre
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {mode === "accept" 
                ? "Confirmez l'acceptation de cette offre"
                : "Finalisez votre achat avec le paiement mobile"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{listingTitle}</p>
                  {listingCategory && (
                    <Badge variant="outline" className="mt-1">{listingCategory}</Badge>
                  )}
                </div>
              </div>
              {offer.listing?.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{offer.listing.location}</span>
                </div>
              )}
            </div>

            {/* Offer Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Prix proposé</span>
                <span className="text-xl font-bold text-primary">
                  {offer.proposed_price.toLocaleString()} FCFA
                </span>
              </div>
              
              {offer.proposed_quantity && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Quantité</span>
                  <span>{offer.proposed_quantity}</span>
                </div>
              )}

              {offer.delivery_date && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Date de livraison</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(offer.delivery_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              {offer.message && (
                <div className="p-3 bg-muted/50 rounded text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p>{offer.message}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            {mode === "accept" ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleAcceptOffer}
                  disabled={processing}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {processing ? "En cours..." : "Accepter"}
                </Button>
              </div>
            ) : (
              <Button 
                className="w-full"
                onClick={() => setShowPayment(true)}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Procéder au paiement
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <MobileMoneyPayment
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={offer.proposed_price}
        description={`Achat: ${listingTitle}`}
        paymentType="marketplace"
        referenceId={offer.id}
        onSuccess={handlePaymentSuccess}
        onError={(error) => toast.error(error)}
      />
    </>
  );
}
