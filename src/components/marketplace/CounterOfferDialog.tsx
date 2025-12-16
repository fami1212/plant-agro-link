import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeftRight, Calendar as CalendarIcon, Loader2, Package, Banknote, MessageSquare, Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CounterOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    proposed_price: number;
    proposed_quantity?: string | null;
    message?: string | null;
    listing?: {
      title: string;
      price?: number | null;
    } | null;
  };
  onSuccess?: () => void;
}

export function CounterOfferDialog({
  open,
  onOpenChange,
  offer,
  onSuccess,
}: CounterOfferDialogProps) {
  const [counterPrice, setCounterPrice] = useState(offer.proposed_price.toString());
  const [counterQuantity, setCounterQuantity] = useState(offer.proposed_quantity || "");
  const [counterMessage, setCounterMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Prix invalide");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("marketplace_offers")
        .update({
          status: "contre_offre",
          counter_offer_price: price,
          counter_offer_message: counterMessage || null,
          proposed_quantity: counterQuantity || null,
          delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      if (error) throw error;

      toast.success("Contre-offre envoyée");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending counter-offer:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            Proposer une contre-offre
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original offer info */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-1">
              {offer.listing?.title || "Produit"}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Offre initiale</span>
              <span className="font-semibold text-primary">
                {offer.proposed_price.toLocaleString()} FCFA
              </span>
            </div>
          </div>

          {/* Counter price */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              Nouveau prix proposé
            </Label>
            <div className="relative">
              <Input
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="0"
                className="pr-16 h-12 text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                FCFA
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Quantité (optionnel)
            </Label>
            <Input
              value={counterQuantity}
              onChange={(e) => setCounterQuantity(e.target.value)}
              placeholder="ex: 50 kg"
              className="h-11"
            />
          </div>

          {/* Delivery date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-muted-foreground" />
              Date de livraison souhaitée
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal",
                    !deliveryDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate
                    ? format(deliveryDate, "PPP", { locale: fr })
                    : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={setDeliveryDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Message de négociation
            </Label>
            <Textarea
              value={counterMessage}
              onChange={(e) => setCounterMessage(e.target.value)}
              placeholder="Expliquez votre contre-proposition..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}