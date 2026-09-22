import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Wallet, CheckCircle2, Clock, Send, History } from "lucide-react";
import { toast } from "sonner";

interface Milestone {
  id: string;
  label: string;
  order_index: number;
  amount: number;
  amount_percent: number;
  status: string;
  completed_at: string | null;
}

interface PaymentEvent {
  at: string;
  amount: number;
  method: string;
  reference: string;
  kind: "funding" | "release";
}

interface Row {
  id: string;
  title: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  amount_locked: number;
  amount_released: number;
  trace_ref: string | null;
  initiator_id: string;
  receiver_id: string;
  metadata: any;
  initiator_name: string;
  receiver_name: string;
  milestones: Milestone[];
}

const METHODS = ["Wave", "Orange Money", "Free Money", "Virement bancaire"];

const fmt = (n: number, c: string) => `${Number(n || 0).toLocaleString()} ${c}`;

/** Journal des paiements réels : encaissements escrow, statut par étape, historique. */
export function AdminPaymentsLedger() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Row | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(METHODS[0]);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Row | null>(null);
  const [releaseMs, setReleaseMs] = useState<string>("");
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseRef, setReleaseRef] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: txs, error } = await (supabase as any)
      .from("transactions")
      .select("*")
      .eq("escrow_enabled", true)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (txs || []) as any[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = list.map((t) => t.id);
    const userIds = Array.from(new Set(list.flatMap((t) => [t.initiator_id, t.receiver_id])));
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
      .channel("admin-payments-ledger")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_milestones" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSim = (row: Row) => {
    setTarget(row);
    const remaining = Number(row.amount) - Number(row.amount_locked || 0);
    setAmount(String(remaining > 0 ? remaining : row.amount));
    setReference("SIM-" + Math.random().toString(36).slice(2, 8).toUpperCase());
    setMethod(METHODS[0]);
  };

  const simulatePayment = async () => {
    if (!target) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Montant invalide");
    setSaving(true);

    const event: PaymentEvent = {
      at: new Date().toISOString(),
      amount: amt,
      method,
      reference,
      kind: "funding",
    };
    const history: PaymentEvent[] = [...((target.metadata?.payments as PaymentEvent[]) || []), event];
    const locked = Number(target.amount_locked || 0) + amt;

    const { error } = await (supabase as any)
      .from("transactions")
      .update({
        amount_locked: locked,
        status: target.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        metadata: { ...(target.metadata || {}), payments: history },
      })
      .eq("id", target.id);

    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    // Marque l'étape d'acompte / première étape payante comme réglée
    const payable = target.milestones
      .filter((m) => Number(m.amount) > 0 && m.status !== "COMPLETED")
      .sort((a, b) => a.order_index - b.order_index)[0];
    if (payable && amt >= Number(payable.amount)) {
      await (supabase as any)
        .from("transaction_milestones")
        .update({ status: "IN_PROGRESS", notes: `Encaissé ${method} · ${reference}` })
        .eq("id", payable.id);
    }

    await (supabase as any).from("notifications").insert(
      [target.initiator_id, target.receiver_id].map((u) => ({
        user_id: u,
        type: "escrow_funded",
        title: "💳 Paiement reçu sous séquestre",
        message: `${fmt(amt, target.currency)} encaissés via ${method} (réf. ${reference}) pour « ${target.trace_ref || target.title || "transaction"} ».`,
        link: "/transactions",
        metadata: { transaction_id: target.id, reference, method, amount: amt },
      })),
    );

    setSaving(false);
    setTarget(null);
    toast.success(`Paiement enregistré : ${fmt(amt, target.currency)}`);
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.locked += Number(r.amount_locked || 0);
      acc.released += Number(r.amount_released || 0);
      acc.total += Number(r.amount || 0);
      return acc;
    },
    { locked: 0, released: 0, total: 0 },
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Volume total</p>
          <p className="font-bold">{totals.total.toLocaleString()} XOF</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Encaissé (séquestre)</p>
          <p className="font-bold">{totals.locked.toLocaleString()} XOF</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Versé</p>
          <p className="font-bold">{totals.released.toLocaleString()} XOF</p>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Historique des paiements réels et statut étape par étape.
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualiser
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Aucune transaction escrow.</Card>
      ) : (
        rows.map((row) => {
          const payments: PaymentEvent[] = (row.metadata?.payments as PaymentEvent[]) || [];
          const fundedPct = Math.min(
            100,
            Math.round((Number(row.amount_locked || 0) / (Number(row.amount) || 1)) * 100),
          );
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
                  <p className="text-sm font-semibold mt-1">{fmt(row.amount, row.currency)}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Encaissé sous séquestre</span>
                  <span>
                    {fundedPct}% · {fmt(row.amount_locked, row.currency)}
                  </span>
                </div>
                <Progress value={fundedPct} className="h-2" />
              </div>

              <div className="grid gap-1">
                {row.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 text-xs border rounded-lg px-2 py-1.5"
                  >
                    <span className="truncate">
                      {m.order_index}. {m.label}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground">
                        {Number(m.amount) > 0 ? fmt(m.amount, row.currency) : "—"}
                      </span>
                      {m.status === "COMPLETED" ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Versé
                        </Badge>
                      ) : m.status === "IN_PROGRESS" ? (
                        <Badge className="bg-amber-500">
                          <Clock className="w-3 h-3 mr-1" /> Encaissé
                        </Badge>
                      ) : (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {payments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Historique des encaissements</p>
                  {payments.map((p, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {new Date(p.at).toLocaleString("fr-FR")} · {fmt(p.amount, row.currency)} ·{" "}
                      {p.method} · réf. {p.reference}
                    </p>
                  ))}
                </div>
              )}

              <Button size="sm" variant="outline" onClick={() => openSim(row)}>
                <Wallet className="w-4 h-4 mr-1" /> Enregistrer un paiement
              </Button>
            </Card>
          );
        })
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{target?.title}</p>
            <div>
              <Label>Montant ({target?.currency})</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Moyen de paiement</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Référence</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Annuler</Button>
            <Button onClick={simulatePayment} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
