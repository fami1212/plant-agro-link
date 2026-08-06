import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeOfferPricing, type OfferPricing } from "@/lib/offerPricing";

interface Args {
  offerId?: string | null;
  proposedPrice?: number | null;
  counterOfferPrice?: number | null;
  quantity?: string | number | null;
  listingUnit?: string | null;
  listingPrice?: number | null;
}

/**
 * Source unique de vérité pour quantité / prix unitaire / total.
 * Le calcul est fait côté backend (RPC get_offer_pricing) afin que l'acheteur
 * (OfferCard) et l'agriculteur (Offres à traiter) affichent exactement la même chose.
 * Repli local immédiat pour l'affichage optimiste et le mode hors ligne.
 */
export function useOfferPricing(args: Args): OfferPricing {
  const local = computeOfferPricing(args);
  const [pricing, setPricing] = useState<OfferPricing>(local);

  useEffect(() => {
    setPricing(local);
    if (!args.offerId || !navigator.onLine) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_offer_pricing", {
        _offer_id: args.offerId,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (cancelled || error || !row) return;
      setPricing({
        total: Number(row.total) || 0,
        quantity: row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : null,
        unit: row.unit || local.unit,
        unitPrice:
          row.unit_price !== null && row.unit_price !== undefined ? Number(row.unit_price) : null,
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.offerId, args.proposedPrice, args.counterOfferPrice, args.quantity]);

  return pricing;
}
