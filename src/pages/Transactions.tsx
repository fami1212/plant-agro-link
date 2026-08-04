import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Package, Sprout, Stethoscope, ExternalLink, Download } from "lucide-react";
import { TransactionTimeline } from "@/components/transactions/TransactionTimeline";
import { downloadContractPDF, traceRefOf } from "@/services/contractExport";
import { cacheEscrow, readEscrowCache, escrowScopes } from "@/services/escrowOfflineCache";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

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
  updated_at?: string;
  amount_released?: number;
  trace_ref?: string | null;
}

const typeMeta: Record<string, { icon: any; label: string; color: string }> = {
  PRODUCT_SALE: { icon: Package, label: "Vente produit", color: "bg-blue-500" },
  INVESTMENT: { icon: Sprout, label: "Investissement", color: "bg-emerald-500" },
  VET_SERVICE: { icon: Stethoscope, label: "Service vétérinaire", color: "bg-purple-500" },
};

const STATUS_FILTERS: Record<string, string[]> = {
  all: [],
  accepted: ["SIGNED", "CONTRACT_PENDING"],
  ongoing: ["IN_PROGRESS"],
  done: ["COMPLETED"],
};

const releasedPercent = (t: Tx) =>
  t.amount > 0 ? Math.round(((Number(t.amount_released) || 0) / Number(t.amount)) * 100) : 0;

export default function Transactions() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Tx | null>(null);
  const [side, setSide] = useState<"all" | "buy" | "sell">("all");
  const [status, setStatus] = useState<keyof typeof STATUS_FILTERS>("all");
  const [sort, setSort] = useState<"deadline" | "released">("deadline");
  const [exporting, setExporting] = useState<string | null>(null);
  const [offlineAt, setOfflineAt] = useState<string | null>(null);

  const handleExport = async (id: string) => {
    setExporting(id);
    try {
      await downloadContractPDF(id);
      toast.success("Contrat exporté en PDF");
    } catch (e: any) {
      toast.error(e?.message || "Export impossible");
    } finally {
      setExporting(null);
    }
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const cached = readEscrowCache<Tx[]>(escrowScopes.list(user.id));
    if (cached) {
      setRows(cached.data || []);
      setLoading(false);
    }
    if (!navigator.onLine) {
      setOfflineAt(cached?.cachedAt || null);
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("transactions")
      .select("*")
      .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const fresh = (data as Tx[]) || [];
    setRows(fresh);
    setOfflineAt(null);
    cacheEscrow(escrowScopes.list(user.id), fresh);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const onOnline = () => load();
    window.addEventListener("online", onOnline);
    const ch = supabase
      .channel(`tx-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const visible = rows
    .filter((t) => {
      if (side === "buy" && t.initiator_id !== user?.id) return false;
      if (side === "sell" && t.receiver_id !== user?.id) return false;
      const allowed = STATUS_FILTERS[status];
      if (allowed.length && !allowed.includes(t.status)) return false;
      return true;
    })
    .sort((a, b) =>
      sort === "released"
        ? releasedPercent(b) - releasedPercent(a)
        : new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
    );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-3 space-y-4">
        <PageHeader title="Mes transactions" subtitle="Suivi contractuel unifié" />

        {offlineAt && (
          <Card className="p-2 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/5 border-amber-500/30">
            <WifiOff className="w-3.5 h-3.5" />
            Mode hors ligne — étapes et % débloqués issus de la dernière synchro (
            {new Date(offlineAt).toLocaleString()})
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={side} onValueChange={(v) => setSide(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="buy">Mes achats / demandes</SelectItem>
              <SelectItem value="sell">Mes ventes / offres</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="accepted">Accepté</SelectItem>
              <SelectItem value="ongoing">En cours</SelectItem>
              <SelectItem value="done">Terminé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Tri : échéance récente</SelectItem>
              <SelectItem value="released">Tri : % débloqué</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucune transaction pour ces filtres.
          </Card>
        ) : (
          <div className="space-y-2">
            {visible.map((t) => {
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
                        <Badge variant="outline" className="text-[10px] font-mono">{traceRefOf(t)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.amount.toLocaleString()} {t.currency} · {new Date(t.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={releasedPercent(t)} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {releasedPercent(t)}% débloqué
                        </span>
                      </div>
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
                    <div className="col-span-2"><span className="text-muted-foreground">Traçabilité :</span> <b className="font-mono">{traceRefOf(selected)}</b></div>
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

                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={exporting === selected.id}
                  onClick={() => handleExport(selected.id)}
                >
                  {exporting === selected.id
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Download className="w-4 h-4 mr-2" />}
                  Télécharger le contrat (PDF)
                </Button>

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