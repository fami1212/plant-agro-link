import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const anon = createClient(url, key, { auth: { persistSession: false } });
const ZERO = "00000000-0000-0000-0000-000000000000";

describe("KYC — règles de sécurité", () => {
  it("un anonyme ne peut pas créer de dossier KYC", async () => {
    const { error } = await anon.from("kyc_verifications").insert({ user_id: ZERO } as never);
    expect(error).not.toBeNull();
  });

  it("un anonyme ne peut pas se valider lui-même (statut approved)", async () => {
    const { data } = await anon
      .from("kyc_verifications")
      .update({ status: "approved" } as never)
      .eq("user_id", ZERO)
      .select();
    expect((data ?? []).length).toBe(0);
  });

  it("la liste des doublons de pièces est réservée aux admins", async () => {
    const { data, error } = await anon.rpc("get_kyc_duplicate_groups");
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("un anonyme ne peut pas lire les documents d'identité stockés", async () => {
    const { data } = await anon.storage.from("kyc-documents").list("", { limit: 1 });
    expect((data ?? []).length).toBe(0);
  });
});
