import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Shield, AlertTriangle, Scale } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { DisputeDialog } from "./DisputeDialog";

interface Milestone {
  id: string;
  order_index: number;
  label: string;
  description: string | null;
  amount: number;
  amount_percent: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";
  validator_role: string;
  completed_at: string | null;
  proof_url: string | null;
}

interface TransactionTimelineProps {
  transactionId: string;
  currentUserIsInitiator: boolean;
  currency?: string;
}

/**
 * Visual "package tracking" timeline for any unified transaction.
 * Buyer / seller / admin can advance the milestone they are responsible for
 * (see validator_role). Amounts unlock progressively as milestones complete.
 */
export function TransactionTimeline({
  transactionId,
  currentUserIsInitiator,
  currency = "XOF",
}: TransactionTimelineProps) {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [dispute, setDispute] = useState<{
    id: string;
    status: string;
    reason: string;
    admin_decision: string | null;
    buyer_refund_percent: number;
    seller_payment_percent: number;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: d }] = await Promise.all([
      (supabase as any)
      .from("transaction_milestones")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("order_index"),
      (supabase as any)
        .from("transaction_disputes")
        .select("id,status,reason,admin_decision,buyer_refund_percent,seller_payment_percent")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setItems((data as Milestone[]) || []);
    setDispute((d as any) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`tx-timeline-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_milestones",
          filter: `transaction_id=eq.${transactionId}`,
        },
        load,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_disputes",
          filter: `transaction_id=eq.${transactionId}`,
        },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const canValidate = (m: Milestone) => {
    if (m.status === "COMPLETED") return false;
    if (hasRole("admin")) return true;
    if (m.validator_role === "buyer") return currentUserIsInitiator;
    if (m.validator_role === "seller") return !currentUserIsInitiator;
    return false;
  };

  const markDone = async (m: Milestone) => {
    setUpdatingId(m.id);
    const { error } = await (supabase as any)
      .from("transaction_milestones")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", m.id);
    setUpdatingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Étape "${m.label}" validée`);
  };

  if (loading)
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );

  if (items.length === 0)
    return (
      <Card className="p-4 text-sm text-muted-foreground text-center">
        Aucune étape définie pour cette transaction.
      </Card>
    );

  const doneCount = items.filter((m) => m.status === "COMPLETED").length;
  const percent = Math.round((doneCount / items.length) * 100);
  const unlockedAmount = items
    .filter((m) => m.status === "COMPLETED")
    .reduce((s, m) => s + Number(m.amount || 0), 0);
  const totalAmount = items.reduce((s, m) => s + Number(m.amount || 0), 0);

  const disputeBanner = dispute && (
    <Card
      className={`p-3 border ${
        dispute.status.startsWith("resolved")
          ? "bg-green-500/5 border-green-500/30"
          : "bg-destructive/5 border-destructive/40"
      }`}
    >
      <div className="flex items-start gap-2">
        {dispute.status.startsWith("resolved") ? (
          <Scale className="w-4 h-4 mt-0.5 text-green-600" />
        ) : (
          <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive" />
        )}
        <div className="flex-1 text-sm">
          <p className="font-semibold">
            {dispute.status === "open" || dispute.status === "under_review"
              ? "Litige en cours"
              : "Litige résolu"}
          </p>
          <p className="text-xs text-muted-foreground">{dispute.reason}</p>
          {dispute.admin_decision && (
            <p className="text-xs mt-1">
              <b>Décision admin :</b> {dispute.admin_decision}
              {" — "}Remboursement acheteur {dispute.buyer_refund_percent}% / paiement vendeur{" "}
              {dispute.seller_payment_percent}%.
            </p>
          )}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs mt-1"
            onClick={() => setDisputeOpen(true)}
          >
            Voir le détail du litige
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-3">
      {/* Overall progress */}
      <Card className="p-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium">Progression contrat</span>
          <span className="text-muted-foreground">
            {doneCount}/{items.length} étapes · {percent}%
          </span>
        </div>
        <Progress value={percent} className="h-2" />
        {totalAmount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            <b>{unlockedAmount.toLocaleString()}</b> {currency} libérés sur{" "}
            {totalAmount.toLocaleString()} {currency}
          </p>
        )}
      </Card>

      {disputeBanner}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setDisputeOpen(true)}>
          <AlertTriangle className="w-4 h-4 mr-1 text-destructive" />{" "}
          {dispute ? "Suivre le litige" : "Ouvrir un litige"}
        </Button>
      </div>
      {items.map((m, i) => {
        const done = m.status === "COMPLETED";
        return (
          <Card key={m.id} className={`p-3 ${done ? "bg-green-500/5 border-green-500/30" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Étape {i + 1}</span>
                  <p className="font-medium">{m.label}</p>
                  {m.amount_percent > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {m.amount_percent}% — {m.amount.toLocaleString()} {currency}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    Validé par : {m.validator_role}
                  </Badge>
                </div>
                {m.completed_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✓ {new Date(m.completed_at).toLocaleString()}
                  </p>
                )}
                {canValidate(m) && (
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={updatingId === m.id}
                    onClick={() => markDone(m)}
                  >
                    {updatingId === m.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-1" /> Valider cette étape
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      <DisputeDialog transactionId={transactionId} open={disputeOpen} onOpenChange={setDisputeOpen} />
    </div>
  );
}