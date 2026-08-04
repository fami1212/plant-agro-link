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
  // --- Contrôle d'accès : seules les parties au contrat ou un admin peuvent exporter ---
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error("Connexion requise pour télécharger le contrat");

  const { data: tx, error } = await (supabase as any)
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();
  if (error || !tx) throw new Error(error?.message || "Contrat introuvable");

  const isParty = tx.initiator_id === uid || tx.receiver_id === uid;
  let isAdmin = false;
  if (!isParty) {
    const { data: adminCheck } = await (supabase as any).rpc("has_role", {
      _user_id: uid,
      _role: "admin",
    });
    isAdmin = !!adminCheck;
  }
  if (!isParty && !isAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas partie à ce contrat");
  }

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
