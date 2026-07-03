import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Loader2, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  transactionId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Dispute {
  id: string;
  reason: string;
  description: string | null;
  evidence_urls: string[];
  status: string;
  admin_decision: string | null;
  admin_notes: string | null;
  buyer_refund_percent: number;
  seller_payment_percent: number;
  created_at: string;
  opened_by: string;
}

interface Msg {
  id: string;
  sender_id: string;
  message: string;
  attachments: string[];
  is_admin_message: boolean;
  created_at: string;
}

export function DisputeDialog({ transactionId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMsg, setNewMsg] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("transaction_disputes")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDispute(data);
    if (data) {
      const { data: msgs } = await (supabase as any)
        .from("transaction_dispute_messages")
        .select("*")
        .eq("dispute_id", data.id)
        .order("created_at");
      setMessages(msgs || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId]);

  useEffect(() => {
    if (!dispute) return;
    const ch = supabase
      .channel(`dispute-msg-${dispute.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transaction_dispute_messages",
          filter: `dispute_id=eq.${dispute.id}`,
        },
        (payload) => setMessages((m) => [...m, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [dispute]);

  const uploadEvidence = async (): Promise<string[]> => {
    if (!user || files.length === 0) return [];
    const urls: string[] = [];
    for (const f of files) {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage
        .from("dispute-evidence")
        .upload(path, f, { upsert: false });
      if (!error) urls.push(path);
    }
    return urls;
  };

  const openDispute = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    const evidence_urls = await uploadEvidence();
    const { error } = await (supabase as any).from("transaction_disputes").insert({
      transaction_id: transactionId,
      opened_by: user.id,
      reason,
      description,
      evidence_urls,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Litige ouvert — un admin va arbitrer.");
    setReason("");
    setDescription("");
    setFiles([]);
    load();
  };

  const sendMsg = async () => {
    if (!newMsg.trim() || !dispute || !user) return;
    await (supabase as any).from("transaction_dispute_messages").insert({
      dispute_id: dispute.id,
      sender_id: user.id,
      message: newMsg,
    });
    setNewMsg("");
  };

  const statusLabel: Record<string, string> = {
    open: "Ouvert",
    under_review: "En arbitrage",
    resolved_buyer: "Résolu — remboursement acheteur",
    resolved_seller: "Résolu — paiement vendeur",
    resolved_split: "Résolu — partage",
    cancelled: "Annulé",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {dispute ? "Litige en cours" : "Ouvrir un litige"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : dispute ? (
          <div className="space-y-3">
            <Card className="p-3 bg-destructive/5 border-destructive/20">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="destructive">{statusLabel[dispute.status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(dispute.created_at).toLocaleString()}
                </span>
              </div>
              <p className="font-medium text-sm">{dispute.reason}</p>
              {dispute.description && (
                <p className="text-sm text-muted-foreground mt-1">{dispute.description}</p>
              )}
              {dispute.admin_decision && (
                <div className="mt-3 pt-3 border-t border-destructive/20">
                  <p className="text-xs font-semibold">Décision admin :</p>
                  <p className="text-sm">{dispute.admin_decision}</p>
                  {dispute.admin_notes && (
                    <p className="text-xs text-muted-foreground mt-1">{dispute.admin_notes}</p>
                  )}
                </div>
              )}
            </Card>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded text-sm ${
                    m.is_admin_message
                      ? "bg-primary/10 border border-primary/20"
                      : m.sender_id === user?.id
                      ? "bg-accent/50 ml-6"
                      : "bg-muted mr-6"
                  }`}
                >
                  {m.is_admin_message && (
                    <Badge variant="outline" className="text-xs mb-1">
                      Admin
                    </Badge>
                  )}
                  <p>{m.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {dispute.status === "open" || dispute.status === "under_review" ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter un message..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                />
                <Button size="icon" onClick={sendMsg}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Motif *</label>
              <Input
                placeholder="Ex : produit non conforme, non livré..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description détaillée</label>
              <Textarea
                placeholder="Décrivez précisément le problème..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Paperclip className="w-4 h-4" /> Preuves (photos, docs)
              </label>
              <Input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {files.length} fichier(s) sélectionné(s)
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={openDispute}
                disabled={!reason.trim() || submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-1" /> Ouvrir le litige
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}