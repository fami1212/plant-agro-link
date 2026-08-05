/** Utilitaires de calcul prix / quantité pour les offres marketplace */

export function parseQuantity(q?: string | number | null): number | null {
  if (q === null || q === undefined) return null;
  if (typeof q === "number") return isFinite(q) && q > 0 ? q : null;
  const match = q.replace(",", ".").match(/[\d.]+/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return isFinite(n) && n > 0 ? n : null;
}

export function quantityUnit(q?: string | null, fallback?: string | null): string {
  if (q) {
    const unit = q.replace(",", ".").replace(/[\d.\s]+/, "").trim();
    if (unit) return unit;
  }
  return fallback || "kg";
}

export interface OfferPricing {
  total: number;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
}

/**
 * total = prix proposé (ou contre-offre). Le prix unitaire est déduit
 * de la quantité quand elle est exploitable, sinon on retombe sur le prix du lot.
 */
export function computeOfferPricing(opts: {
  proposedPrice?: number | null;
  counterOfferPrice?: number | null;
  quantity?: string | number | null;
  listingUnit?: string | null;
  listingPrice?: number | null;
}): OfferPricing {
  const total = Number(opts.counterOfferPrice ?? opts.proposedPrice ?? 0) || 0;
  const quantity = parseQuantity(opts.quantity);
  const unit = quantityUnit(typeof opts.quantity === "string" ? opts.quantity : null, opts.listingUnit);
  const unitPrice = quantity ? total / quantity : opts.listingPrice ?? null;
  return { total, quantity, unit, unitPrice };
}

export const fcfa = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
