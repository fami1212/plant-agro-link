import { describe, it, expect } from "vitest";
import { releasedPercent, nextMilestone, canValidate, type Milestone } from "./escrow";

const productSale = (): Milestone[] => [
  { id: "1", order_index: 1, status: "COMPLETED", amount_percent: 0, validator_role: "seller" },
  { id: "2", order_index: 2, status: "COMPLETED", amount_percent: 30, validator_role: "buyer" },
  { id: "3", order_index: 3, status: "PENDING", amount_percent: 0, validator_role: "seller" },
  { id: "4", order_index: 4, status: "PENDING", amount_percent: 0, validator_role: "buyer" },
  { id: "5", order_index: 5, status: "PENDING", amount_percent: 70, validator_role: "admin" },
];

describe("releasedPercent", () => {
  it("renvoie 0 sans jalon", () => expect(releasedPercent([])).toBe(0));
  it("calcule le pourcentage débloqué", () => expect(releasedPercent(productSale())).toBe(30));
  it("renvoie 100 quand tout est terminé", () => {
    const all = productSale().map((m) => ({ ...m, status: "COMPLETED" as const }));
    expect(releasedPercent(all)).toBe(100);
  });
});

describe("nextMilestone", () => {
  it("prend la première étape non terminée dans l'ordre", () => {
    expect(nextMilestone(productSale())?.id).toBe("3");
  });
  it("ignore les étapes sautées", () => {
    const ms = productSale().map((m) => (m.id === "3" ? { ...m, status: "SKIPPED" as const } : m));
    expect(nextMilestone(ms)?.id).toBe("4");
  });
  it("renvoie null quand tout est terminé", () => {
    expect(nextMilestone(productSale().map((m) => ({ ...m, status: "COMPLETED" as const })))).toBeNull();
  });
});

describe("canValidate", () => {
  const ms = productSale();
  it("autorise le rôle attendu sur l'étape courante", () =>
    expect(canValidate(ms, "3", "seller")).toBe(true));
  it("refuse un autre rôle", () => expect(canValidate(ms, "3", "buyer")).toBe(false));
  it("refuse une étape future", () => expect(canValidate(ms, "5", "admin")).toBe(false));
  it("refuse hors ligne", () =>
    expect(canValidate(ms, "3", "seller", { online: false })).toBe(false));
  it("refuse en litige", () =>
    expect(canValidate(ms, "3", "seller", { disputed: true })).toBe(false));
  it("l'admin peut valider l'étape courante quel que soit le rôle validateur", () =>
    expect(canValidate(ms, "3", "admin")).toBe(true));
});
