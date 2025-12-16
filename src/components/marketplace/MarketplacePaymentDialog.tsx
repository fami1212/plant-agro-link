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
import { ShoppingBag, MapPin, User, CreditCard, CheckCircle2 } from "lucide-react";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentType } from "@/services/paymentService";

interface MarketplacePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    proposed_price: number;
    proposed_quantity?: string | null;
    listing?: {
      title: string;
      category?: string | null;
      location?: string | null;
    } | null;
  } | null;
  sellerName?: string;
  onSuccess?: () => void;
}

export function MarketplacePaymentDialog({
  open,
  onOpenChange,
  offer,
  sellerName,
  onSuccess,
}: MarketplacePaymentDialogProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  if (!offer) return null;

  // Calculate fees (2% transaction fee)
  const transactionFee = Math.round(offer.proposed_price * 0.02);
  const totalAmount = offer.proposed_price + transactionFee;

  const handlePaymentSuccess = async () => {
    try {
      // Update offer payment status
      await supabase
        .from("marketplace_offers")
        .update({ 
          payment_status: "paid",
          status: "acceptee"
        })
        .eq("id", offer.id);

      // Update listing status to sold
      await supabase
        .from("marketplace_listings")
        .update({ status: "vendu" })
        .eq("id", offer.listing_id);

      setShowPayment(false);
      setPaymentComplete(true);
      toast.success("Paiement réussi!");
      
      setTimeout(() => {
        onOpenChange(false);
        setPaymentComplete(false);
        onSuccess?.();
      }, 2000);
    } catch (error) {
      console.error("Payment update error:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (paymentComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Paiement réussi!</h3>
            <p className="text-sm text-muted-foreground text-center">
              Votre commande a été confirmée. Le vendeur sera notifié.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open && !showPayment} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Paiement de la commande
            </DialogTitle>
            <DialogDescription>
              Finalisez votre achat en toute sécurité
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order summary */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground line-clamp-1">
                    {offer.listing?.title || "Produit"}
                  </h4>
                  {offer.listing?.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {offer.listing.category}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {sellerName && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {sellerName}
                  </div>
                )}
                {offer.listing?.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {offer.listing.location}
                  </div>
                )}
              </div>

              {offer.proposed_quantity && (
                <p className="text-sm text-muted-foreground">
                  Quantité: {offer.proposed_quantity}
                </p>
              )}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prix du produit</span>
                <span className="font-medium">{offer.proposed_price.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais de service (2%)</span>
                <span className="font-medium">{transactionFee.toLocaleString()} FCFA</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {totalAmount.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* Payment button */}
            <Button className="w-full" onClick={() => setShowPayment(true)}>
              Procéder au paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MobileMoneyPayment
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={totalAmount}
        description={`Achat: ${offer.listing?.title || "Produit"}`}
        paymentType={"marketplace_purchase" as PaymentType}
        referenceId={offer.id}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}