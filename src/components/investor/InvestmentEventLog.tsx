import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History, CheckCircle2, PenLine, AlertTriangle, Bell, Loader2, FileSignature,
} from "lucide-react";

interface Props {
  transactionId: string;
}

interface Evt {
  id: string;
  at: string;
  kind: "milestone" | "signature" | "dispute" | "notification" | "status";
  title: string;
  detail?: string | null;
}

const iconOf = (k: Evt["kind"]) => {
  if (k === "milestone") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (k === "signature") return <PenLine className="w-4 h-4 text-primary" />;
  if (k === "dispute") return <AlertTriangle className="w-4 h-4 text-destructive" />;
  if (k === "status") return <FileSignature className="w-4 h-4 text-primary" />;
  return <Bell className="w-4 h-4 text-muted-foreground" />;
};

/** Centre de suivi : tout l'historique d'un investissement au même endroit. */
export function InvestmentEventLog({ transactionId }: Props) {
  const [events, setEvents] = useState<Evt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [tx, ms, sigs, disp, notifs] = await Promise.all([
      (supabase as any).from("transactions").select("*").eq("id", transactionId).maybeSingle(),
      (supabase as any)
        .from("transaction_milestones")
        .select("id,label,status,completed_at,amount,created_at")
        .eq("transaction_id", transactionId),
      (supabase as any)
        .from("contract_signatures")
        .select("id,signer_name,signer_role,signed_at")
        .eq("target_type", "transaction")
        .eq("target_id", transactionId),
      (supabase as any)
        .from("transaction_disputes")
        .select("id,reason,status,created_at,resolved_at,admin_decision")
        .eq("transaction_id", transactionId),
      (supabase as any)
        .from("notifications")
        .select("id,title,message,created_at,metadata")
        .contains("metadata", { transaction_id: transactionId })
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const out: Evt[] = [];
    const t = tx?.data;
    if (t) {
      out.push({
        id: `tx-${t.id}`,
        at: t.created_at,
        kind: "status",
        title: "Contrat créé",
        detail: `${t.title || "Investissement"} · ${Number(t.amount).toLocaleString("fr-FR")} ${t.currency}`,
      });
      if (t.signed_at)
        out.push({ id: `sg-${t.id}`, at: t.signed_at, kind: "status", title: "Contrat signé" });
      if (t.completed_at)
        out.push({ id: `cp-${t.id}`, at: t.completed_at, kind: "status", title: "Transaction terminée" });
      if (t.cancelled_at)
        out.push({ id: `cx-${t.id}`, at: t.cancelled_at, kind: "status", title: "Transaction annulée" });
    }
    (ms?.data || []).forEach((m: any) => {
      if (m.completed_at)
        out.push({
          id: `m-${m.id}`,
          at: m.completed_at,
          kind: "milestone",
          title: `Étape validée : ${m.label}`,
          detail: Number(m.amount) > 0 ? `${Number(m.amount).toLocaleString("fr-FR")} FCFA débloqués` : null,
        });
    });
    (sigs?.data || []).forEach((s: any) =>
      out.push({
        id: `s-${s.id}`,
        at: s.signed_at,
        kind: "signature",
        title: `Signature ${s.signer_role === "farmer" ? "agriculteur" : "investisseur"}`,
        detail: s.signer_name,
      }),
    );
    (disp?.data || []).forEach((d: any) => {
      out.push({ id: `d-${d.id}`, at: d.created_at, kind: "dispute", title: "Litige ouvert", detail: d.reason });
      if (d.resolved_at)
        out.push({
          id: `dr-${d.id}`,
          at: d.resolved_at,
          kind: "dispute",
          title: "Litige résolu",
          detail: d.admin_decision,
        });
    });
    (notifs?.data || []).forEach((n: any) =>
      out.push({ id: `n-${n.id}`, at: n.created_at, kind: "notification", title: n.title, detail: n.message }),
    );

    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setEvents(out);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`evtlog-${transactionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_milestones", filter: `transaction_id=eq.${transactionId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_disputes", filter: `transaction_id=eq.${transactionId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-primary" /> Centre de suivi
        </p>
        <Badge variant="secondary">{events.length} évènement(s)</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun évènement pour l'instant.</p>
      ) : (
        <div className="relative pl-5 space-y-3 before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
          {events.map((e) => (
            <div key={e.id} className="relative">
              <span className="absolute -left-5 top-0.5 bg-background">{iconOf(e.kind)}</span>
              <p className="text-sm font-medium leading-tight">{e.title}</p>
              {e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}
              <p className="text-[10px] text-muted-foreground">
                {new Date(e.at).toLocaleString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
