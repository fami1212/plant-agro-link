import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  Package,
  ArrowRight,
  Wallet,
  XCircle,
  History,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  getUserEscrows, 
  confirmDelivery, 
  releaseFunds, 
  requestRefund,
  getEscrowEvents,
  EscrowContract,
  EscrowEvent,
} from "@/services/escrowService";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  created: { label: "Créé", color: "bg-gray-500", icon: <Clock className="w-3 h-3" /> },
  funded: { label: "Fonds bloqués", color: "bg-blue-500", icon: <Wallet className="w-3 h-3" /> },
  released: { label: "Libéré", color: "bg-green-500", icon: <CheckCircle2 className="w-3 h-3" /> },
  refunded: { label: "Remboursé", color: "bg-orange-500", icon: <RefreshCw className="w-3 h-3" /> },
  disputed: { label: "Litige", color: "bg-red-500", icon: <AlertCircle className="w-3 h-3" /> },
};

export function EscrowManager() {
  const { user } = useAuth();
  const [escrows, setEscrows] = useState<EscrowContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowContract | null>(null);
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      loadEscrows();
    }
  }, [user]);

  const loadEscrows = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserEscrows(user.id);
      setEscrows(data);

      // Load listing titles
      const listingIds = [...new Set(data.map(e => e.listing_id).filter(Boolean))];
      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from('marketplace_listings')
          .select('id, title')
          .in('id', listingIds);
        
        const titles: Record<string, string> = {};
        listings?.forEach(l => { titles[l.id] = l.title; });
        setListingTitles(titles);
      }

      // Load user names
      const userIds = [...new Set(data.flatMap(e => [e.buyer_id, e.seller_id]))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        const names: Record<string, string> = {};
        profiles?.forEach(p => { names[p.user_id] = p.full_name; });
        setUserNames(names);
      }
    } catch (error) {
      console.error('Error loading escrows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (escrowId: string) => {
    const data = await getEscrowEvents(escrowId);
    setEvents(data);
    setShowHistory(true);
  };

  const handleConfirmDelivery = async (escrow: EscrowContract) => {
    if (!user) return;
    setProcessing(true);
    try {
      await confirmDelivery(escrow.id, user.id);
      toast.success("Livraison confirmée! Les fonds peuvent maintenant être libérés.");
      loadEscrows();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la confirmation");
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseFunds = async (escrow: EscrowContract) => {
    if (!user) return;
    setProcessing(true);
    try {
      await releaseFunds(escrow.id, user.id);
      toast.success("Fonds libérés au vendeur!");
      loadEscrows();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la libération");
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestRefund = async () => {
    if (!user || !selectedEscrow || !refundReason.trim()) return;
    setProcessing(true);
    try {
      await requestRefund(selectedEscrow.id, user.id, refundReason);
      toast.success("Remboursement effectué!");
      setShowRefundDialog(false);
      setRefundReason("");
      setSelectedEscrow(null);
      loadEscrows();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du remboursement");
    } finally {
      setProcessing(false);
    }
  };

  const isBuyer = (escrow: EscrowContract) => user?.id === escrow.buyer_id;
  const isSeller = (escrow: EscrowContract) => user?.id === escrow.seller_id;

  const canConfirmDelivery = (escrow: EscrowContract) => 
    isBuyer(escrow) && escrow.status === 'funded' && !escrow.delivery_confirmed_at;

  const canReleaseFunds = (escrow: EscrowContract) => 
    escrow.status === 'funded' && escrow.delivery_confirmed_at;

  const canRequestRefund = (escrow: EscrowContract) =>
    isBuyer(escrow) && escrow.status === 'funded' && !escrow.delivery_confirmed_at;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (escrows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">Aucun contrat escrow</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Vos transactions sécurisées par escrow apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Mes contrats Escrow</h2>
          </div>
          <Badge variant="outline">{escrows.length} contrat(s)</Badge>
        </div>

        <div className="grid gap-4">
          {escrows.map((escrow) => {
            const status = statusConfig[escrow.status] || statusConfig.created;
            const listingTitle = escrow.listing_id ? listingTitles[escrow.listing_id] : "Transaction";
            const otherPartyId = isBuyer(escrow) ? escrow.seller_id : escrow.buyer_id;
            const otherPartyName = userNames[otherPartyId] || "Utilisateur";
            const role = isBuyer(escrow) ? "Acheteur" : "Vendeur";

            return (
              <Card key={escrow.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{listingTitle}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{role} • {otherPartyName}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${status.color} text-white gap-1`}>
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Amount info */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Montant sécurisé</p>
                      <p className="text-xl font-bold">{escrow.total_amount.toLocaleString()} FCFA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Créé le</p>
                      <p className="text-sm">{new Date(escrow.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {/* Status timeline */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${escrow.funded_at ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      Financé
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <div className={`flex items-center gap-1 ${escrow.delivery_confirmed_at ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      Livré
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <div className={`flex items-center gap-1 ${escrow.released_at ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      Libéré
                    </div>
                  </div>

                  {/* Auto-release info */}
                  {escrow.status === 'funded' && !escrow.delivery_confirmed_at && (
                    <p className="text-xs text-muted-foreground">
                      ⏱️ Libération automatique dans {escrow.auto_release_after_days} jours si pas de litige
                    </p>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedEscrow(escrow);
                        loadEvents(escrow.id);
                      }}
                    >
                      <History className="w-4 h-4 mr-1" />
                      Historique
                    </Button>

                    {canConfirmDelivery(escrow) && (
                      <Button 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleConfirmDelivery(escrow)}
                        disabled={processing}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Confirmer réception
                      </Button>
                    )}

                    {canReleaseFunds(escrow) && (
                      <Button 
                        size="sm"
                        onClick={() => handleReleaseFunds(escrow)}
                        disabled={processing}
                      >
                        <Wallet className="w-4 h-4 mr-1" />
                        Libérer les fonds
                      </Button>
                    )}

                    {canRequestRefund(escrow) && (
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedEscrow(escrow);
                          setShowRefundDialog(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Demander remboursement
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique blockchain
            </DialogTitle>
            <DialogDescription>
              Toutes les transactions enregistrées sur la blockchain
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun événement enregistré
              </p>
            ) : (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="p-1.5 rounded-full bg-primary/10">
                    <Shield className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {event.event_type.replace('_', ' ')}
                    </p>
                    {event.details && (
                      <p className="text-xs text-muted-foreground">{event.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <code className="text-[10px] text-muted-foreground font-mono truncate max-w-20">
                    {event.hash.slice(0, 10)}...
                  </code>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Demander un remboursement
            </DialogTitle>
            <DialogDescription>
              Expliquez la raison de votre demande de remboursement
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 text-sm">
              <p className="font-medium text-destructive">⚠️ Action irréversible</p>
              <p className="text-muted-foreground mt-1">
                Cette action annulera la transaction et les fonds vous seront retournés.
              </p>
            </div>

            <Textarea
              placeholder="Raison du remboursement..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRequestRefund}
              disabled={processing || !refundReason.trim()}
            >
              {processing ? "En cours..." : "Confirmer le remboursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
