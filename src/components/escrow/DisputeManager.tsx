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
import {
  AlertTriangle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  Scale,
  FileText,
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
    listing_id: string | null;
  };
  listing_title?: string;
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: "Ouvert", color: "bg-orange-500", icon: AlertTriangle },
  under_review: { label: "En examen", color: "bg-blue-500", icon: Scale },
  resolved: { label: "Résolu", color: "bg-green-500", icon: CheckCircle2 },
  rejected: { label: "Rejeté", color: "bg-red-500", icon: XCircle },
};

const reasonOptions = [
  { value: "non_delivery", label: "Non-livraison" },
  { value: "wrong_product", label: "Produit non conforme" },
  { value: "damaged", label: "Produit endommagé" },
  { value: "quality_issue", label: "Problème de qualité" },
  { value: "other", label: "Autre" },
];

export function DisputeManager() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [escrows, setEscrows] = useState<any[]>([]);
  const [newDispute, setNewDispute] = useState({
    escrow_id: "",
    reason: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadDisputes();
      loadEscrows();
    }
  }, [user]);

  const loadDisputes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          escrow:escrow_contracts(id, amount, buyer_id, seller_id, listing_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch listing titles
      const disputesWithTitles = await Promise.all(
        (data || []).map(async (dispute) => {
          if (dispute.escrow?.listing_id) {
            const { data: listing } = await supabase
              .from("marketplace_listings")
              .select("title")
              .eq("id", dispute.escrow.listing_id)
              .maybeSingle();
            return { ...dispute, listing_title: listing?.title || "Sans titre" };
          }
          return { ...dispute, listing_title: "Transaction" };
        })
      );

      setDisputes(disputesWithTitles);
    } catch (error) {
      console.error("Error loading disputes:", error);
      toast.error("Erreur lors du chargement des litiges");
    } finally {
      setLoading(false);
    }
  };

  const loadEscrows = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("escrow_contracts")
        .select("id, amount, status, listing_id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in("status", ["funded", "delivery_confirmed"])
        .order("created_at", { ascending: false });

      // Get listing titles
      const escrowsWithTitles = await Promise.all(
        (data || []).map(async (escrow) => {
          if (escrow.listing_id) {
            const { data: listing } = await supabase
              .from("marketplace_listings")
              .select("title")
              .eq("id", escrow.listing_id)
              .maybeSingle();
            return { ...escrow, title: listing?.title || "Transaction" };
          }
          return { ...escrow, title: "Transaction" };
        })
      );

      setEscrows(escrowsWithTitles);
    } catch (error) {
      console.error("Error loading escrows:", error);
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

      // Get sender names
      const messagesWithNames = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg.is_admin_message) {
            return { ...msg, sender_name: "🛡️ Médiateur" };
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

  const handleOpenDispute = (dispute: Dispute) => {
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
          is_admin_message: false,
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

  const handleCreateDispute = async () => {
    if (!user || !newDispute.escrow_id || !newDispute.reason) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setCreating(true);
    try {
      // Update escrow status
      await supabase
        .from("escrow_contracts")
        .update({ 
          dispute_status: "open",
          dispute_opened_at: new Date().toISOString()
        })
        .eq("id", newDispute.escrow_id);

      // Create dispute
      const { error } = await supabase
        .from("escrow_disputes")
        .insert({
          escrow_id: newDispute.escrow_id,
          opened_by: user.id,
          reason: newDispute.reason,
          description: newDispute.description || null,
          status: "open",
        });

      if (error) throw error;

      toast.success("Litige ouvert avec succès");
      setShowCreateDialog(false);
      setNewDispute({ escrow_id: "", reason: "", description: "" });
      loadDisputes();
      loadEscrows();
    } catch (error) {
      console.error("Error creating dispute:", error);
      toast.error("Erreur lors de la création du litige");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          Mes litiges
        </h3>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Ouvrir un litige
        </Button>
      </div>

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucun litige en cours</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vos transactions sont sécurisées par notre système d'escrow
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const config = statusConfig[dispute.status] || statusConfig.open;
            const StatusIcon = config.icon;
            
            return (
              <Card 
                key={dispute.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleOpenDispute(dispute)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={cn("w-4 h-4", config.color.replace("bg-", "text-").replace("-500", "-600"))} />
                        <span className="font-medium">{dispute.listing_title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {reasonOptions.find(r => r.value === dispute.reason)?.label || dispute.reason}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ouvert le {format(new Date(dispute.created_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>

                  {dispute.status === "resolved" && (
                    <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm font-medium text-green-700">Décision: {dispute.admin_decision}</p>
                      {dispute.buyer_refund_percent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Remboursement acheteur: {dispute.buyer_refund_percent}%
                        </p>
                      )}
                      {dispute.seller_payment_percent > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Paiement vendeur: {dispute.seller_payment_percent}%
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Litige #{selectedDispute?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription>
              {selectedDispute?.listing_title}
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Status */}
              <div className="flex items-center justify-between mb-4">
                <Badge className={statusConfig[selectedDispute.status]?.color}>
                  {statusConfig[selectedDispute.status]?.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Montant: {selectedDispute.escrow?.amount?.toLocaleString()} FCFA
                </span>
              </div>

              {/* Reason */}
              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="text-sm font-medium">
                  {reasonOptions.find(r => r.value === selectedDispute.reason)?.label}
                </p>
                {selectedDispute.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedDispute.description}</p>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages ({messages.length})
                </p>
                <ScrollArea className="h-48 border rounded-lg p-3">
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
              </div>

              {/* Send Message */}
              {selectedDispute.status !== "resolved" && selectedDispute.status !== "rejected" && (
                <div className="flex gap-2 mt-4">
                  <Input
                    placeholder="Votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Resolution Info */}
              {selectedDispute.admin_notes && (
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Note du médiateur
                  </p>
                  <p className="text-sm mt-1">{selectedDispute.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dispute Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir un litige</DialogTitle>
            <DialogDescription>
              Décrivez votre problème pour qu'un médiateur puisse vous aider
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transaction concernée *</Label>
              <Select
                value={newDispute.escrow_id}
                onValueChange={(v) => setNewDispute(prev => ({ ...prev, escrow_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une transaction" />
                </SelectTrigger>
                <SelectContent>
                  {escrows.map((escrow) => (
                    <SelectItem key={escrow.id} value={escrow.id}>
                      {escrow.title} - {escrow.amount?.toLocaleString()} FCFA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {escrows.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucune transaction éligible pour un litige
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Raison du litige *</Label>
              <Select
                value={newDispute.reason}
                onValueChange={(v) => setNewDispute(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une raison" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description détaillée</Label>
              <Textarea
                placeholder="Décrivez votre problème en détail..."
                value={newDispute.description}
                onChange={(e) => setNewDispute(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleCreateDispute}
              disabled={creating || !newDispute.escrow_id || !newDispute.reason}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Ouvrir le litige
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}