import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2,
  Paperclip, Scale, Send, XCircle, Wallet,
} from "lucide-react";
import { DisputeDialog } from "@/components/transactions/DisputeDialog";

interface Dispute {
  id: string;
  transaction_id: string;
  reason: string;
  description: string | null;
  evidence_urls: string[];
  status: string;
  admin_decision: string | null;
  admin_notes: string | null;
  buyer_refund_percent: number;
  seller_payment_percent: number;
  resolved_at: string | null;
  created_at: string;
  opened_by: string;
}

interface Msg {
  id: string;
  sender_id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Ouvert",
  under_review: "En arbitrage",
  resolved_buyer: "Résolu — remboursement acheteur",
  resolved_seller: "Résolu — paiement vendeur",
  resolved_split: "Résolu — partage",
  cancelled: "Annulé",
};

export default function DisputePage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<any>(null);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [evidence, setEvidence] = useState<{ path: string; url: string }[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const load = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    const [{ data: t }, { data: d }, { data: ms }] = await Promise.all([
      (supabase as any).from("transactions").select("*").eq("id", transactionId).maybeSingle(),
      (supabase as any)
        .from("transaction_disputes")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from("transaction_milestones")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("order_index"),
    ]);
    setTx(t);
    setDispute(d || null);
    setMilestones(ms || []);

    if (d) {
      const { data: msgs } = await (supabase as any)
        .from("transaction_dispute_messages")
        .select("*")
        .eq("dispute_id", d.id)
        .order("created_at");
      setMessages(msgs || []);

      const paths: string[] = d.evidence_urls || [];
      const signed = await Promise.all(
        paths.map(async (p) => {
          const { data: s } = await supabase.storage.from("dispute-evidence").createSignedUrl(p, 3600);
          return { path: p, url: s?.signedUrl || "" };
        }),
      );
      setEvidence(signed.filter((s) => s.url));
    }
    setLoading(false);
  }, [transactionId]);

  useEffect(() => {
    load();
    if (!transactionId) return;
    const ch = supabase
      .channel(`dispute-page-${transactionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_disputes", filter: `transaction_id=eq.${transactionId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_dispute_messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, transactionId]);

  const sendMsg = async () => {
    if (!newMsg.trim() || !dispute || !user) return;
    await (supabase as any).from("transaction_dispute_messages").insert({
      dispute_id: dispute.id,
      sender_id: user.id,
      message: newMsg,
    });
    setNewMsg("");
  };

  const totalAmount = Number(tx?.amount || 0);
  const releasedPercent = milestones.length
    ? Math.round(
        (100 * milestones.filter((m) => m.status === "COMPLETED").reduce((s, m) => s + Number(m.amount_percent || 0), 0)) /
          Math.max(1, milestones.reduce((s, m) => s + Number(m.amount_percent || 0), 0)),
      )
    : 0;

  const impact = (() => {
    if (!dispute) return null;
    switch (dispute.status) {
      case "resolved_buyer":
        return {
          tone: "bg-destructive/10 border-destructive/30",
          icon: <XCircle className="w-4 h-4 text-destructive" />,
          text: `Paiement au vendeur ANNULÉ. ${Math.round((totalAmount * (dispute.buyer_refund_percent ?? 100)) / 100).toLocaleString()} ${tx?.currency} remboursés à l'acheteur (${dispute.buyer_refund_percent ?? 100}%).`,
        };
      case "resolved_seller":
        return {
          tone: "bg-green-500/10 border-green-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          text: `Paiement LIBÉRÉ au vendeur : ${Math.round((totalAmount * (dispute.seller_payment_percent ?? 100)) / 100).toLocaleString()} ${tx?.currency} (${dispute.seller_payment_percent ?? 100}%).`,
        };
      case "resolved_split":
        return {
          tone: "bg-amber-500/10 border-amber-500/30",
          icon: <Scale className="w-4 h-4 text-amber-600" />,
          text: `Partage : ${Math.round((totalAmount * (dispute.buyer_refund_percent ?? 0)) / 100).toLocaleString()} ${tx?.currency} remboursés à l'acheteur, ${Math.round((totalAmount * (dispute.seller_payment_percent ?? 0)) / 100).toLocaleString()} ${tx?.currency} libérés au vendeur.`,
        };
      case "cancelled":
        return { tone: "bg-muted", icon: <XCircle className="w-4 h-4" />, text: "Litige annulé — la transaction reprend son cours normal." };
      default:
        return {
          tone: "bg-amber-500/10 border-amber-500/30",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          text: "Paiements GELÉS jusqu'à la décision de l'administrateur.",
        };
    }
  })();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-3 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <PageHeader title="Litige" subtitle={tx?.title || "Transaction"} />

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !tx ? (
          <Card className="p-8 text-center text-muted-foreground">Transaction introuvable.</Card>
        ) : (
          <>
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold">{tx.title || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">
                    Réf. traçabilité : {tx.trace_ref || tx.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant="outline">{tx.status}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {totalAmount.toLocaleString()} {tx.currency}</span>
                <span>{releasedPercent}% débloqué</span>
              </div>
              <Progress value={releasedPercent} className="h-2" />
            </Card>

            {!dispute ? (
              <Card className="p-8 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-sm">Aucun litige ouvert sur cette transaction.</p>
                <Button variant="destructive" onClick={() => setOpenNew(true)}>Ouvrir un litige</Button>
              </Card>
            ) : (
              <>
                <Card className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={dispute.status.startsWith("resolved") ? "default" : "destructive"}>
                      {STATUS_LABEL[dispute.status] || dispute.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Ouvert le {new Date(dispute.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{dispute.reason}</p>
                  {dispute.description && <p className="text-sm text-muted-foreground">{dispute.description}</p>}
                </Card>

                {impact && (
                  <Card className={`p-3 border ${impact.tone}`}>
                    <div className="flex items-start gap-2">
                      {impact.icon}
                      <div className="text-sm">
                        <p className="font-semibold">Impact sur le paiement</p>
                        <p className="text-xs mt-0.5">{impact.text}</p>
                      </div>
                    </div>
                  </Card>
                )}

                {dispute.admin_decision && (
                  <Card className="p-4 space-y-1">
                    <p className="text-sm font-semibold flex items-center gap-1"><Scale className="w-4 h-4" /> Décision de l'administrateur</p>
                    <p className="text-sm">{dispute.admin_decision}</p>
                    {dispute.admin_notes && <p className="text-xs text-muted-foreground">{dispute.admin_notes}</p>}
                    {dispute.resolved_at && (
                      <p className="text-xs text-muted-foreground">Rendue le {new Date(dispute.resolved_at).toLocaleString()}</p>
                    )}
                  </Card>
                )}

                <Card className="p-4 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1">
                    <Paperclip className="w-4 h-4" /> Preuves déposées ({evidence.length})
                  </p>
                  {evidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune preuve téléchargée.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {evidence.map(({ path, url }) => {
                        const isImg = /\.(png|jpe?g|gif|webp|heic)$/i.test(path);
                        return (
                          <a key={path} href={url} target="_blank" rel="noopener noreferrer"
                             className="block aspect-square rounded-lg border overflow-hidden bg-muted/30 hover:border-primary/60 transition-colors">
                            {isImg ? (
                              <img src={url} alt="preuve du litige" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                                <FileText className="w-6 h-6" />
                                <span className="text-[9px] truncate w-full text-center">{path.split("/").pop()}</span>
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card className="p-4 space-y-3">
                  <p className="text-sm font-semibold">Historique des échanges</p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun commentaire pour l'instant.</p>
                    )}
                    {messages.map((m) => (
                      <div key={m.id} className={`p-2 rounded text-sm ${
                        m.is_admin_message ? "bg-primary/10 border border-primary/20"
                          : m.sender_id === user?.id ? "bg-accent/50 ml-6" : "bg-muted mr-6"}`}>
                        {m.is_admin_message && <Badge variant="outline" className="text-xs mb-1">Admin</Badge>}
                        <p>{m.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  {(dispute.status === "open" || dispute.status === "under_review") && (
                    <div className="flex gap-2">
                      <Input placeholder="Ajouter un commentaire..." value={newMsg}
                             onChange={(e) => setNewMsg(e.target.value)}
                             onKeyDown={(e) => e.key === "Enter" && sendMsg()} />
                      <Button size="icon" onClick={sendMsg}><Send className="w-4 h-4" /></Button>
                    </div>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        {transactionId && (
          <DisputeDialog transactionId={transactionId} open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) load(); }} />
        )}
      </div>
    </AppLayout>
  );
}
