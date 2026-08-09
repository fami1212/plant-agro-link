import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const anon = createClient(url, key, { auth: { persistSession: false } });

/** Un visiteur non authentifié ne doit jamais lire de données sensibles. */
const LOCKED_TABLES = [
  "kyc_verifications",
  "transactions",
  "transaction_milestones",
  "transaction_disputes",
  "contract_signatures",
  "user_roles",
  "profiles",
  "notifications",
  "investment_requests",
  "escrow_contracts",
] as const;

describe("RLS — accès anonyme", () => {
  it.each(LOCKED_TABLES)("%s ne renvoie aucune ligne à un anonyme", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(1);
    // Soit refus explicite, soit résultat vide : jamais de fuite de données.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("refuse l'insertion anonyme dans transactions", async () => {
    const { error } = await anon.from("transactions").insert({
      type: "PRODUCT_SALE",
      status: "DRAFT",
      initiator_id: "00000000-0000-0000-0000-000000000000",
      receiver_id: "00000000-0000-0000-0000-000000000000",
      amount: 1,
      currency: "XOF",
    } as never);
    expect(error).not.toBeNull();
  });

  it("refuse l'écriture anonyme d'un rôle (escalade de privilèges)", async () => {
    const { error } = await anon.from("user_roles").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    } as never);
    expect(error).not.toBeNull();
  });

  it("réserve le diagnostic RLS aux admins", async () => {
    const { error } = await anon.rpc("get_rls_diagnostic", { _table: "profiles" });
    expect(error).not.toBeNull();
  });
});

describe("RLS — surfaces publiques", () => {
  it("les annonces publiées restent lisibles sans compte", async () => {
    const { error } = await anon
      .from("marketplace_listings")
      .select("id,title,price")
      .eq("status", "publie")
      .limit(1);
    expect(error).toBeNull();
  });
});
