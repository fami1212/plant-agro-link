import { describe, it, expect } from "vitest";
import { parseQuantity, quantityUnit, computeOfferPricing, fcfa } from "./offerPricing";

describe("parseQuantity", () => {
  it("extrait un nombre d'une chaîne", () => expect(parseQuantity("500 kg")).toBe(500));
  it("gère la virgule décimale", () => expect(parseQuantity("2,5 t")).toBe(2.5));
  it("rejette les valeurs vides ou nulles", () => {
    expect(parseQuantity(null)).toBeNull();
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("kg")).toBeNull();
    expect(parseQuantity(0)).toBeNull();
  });
});

describe("quantityUnit", () => {
  it("déduit l'unité de la quantité", () => expect(quantityUnit("500 sacs")).toBe("sacs"));
  it("retombe sur l'unité de l'annonce", () => expect(quantityUnit("500", "tonnes")).toBe("tonnes"));
  it("utilise kg par défaut", () => expect(quantityUnit(null, null)).toBe("kg"));
});

describe("computeOfferPricing", () => {
  it("calcule le prix unitaire à partir du total et de la quantité", () => {
    const p = computeOfferPricing({ proposedPrice: 250000, quantity: "500 kg" });
    expect(p.total).toBe(250000);
    expect(p.quantity).toBe(500);
    expect(p.unit).toBe("kg");
    expect(p.unitPrice).toBe(500);
  });
  it("la contre-offre prime sur le prix proposé", () => {
    expect(computeOfferPricing({ proposedPrice: 100, counterOfferPrice: 200 }).total).toBe(200);
  });
  it("retombe sur le prix de l'annonce sans quantité exploitable", () => {
    const p = computeOfferPricing({ proposedPrice: 1000, quantity: null, listingPrice: 750 });
    expect(p.unitPrice).toBe(750);
  });
  it("ne casse pas sans aucun prix", () => {
    expect(computeOfferPricing({}).total).toBe(0);
  });
});

describe("fcfa", () => {
  it("formate en FCFA arrondi", () => expect(fcfa(1234.6)).toMatch(/FCFA$/));
});
