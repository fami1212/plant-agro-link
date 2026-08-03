import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileSignature, CheckCircle2, Clock, Inbox } from "lucide-react";

interface Tx {
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
}

const TYPE_LABEL: Record<string, string> = {
  INVESTMENT: "Investissement",
  PRODUCT_SALE: "Vente produit",
  VET_SERVICE: "Service vétérinaire",
};

/** Liste des contrats de l'utilisateur : à signer vs signés. */
export function MyContractsList({ types }: { types?: string[] }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Tx[]>([]);
  const [mySigned, setMySigned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    let q = (supabase as any)
      .from("transactions")
      .select("*")
      .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (types?.length) q = q.in("type", types);
    const { data } = await q;
    const list = (data || []) as Tx[];
    setRows(list);

    const { data: sigs } = await (supabase as any)
      .from("contract_signatures")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_type", "transaction");
    setMySigned(new Set((sigs || []).map((s: any) => s.target_id)));
    setLoading(false);
  }, [user, types?.join(",")]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`my-contracts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, user?.id]);

  const sigCount = (t: Tx) =>
    Array.isArray(t.metadata?.signatures) ? t.metadata!.signatures.length : 0;

  const state = (t: Tx) => {
    const mine = mySigned.has(t.id);
    const both = sigCount(t) >= 2 || t.status === "SIGNED" || t.status === "IN_PROGRESS" || t.status === "COMPLETED";
    if (both) return { key: "signed", label: "Contrat signé", cls: "bg-green-600", Icon: CheckCircle2 };
    if (mine) return { key: "waiting", label: "En attente de l'autre partie", cls: "bg-blue-500", Icon: Clock };
    return { key: "tosign", label: "À signer", cls: "bg-amber-500", Icon: FileSignature };
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  if (rows.length === 0)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Aucun contrat pour l'instant.
      </Card>
    );

  const toSign = rows.filter((r) => state(r).key !== "signed");
  const signed = rows.filter((r) => state(r).key === "signed");

  const renderCard = (t: Tx) => {
    const s = state(t);
    return (
      <Card key={t.id} className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="font-semibold flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              {t.title || TYPE_LABEL[t.type] || "Contrat"}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.created_at).toLocaleString()}
            </p>
          </div>
          <Badge className={s.cls}>
            <s.Icon className="w-3 h-3 mr-1" />
            {s.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Badge variant="outline">
            {t.amount.toLocaleString()} {t.currency}
          </Badge>
          <Badge variant="secondary">{TYPE_LABEL[t.type] || t.type}</Badge>
          <Badge variant="secondary">{sigCount(t)}/2 signature(s)</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={s.key === "tosign" ? "default" : "outline"}
            onClick={() => navigate(`/contract/${t.id}`)}
          >
            {s.key === "tosign" ? "Signer le contrat" : "Voir le contrat"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/transactions")}>
            Suivi & escrow
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {toSign.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            À signer / en attente ({toSign.length})
          </p>
          {toSign.map(renderCard)}
        </div>
      )}
      {signed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Contrats signés ({signed.length})
          </p>
          {signed.map(renderCard)}
        </div>
      )}
    </div>
  );
}