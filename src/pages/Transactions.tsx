import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Package, Sprout, Stethoscope, ExternalLink } from "lucide-react";
import { TransactionTimeline } from "@/components/transactions/TransactionTimeline";

interface Tx {
  id: string;
  type: "PRODUCT_SALE" | "INVESTMENT" | "VET_SERVICE";
  status: string;
  amount: number;
  currency: string;
  title: string | null;
  initiator_id: string;
  receiver_id: string;
  contract_blockchain_tx: string | null;
  created_at: string;
}

const typeMeta: Record<string, { icon: any; label: string; color: string }> = {
  PRODUCT_SALE: { icon: Package, label: "Vente produit", color: "bg-blue-500" },
  INVESTMENT: { icon: Sprout, label: "Investissement", color: "bg-emerald-500" },
  VET_SERVICE: { icon: Stethoscope, label: "Service vétérinaire", color: "bg-purple-500" },
};

export default function Transactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tx | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("transactions")
      .select("*")
      .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setRows((data as Tx[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`tx-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-3 space-y-4">
        <PageHeader title="Mes transactions" subtitle="Suivi contractuel unifié" />

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune transaction pour le moment.
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((t) => {
              const meta = typeMeta[t.type];
              const Icon = meta.icon;
              const isInitiator = t.initiator_id === user?.id;
              return (
                <Card
                  key={t.id}
                  className="p-3 cursor-pointer hover:bg-accent/50 transition"
                  onClick={() => setSelected(t)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${meta.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{t.title || meta.label}</p>
                        <Badge variant="outline" className="text-xs">{t.status}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {isInitiator ? "Vous → contrepartie" : "Contrepartie → vous"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.amount.toLocaleString()} {t.currency} · {new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selected ? (typeMeta[selected.type]?.label + " — " + (selected.title || "")) : ""}
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <Card className="p-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Montant :</span> <b>{selected.amount.toLocaleString()} {selected.currency}</b></div>
                    <div><span className="text-muted-foreground">Statut :</span> {selected.status}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Créée :</span> {new Date(selected.created_at).toLocaleString()}</div>
                  </div>
                  {selected.contract_blockchain_tx && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${selected.contract_blockchain_tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                    >
                      Voir contrat sur Polygonscan <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </Card>

                <TransactionTimeline
                  transactionId={selected.id}
                  currentUserIsInitiator={selected.initiator_id === user?.id}
                  currency={selected.currency}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}