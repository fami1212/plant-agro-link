import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  title: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  initiator_id: string;
  receiver_id: string;
  created_at: string;
  metadata: Record<string, any> | null;
  initiator_name?: string;
  receiver_name?: string;
  signatures?: Array<{
    user_id: string;
    signer_name: string;
    signer_role: string | null;
    signed_at: string;
    ip_address: string | null;
    device: string | null;
  }>;
}

export function AdminContracts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: txs } = await (supabase as any)
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const list = (txs || []) as Row[];
    const ids = list.map((t) => t.id);
    const userIds = Array.from(new Set(list.flatMap((t) => [t.initiator_id, t.receiver_id])));

    const [{ data: sigs }, { data: profiles }] = await Promise.all([
      ids.length
        ? (supabase as any)
            .from("contract_signatures")
            .select("*")
            .eq("target_type", "transaction")
            .in("target_id", ids)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from("profiles").select("user_id,full_name").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
    const sMap = new Map<string, any[]>();
    (sigs || []).forEach((s: any) => {
      sMap.set(s.target_id, [...(sMap.get(s.target_id) || []), s]);
    });

    setRows(
      list.map((t) => ({
        ...t,
        initiator_name: pMap.get(t.initiator_id) || "Utilisateur",
        receiver_name: pMap.get(t.receiver_id) || "Utilisateur",
        signatures: sMap.get(t.id) || [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-contracts")
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_signatures" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const activate = async (r: Row) => {
    const { error } = await (supabase as any)
      .from("transactions")
      .update({ status: "IN_PROGRESS" })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Contrat activé — escrow en cours");
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Suivi des contrats et preuves de signature (nom, date, IP, appareil).
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Rafraîchir
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Aucun contrat.</Card>
      ) : (
        rows.map((r) => {
          const count = r.signatures?.length || 0;
          return (
            <Card key={r.id} className="p-3 space-y-2">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{r.title || r.type}</p>
                    <Badge variant="outline">{r.type}</Badge>
                    <Badge>{r.status}</Badge>
                    <Badge className={count >= 2 ? "bg-green-600" : "bg-amber-500"}>
                      {count}/2 signature(s)
                    </Badge>
                    <Badge variant="secondary">
                      {r.amount.toLocaleString()} {r.currency}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.initiator_name} → {r.receiver_name} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                  {count > 0 && (
                    <div className="text-xs bg-muted/40 rounded p-2 space-y-1">
                      {r.signatures!.map((s) => (
                        <p key={s.signed_at + s.user_id} className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-green-600" />
                          <b>{s.signer_name}</b>
                          {s.signer_role ? ` (${s.signer_role})` : ""} ·{" "}
                          {new Date(s.signed_at).toLocaleString()} · IP{" "}
                          {s.ip_address || "n/c"} · {s.device || "n/c"}
                        </p>
                      ))}
                    </div>
                  )}
                  {count >= 2 && r.status !== "IN_PROGRESS" && r.status !== "COMPLETED" && (
                    <Button size="sm" onClick={() => activate(r)}>
                      Activer l'escrow
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}