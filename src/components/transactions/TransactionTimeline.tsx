import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Shield, AlertTriangle } from "lucide-react";
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

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("transaction_milestones")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("order_index");
    setItems((data as Milestone[]) || []);
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

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setDisputeOpen(true)}>
          <AlertTriangle className="w-4 h-4 mr-1 text-destructive" /> Litige
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