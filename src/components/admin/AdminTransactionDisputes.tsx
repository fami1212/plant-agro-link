import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Scale, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Dispute {
  id: string;
  transaction_id: string;
  opened_by: string;
  reason: string;
  description: string | null;
  evidence_urls: string[];
  status: string;
  admin_decision: string | null;
  admin_notes: string | null;
  buyer_refund_percent: number;
  seller_payment_percent: number;
  created_at: string;
  transaction?: any;
}

export function AdminTransactionDisputes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [buyerPct, setBuyerPct] = useState(0);
  const [sellerPct, setSellerPct] = useState(100);
  const [status, setStatus] = useState("resolved_seller");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("transaction_disputes")
      .select("*, transaction:transactions(id,title,amount,currency,type,status,initiator_id,receiver_id)")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-disputes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_disputes" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const openArbitrage = (d: Dispute) => {
    setSelected(d);
    setDecision(d.admin_decision || "");
    setNotes(d.admin_notes || "");
    setBuyerPct(d.buyer_refund_percent || 0);
    setSellerPct(d.seller_payment_percent || 100);
    setStatus(d.status === "open" ? "resolved_seller" : d.status);
  };

  const submitDecision = async () => {
    if (!selected || !user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("transaction_disputes")
      .update({
        status,
        admin_id: user.id,
        admin_decision: decision,
        admin_notes: notes,
        buyer_refund_percent: buyerPct,
        seller_payment_percent: sellerPct,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Litige tranché — transaction mise à jour");
    setSelected(null);
    load();
  };

  const badgeColor = (s: string) => {
    if (s === "open") return "bg-red-500";
    if (s === "under_review") return "bg-orange-500";
    return "bg-green-500";
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucun litige à arbitrer.
        </Card>
      ) : (
        items.map((d) => (
          <Card key={d.id} className="p-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{d.reason}</p>
                  <Badge className={badgeColor(d.status)}>{d.status}</Badge>
                  {d.transaction && (
                    <Badge variant="outline">
                      {d.transaction.amount?.toLocaleString()} {d.transaction.currency}
                    </Badge>
                  )}
                </div>
                {d.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {d.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(d.created_at).toLocaleString()}
                </p>
                <Button size="sm" className="mt-2" onClick={() => openArbitrage(d)}>
                  <Scale className="w-4 h-4 mr-1" /> Arbitrer
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Arbitrage du litige</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <Card className="p-3 bg-muted/40">
                <p className="font-medium">{selected.reason}</p>
                {selected.description && <p className="text-sm mt-1">{selected.description}</p>}
                {selected.evidence_urls?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold">Preuves :</p>
                    {selected.evidence_urls.map((path) => (
                      <EvidenceLink key={path} path={path} />
                    ))}
                  </div>
                )}
              </Card>

              <div>
                <label className="text-sm font-medium">Décision *</label>
                <select
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => {
                    const v = e.target.value;
                    setStatus(v);
                    if (v === "resolved_buyer") { setBuyerPct(100); setSellerPct(0); }
                    if (v === "resolved_seller") { setBuyerPct(0); setSellerPct(100); }
                    if (v === "resolved_split") { setBuyerPct(50); setSellerPct(50); }
                    if (v === "cancelled") { setBuyerPct(100); setSellerPct(0); }
                  }}
                >
                  <option value="resolved_buyer">Rembourser 100% acheteur</option>
                  <option value="resolved_seller">Libérer 100% au vendeur</option>
                  <option value="resolved_split">Partager (personnalisé)</option>
                  <option value="cancelled">Annuler la transaction</option>
                </select>
              </div>

              {status === "resolved_split" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs">Remb. acheteur %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={buyerPct}
                      onChange={(e) => setBuyerPct(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs">Paie vendeur %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={sellerPct}
                      onChange={(e) => setSellerPct(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Décision (message aux parties)</label>
                <Textarea
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes internes admin</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button className="w-full" onClick={submitDecision} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider la décision"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EvidenceLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage
      .from("dispute-evidence")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => setUrl(data?.signedUrl || null));
  }, [path]);
  if (!url) return <span className="text-xs">…</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-primary hover:underline flex items-center gap-1"
    >
      <ExternalLink className="w-3 h-3" /> {path.split("/").pop()}
    </a>
  );
}