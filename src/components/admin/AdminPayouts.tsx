import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BanknoteIcon, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Milestone {
  id: string;
  label: string;
  order_index: number;
  amount: number;
  amount_percent: number;
  status: string;
  validator_role: string;
}

interface Row {
  id: string;
  title: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  amount_released: number;
  trace_ref: string | null;
  initiator_id: string;
  receiver_id: string;
  initiator_name: string;
  receiver_name: string;
  milestones: Milestone[];
}

/** Admin payout console: release escrow funds milestone by milestone. */
export function AdminPayouts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: txs } = await (supabase as any)
      .from("transactions")
      .select("*")
      .eq("escrow_enabled", true)
      .in("status", ["SIGNED", "IN_PROGRESS", "CONTRACT_PENDING", "COMPLETED"])
      .order("created_at", { ascending: false })
      .limit(60);
    const list = (txs || []) as any[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = list.map((t) => t.id);
    const userIds = Array.from(
      new Set(list.flatMap((t) => [t.initiator_id, t.receiver_id])),
    );
    const [{ data: ms }, { data: profiles }] = await Promise.all([
      (supabase as any)
        .from("transaction_milestones")
        .select("*")
        .in("transaction_id", ids)
        .order("order_index"),
      supabase.from("profiles").select("user_id,full_name").in("user_id", userIds),
    ]);
    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
    const msMap = new Map<string, Milestone[]>();
    ((ms || []) as any[]).forEach((m) => {
      const arr = msMap.get(m.transaction_id) || [];
      arr.push(m);
      msMap.set(m.transaction_id, arr);
    });
    setRows(
      list.map((t) => ({
        ...t,
        initiator_name: pMap.get(t.initiator_id) || "Utilisateur",
        receiver_name: pMap.get(t.receiver_id) || "Utilisateur",
        milestones: msMap.get(t.id) || [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-payouts")
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_milestones" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const release = async (row: Row, m: Milestone) => {
    setBusy(m.id);
    const { error } = await (supabase as any)
      .from("transaction_milestones")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", m.id);
    if (error) {
      setBusy(null);
      return toast.error(error.message);
    }
    const released = Number(row.amount_released || 0) + Number(m.amount || 0);
    const allDone = row.milestones.every((x) => x.id === m.id || x.status === "COMPLETED");
    await (supabase as any)
      .from("transactions")
      .update({
        amount_released: released,
        status: allDone ? "COMPLETED" : "IN_PROGRESS",
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq("id", row.id);
    await (supabase as any).from("notifications").insert(
      [row.initiator_id, row.receiver_id].map((u) => ({
        user_id: u,
        type: "escrow_release",
        title: "💸 Paiement libéré",
        message: `${Number(m.amount).toLocaleString()} ${row.currency} libérés — étape « ${m.label} » (${row.trace_ref || row.title || "transaction"}).`,
        link: "/transactions",
        metadata: { transaction_id: row.id, milestone_id: m.id },
      })),
    );
    setBusy(null);
    toast.success(`Paiement libéré : ${Number(m.amount).toLocaleString()} ${row.currency}`);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Libération des fonds sous séquestre, étape par étape.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune transaction sous séquestre.
        </Card>
      ) : (
        rows.map((row) => {
          const total = row.milestones.reduce((s, m) => s + Number(m.amount_percent || 0), 0) || 100;
          const done = row.milestones
            .filter((m) => m.status === "COMPLETED")
            .reduce((s, m) => s + Number(m.amount_percent || 0), 0);
          const pct = Math.round((done / total) * 100);
          return (
            <Card key={row.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold">{row.title || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.initiator_name} → {row.receiver_name}
                    {row.trace_ref ? ` · ${row.trace_ref}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{row.status}</Badge>
                  <p className="text-sm font-semibold mt-1">
                    {Number(row.amount).toLocaleString()} {row.currency}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Fonds libérés</span>
                  <span>
                    {pct}% · {Number(row.amount_released || 0).toLocaleString()} {row.currency}
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>

              <div className="space-y-2">
                {row.milestones.map((m) => {
                  const completed = m.status === "COMPLETED";
                  const releasable = !completed && Number(m.amount) > 0;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 text-sm border rounded-lg p-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate">
                          {m.order_index}. {m.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(m.amount).toLocaleString()} {row.currency} · {m.amount_percent}% ·{" "}
                          {m.validator_role}
                        </p>
                      </div>
                      {completed ? (
                        <Badge className="bg-green-600 shrink-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Libéré
                        </Badge>
                      ) : releasable ? (
                        <Button
                          size="sm"
                          className="shrink-0"
                          disabled={busy === m.id}
                          onClick={() => release(row, m)}
                        >
                          {busy === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <BanknoteIcon className="w-4 h-4 mr-1" /> Libérer le paiement
                            </>
                          )}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          Étape sans montant
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
