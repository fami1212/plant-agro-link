import { Package } from "lucide-react";
import { fcfa } from "@/lib/offerPricing";
import { useOfferPricing } from "@/hooks/useOfferPricing";
import { cn } from "@/lib/utils";

interface Props {
  offerId?: string | null;
  proposedPrice?: number | null;
  counterOfferPrice?: number | null;
  quantity?: string | number | null;
  listingUnit?: string | null;
  listingPrice?: number | null;
  variant?: "rows" | "compact";
  className?: string;
}

/**
 * Affichage unique quantité / prix unitaire / total.
 * Le calcul provient du backend (RPC get_offer_pricing) : acheteur et agriculteur
 * voient donc exactement les mêmes valeurs.
 */
export function OfferPricingBreakdown({ variant = "rows", className, ...args }: Props) {
  const p = useOfferPricing(args);
  const qty = p.quantity
    ? `${p.quantity.toLocaleString("fr-FR")} ${p.unit}`
    : typeof args.quantity === "string" && args.quantity
      ? args.quantity
      : "—";

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        <div className="p-2 rounded bg-background">
          <p className="text-xs text-muted-foreground">Quantité</p>
          <p className="font-medium">{qty}</p>
        </div>
        <div className="p-2 rounded bg-background">
          <p className="text-xs text-muted-foreground">Prix / {p.unit}</p>
          <p className="font-medium">{p.unitPrice ? fcfa(p.unitPrice) : "—"}</p>
        </div>
        <div className="p-2 rounded bg-primary/10">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-primary">{fcfa(p.total)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border/50 divide-y divide-border/50 text-sm", className)}>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Package className="w-4 h-4" /> Quantité
        </span>
        <span className="font-medium">{qty}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-muted-foreground">Prix / {p.unit}</span>
        <span className="font-medium">{p.unitPrice ? fcfa(p.unitPrice) : "—"}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2 bg-primary/5">
        <span className="font-medium">Total à payer</span>
        <span className="font-bold text-primary">{fcfa(p.total)}</span>
      </div>
    </div>
  );
}
