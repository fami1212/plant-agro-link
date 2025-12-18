import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  Scale,
  Gavel,
  User,
  DollarSign,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Dispute {
  id: string;
  escrow_id: string;
  opened_by: string;
  reason: string;
  description: string | null;
  status: string;
  admin_decision: string | null;
  admin_notes: string | null;
  buyer_refund_percent: number;
  seller_payment_percent: number;
  created_at: string;
  resolved_at: string | null;
  escrow?: {
    id: string;
    amount: number;
    buyer_id: string;
    seller_id: string;
  };
  buyer_name?: string;
  seller_name?: string;
  opener_name?: string;
}

interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
  sender_name?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-orange-500" },
  under_review: { label: "En examen", color: "bg-blue-500" },
  resolved: { label: "Résolu", color: "bg-green-500" },
  rejected: { label: "Rejeté", color: "bg-red-500" },
};

const reasonLabels: Record<string, string> = {
  non_delivery: "Non-livraison",
  wrong_product: "Produit non conforme",
  damaged: "Produit endommagé",
  quality_issue: "Problème de qualité",
  other: "Autre",
};

export function AdminDisputePanel() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState({
    decision: "",
    notes: "",
    buyerPercent: 50,
    sellerPercent: 50,
  });
  const [resolving, setResolving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          escrow:escrow_contracts(id, amount, buyer_id, seller_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user names
      const disputesWithNames = await Promise.all(
        (data || []).map(async (dispute) => {
          const userIds = [
            dispute.opened_by,
            dispute.escrow?.buyer_id,
            dispute.escrow?.seller_id,
          ].filter(Boolean);

          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", userIds);

          const getFullName = (id: string) =>
            profiles?.find((p) => p.user_id === id)?.full_name || "Inconnu";

          return {
            ...dispute,
            opener_name: getFullName(dispute.opened_by),
            buyer_name: dispute.escrow?.buyer_id ? getFullName(dispute.escrow.buyer_id) : "Inconnu",
            seller_name: dispute.escrow?.seller_id ? getFullName(dispute.escrow.seller_id) : "Inconnu",
          };
        })
      );

      setDisputes(disputesWithNames);
    } catch (error) {
      console.error("Error loading disputes:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from("dispute_messages")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const messagesWithNames = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg.is_admin_message) {
            return { ...msg, sender_name: "🛡️ Médiateur (Vous)" };
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", msg.sender_id)
            .maybeSingle();
          return { ...msg, sender_name: profile?.full_name || "Utilisateur" };
        })
      );

      setMessages(messagesWithNames);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSelectDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    loadMessages(dispute.id);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedDispute || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from("dispute_messages")
        .insert({
          dispute_id: selectedDispute.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin_message: true,
        });

      if (error) throw error;
      setNewMessage("");
      loadMessages(selectedDispute.id);
      toast.success("Message envoyé");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedDispute) return;

    try {
      const { error } = await supabase
        .from("escrow_disputes")
        .update({ status })
        .eq("id", selectedDispute.id);

      if (error) throw error;
      toast.success("Statut mis à jour");
      loadDisputes();
      setSelectedDispute({ ...selectedDispute, status });
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolution.decision) {
      toast.error("Veuillez entrer une décision");
      return;
    }

    setResolving(true);
    try {
      // Update dispute
      const { error: disputeError } = await supabase
        .from("escrow_disputes")
        .update({
          status: "resolved",
          admin_decision: resolution.decision,
          admin_notes: resolution.notes,
          buyer_refund_percent: resolution.buyerPercent,
          seller_payment_percent: resolution.sellerPercent,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedDispute.id);

      if (disputeError) throw disputeError;

      // Update escrow
      await supabase
        .from("escrow_contracts")
        .update({
          dispute_status: "resolved",
          dispute_resolved_at: new Date().toISOString(),
        })
        .eq("id", selectedDispute.escrow_id);

      toast.success("Litige résolu avec succès");
      setShowResolveDialog(false);
      setResolution({ decision: "", notes: "", buyerPercent: 50, sellerPercent: 50 });
      loadDisputes();
      setSelectedDispute(null);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      toast.error("Erreur lors de la résolution");
    } finally {
      setResolving(false);
    }
  };

  const filteredDisputes = disputes.filter(
    (d) => filterStatus === "all" || d.status === filterStatus
  );

  const openCount = disputes.filter((d) => d.status === "open").length;
  const reviewCount = disputes.filter((d) => d.status === "under_review").length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ouverts</p>
              <p className="text-lg font-bold">{openCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Scale className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En examen</p>
              <p className="text-lg font-bold">{reviewCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Résolus</p>
              <p className="text-lg font-bold">
                {disputes.filter((d) => d.status === "resolved").length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gavel className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{disputes.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les litiges</SelectItem>
            <SelectItem value="open">Ouverts</SelectItem>
            <SelectItem value="under_review">En examen</SelectItem>
            <SelectItem value="resolved">Résolus</SelectItem>
            <SelectItem value="rejected">Rejetés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes List */}
      {filteredDisputes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun litige</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDisputes.map((dispute) => (
            <Card
              key={dispute.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectDispute(dispute)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusConfig[dispute.status]?.color}>
                        {statusConfig[dispute.status]?.label}
                      </Badge>
                      <span className="text-sm font-medium">
                        {reasonLabels[dispute.reason] || dispute.reason}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Acheteur: {dispute.buyer_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Vendeur: {dispute.seller_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {dispute.escrow?.amount?.toLocaleString()} FCFA
                      </span>
                      <span>
                        {format(new Date(dispute.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5" />
              Médiation #{selectedDispute?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              {reasonLabels[selectedDispute?.reason || ""] || selectedDispute?.reason}
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {/* Parties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-muted-foreground">Acheteur</p>
                  <p className="font-medium">{selectedDispute.buyer_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">Vendeur</p>
                  <p className="font-medium">{selectedDispute.seller_name}</p>
                </div>
              </div>

              {/* Amount & Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Montant en jeu</p>
                  <p className="text-xl font-bold">{selectedDispute.escrow?.amount?.toLocaleString()} FCFA</p>
                </div>
                <Select
                  value={selectedDispute.status}
                  onValueChange={handleUpdateStatus}
                  disabled={selectedDispute.status === "resolved"}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Ouvert</SelectItem>
                    <SelectItem value="under_review">En examen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              {selectedDispute.description && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-1">Description du problème</p>
                  <p className="text-sm text-muted-foreground">{selectedDispute.description}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 min-h-0">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Communication ({messages.length})
                </p>
                <ScrollArea className="h-40 border rounded-lg p-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun message
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "p-2 rounded-lg",
                            msg.is_admin_message ? "bg-primary/10 border border-primary/20" : "bg-muted"
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium">{msg.sender_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), "dd/MM HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Admin Message Input */}
                {selectedDispute.status !== "resolved" && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      placeholder="Message aux parties..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                      {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedDispute.status !== "resolved" && (
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus("rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button className="flex-1" onClick={() => setShowResolveDialog(true)}>
                    <Gavel className="w-4 h-4 mr-2" />
                    Rendre décision
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rendre une décision</DialogTitle>
            <DialogDescription>
              Décidez comment répartir les fonds entre l'acheteur et le vendeur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Décision *</Label>
              <Textarea
                placeholder="Expliquez votre décision..."
                value={resolution.decision}
                onChange={(e) => setResolution((prev) => ({ ...prev, decision: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <Label>Répartition des fonds</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Acheteur: {resolution.buyerPercent}%</span>
                  <span>Vendeur: {resolution.sellerPercent}%</span>
                </div>
                <Slider
                  value={[resolution.buyerPercent]}
                  onValueChange={([val]) =>
                    setResolution((prev) => ({
                      ...prev,
                      buyerPercent: val,
                      sellerPercent: 100 - val,
                    }))
                  }
                  max={100}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {((selectedDispute?.escrow?.amount || 0) * resolution.buyerPercent / 100).toLocaleString()} FCFA
                  </span>
                  <span>
                    {((selectedDispute?.escrow?.amount || 0) * resolution.sellerPercent / 100).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea
                placeholder="Notes pour votre suivi..."
                value={resolution.notes}
                onChange={(e) => setResolution((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={handleResolve} disabled={resolving || !resolution.decision}>
              {resolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Résolution...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmer la résolution
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}