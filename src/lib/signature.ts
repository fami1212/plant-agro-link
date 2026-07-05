import { supabase } from "@/integrations/supabase/client";

export interface SignaturePayload {
  signer_name: string;
  signer_role?: string;
  ip_address?: string;
  user_agent: string;
  device: string;
  signed_at: string;
  contract_snapshot?: Record<string, unknown>;
}

/** Fetch public IP (fallback to null if offline). */
export async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.ip ?? null;
  } catch {
    return null;
  }
}

/** Build a signature payload capturing name, ip, device and timestamp. */
export async function buildSignature(
  signer_name: string,
  opts?: { signer_role?: string; contract_snapshot?: Record<string, unknown> },
): Promise<SignaturePayload> {
  const ip = await getClientIp();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const device =
    typeof navigator !== "undefined"
      ? /Mobi|Android/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop"
      : "unknown";
  return {
    signer_name,
    signer_role: opts?.signer_role,
    ip_address: ip ?? undefined,
    user_agent: ua,
    device,
    signed_at: new Date().toISOString(),
    contract_snapshot: opts?.contract_snapshot,
  };
}

/**
 * Persist a signature and attach it to a transaction/investment/request.
 * Returns the inserted signature id (or null on error).
 */
export async function saveSignature(
  userId: string,
  target_type:
    | "transaction"
    | "investment"
    | "investment_request"
    | "service_booking"
    | "marketplace_offer",
  target_id: string | null,
  signature: SignaturePayload,
): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from("contract_signatures")
    .insert({
      user_id: userId,
      target_type,
      target_id,
      signer_name: signature.signer_name,
      signer_role: signature.signer_role,
      ip_address: signature.ip_address,
      user_agent: signature.user_agent,
      device: signature.device,
      signed_at: signature.signed_at,
      contract_snapshot: signature.contract_snapshot ?? {},
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("saveSignature error", error);
    return null;
  }

  // Also mirror in the transaction metadata for quick display in timelines
  if (target_type === "transaction" && target_id) {
    const { data: tx } = await (supabase as any)
      .from("transactions")
      .select("metadata,signed_at")
      .eq("id", target_id)
      .maybeSingle();
    const meta = (tx?.metadata as Record<string, unknown>) || {};
    const existing = Array.isArray((meta as any).signatures)
      ? ((meta as any).signatures as unknown[])
      : [];
    await (supabase as any)
      .from("transactions")
      .update({
        signed_at: tx?.signed_at || signature.signed_at,
        metadata: { ...meta, signatures: [...existing, signature] },
      })
      .eq("id", target_id);
  }

  return data?.id ?? null;
}