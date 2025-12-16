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
  Shield,
  Lock,
} from "lucide-react";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createEscrowContract, fundEscrow } from "@/services/escrowService";

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
  mode: "accept" | "pay";
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
  const [escrowId, setEscrowId] = useState<string | null>(null);

  // Calculate fees (2% transaction fee)
  const transactionFee = Math.round(offer.proposed_price * 0.02);
  const totalAmount = offer.proposed_price + transactionFee;

  const handleAcceptOffer = async () => {
    setProcessing(true);
    try {
      const { error: offerError } = await supabase
        .from("marketplace_offers")
        .update({ 
          status: "acceptee", 
          responded_at: new Date().toISOString() 
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      await supabase
        .from("marketplace_listings")
        .update({ status: "reserve" })
        .eq("id", offer.listing_id);

      toast.success("Offre acceptée ! En attente du paiement sécurisé.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error accepting offer:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessing(false);
    }
  };

  const handleProceedToPayment = async () => {
    setProcessing(true);
    try {
      // Create escrow contract
      const escrow = await createEscrowContract(
        offer.buyer_id,
        offer.seller_id,
        offer.listing_id,
        offer.proposed_price,
        transactionFee,
        offer.id
      );
      setEscrowId(escrow.id);
      setShowPayment(true);
      toast.success("Contrat escrow créé - Transaction sécurisée");
    } catch (error) {
      console.error("Escrow creation error:", error);
      toast.error("Erreur lors de la création du contrat sécurisé");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    try {
      // Fund the escrow
      if (escrowId) {
        await fundEscrow(escrowId, transactionId);
      }

      const { error: offerError } = await supabase
        .from("marketplace_offers")
        .update({ 
          payment_method: "mobile_money",
          payment_status: "escrow",
          status: "acceptee"
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      await supabase
        .from("marketplace_listings")
        .update({ status: "reserve" })
        .eq("id", offer.listing_id);

      toast.success("Paiement sécurisé par escrow blockchain!");
      onSuccess();
      setShowPayment(false);
      setEscrowId(null);
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
                  <Shield className="w-5 h-5 text-primary" />
                  Paiement sécurisé
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {mode === "accept" 
                ? "Confirmez l'acceptation de cette offre"
                : "Transaction protégée par smart contract blockchain"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Escrow info for payment mode */}
            {mode === "pay" && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lock className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Protection Escrow</p>
                  <p className="text-xs text-muted-foreground">
                    Fonds libérés après confirmation de livraison
                  </p>
                </div>
                <Shield className="w-5 h-5 text-primary" />
              </div>
            )}

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
                <span className="font-bold">
                  {offer.proposed_price.toLocaleString()} FCFA
                </span>
              </div>
              
              {mode === "pay" && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Frais de service (2%)</span>
                    <span>{transactionFee.toLocaleString()} FCFA</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total sécurisé</span>
                    <span className="text-xl font-bold text-primary">
                      {totalAmount.toLocaleString()} FCFA
                    </span>
                  </div>
                </>
              )}
              
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
              <>
                <Button 
                  className="w-full"
                  onClick={handleProceedToPayment}
                  disabled={processing}
                >
                  {processing ? (
                    "Création du contrat..."
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Paiement sécurisé par Escrow
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  🔒 Fonds bloqués jusqu'à confirmation de réception
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <MobileMoneyPayment
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={totalAmount}
        description={`Escrow: ${listingTitle}`}
        paymentType="marketplace"
        referenceId={escrowId || offer.id}
        onSuccess={handlePaymentSuccess}
        onError={(error) => toast.error(error)}
      />
    </>
  );
}
