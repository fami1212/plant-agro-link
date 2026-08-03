import { supabase } from "@/integrations/supabase/client";
import { generateContractPDF } from "./pdfService";

const TYPE_LABEL: Record<string, string> = {
  INVESTMENT: "Investissement",
  PRODUCT_SALE: "Vente produit",
  VET_SERVICE: "Service vétérinaire",
};

/** Identifiant de traçabilité lisible d'une transaction. */
export function traceRefOf(tx: { id: string; trace_ref?: string | null }) {
  return tx.trace_ref || `PLT-${tx.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

/** Récupère toutes les données du contrat et déclenche le téléchargement du PDF. */
export async function downloadContractPDF(transactionId: string) {
  const { data: tx, error } = await (supabase as any)
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !tx) throw new Error(error?.message || "Contrat introuvable");

  const [{ data: sigs }, { data: ms }, { data: profiles }] = await Promise.all([
    (supabase as any)
      .from("contract_signatures")
      .select("signer_name,signer_role,signed_at,ip_address,device")
      .eq("target_type", "transaction")
      .eq("target_id", transactionId)
      .order("signed_at"),
    (supabase as any)
      .from("transaction_milestones")
      .select("label,amount,amount_percent,status,completed_at")
      .eq("transaction_id", transactionId)
      .order("order_index"),
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .in("user_id", [tx.initiator_id, tx.receiver_id]),
  ]);

  const nameOf = (id: string) =>
    (profiles || []).find((p: any) => p.user_id === id)?.full_name || "Utilisateur";

  generateContractPDF({
    traceRef: traceRefOf(tx),
    transactionId: tx.id,
    type: TYPE_LABEL[tx.type] || tx.type,
    title: tx.title || "",
    amount: Number(tx.amount || 0),
    currency: tx.currency || "XOF",
    status: tx.status,
    createdAt: tx.created_at,
    parties: [
      { role: "Initiateur", name: nameOf(tx.initiator_id) },
      { role: "Contrepartie", name: nameOf(tx.receiver_id) },
    ],
    signatures: (sigs as any[]) || [],
    milestones: (ms as any[]) || [],
    blockchainTx: tx.contract_blockchain_tx,
  });
}
