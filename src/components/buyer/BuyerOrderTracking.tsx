import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface Order {
  id: string;
  listing_id: string;
  proposed_price: number;
  proposed_quantity: string | null;
  status: string;
  payment_status: string | null;
  created_at: string;
  responded_at: string | null;
  delivery_date: string | null;
  message: string | null;
  product_title: string;
  product_image: string | null;
  seller_id: string;
  seller_name: string;
  seller_phone: string | null;
  seller_location: string | null;
}

const statusSteps = [
  { key: "en_attente", label: "En attente", icon: Clock },
  { key: "acceptee", label: "Acceptée", icon: CheckCircle2 },
  { key: "en_cours", label: "En livraison", icon: Truck },
  { key: "livree", label: "Livrée", icon: Package },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  en_attente: { label: "En attente", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  acceptee: { label: "Acceptée", color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  en_cours: { label: "En livraison", color: "bg-primary/10 text-primary border-primary/30", icon: Truck },
  livree: { label: "Livrée", color: "bg-success/10 text-success border-success/30", icon: Package },
  refusee: { label: "Refusée", color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
  annulee: { label: "Annulée", color: "bg-muted text-muted-foreground border-muted", icon: XCircle },
};

export function BuyerOrderTracking() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: offers, error } = await supabase
        .from("marketplace_offers")
        .select(`
          *,
          marketplace_listings(title, images, user_id, location)
        `)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get seller profiles
      const sellerIds = [...new Set(offers?.map(o => o.seller_id).filter(Boolean) || [])];
      
      let profiles: any[] = [];
      if (sellerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", sellerIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      const ordersData: Order[] = (offers || []).map(o => {
        const listing = o.marketplace_listings as any;
        const seller = profileMap.get(o.seller_id);
        return {
          id: o.id,
          listing_id: o.listing_id,
          proposed_price: o.proposed_price,
          proposed_quantity: o.proposed_quantity,
          status: o.status,
          payment_status: o.payment_status,
          created_at: o.created_at,
          responded_at: o.responded_at,
          delivery_date: o.delivery_date,
          message: o.message,
          product_title: listing?.title || "Produit",
          product_image: listing?.images?.[0] || null,
          seller_id: o.seller_id,
          seller_name: seller?.full_name || "Vendeur",
          seller_phone: seller?.phone,
          seller_location: listing?.location,
        };
      });

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusProgress = (status: string): number => {
    const index = statusSteps.findIndex(s => s.key === status);
    if (index === -1) return 0;
    return ((index + 1) / statusSteps.length) * 100;
  };

  const filteredOrders = orders.filter(o => {
    if (filter === "all") return true;
    if (filter === "active") return ["en_attente", "acceptee", "en_cours"].includes(o.status);
    if (filter === "completed") return ["livree"].includes(o.status);
    if (filter === "cancelled") return ["refusee", "annulee"].includes(o.status);
    return true;
  });

  const activeCount = orders.filter(o => ["en_attente", "acceptee", "en_cours"].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === "livree").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="w-8 h-8" />}
        title="Aucune commande"
        description="Vos commandes apparaîtront ici une fois passées"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center cursor-pointer" onClick={() => setFilter("all")}>
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card 
          className={cn("p-3 text-center cursor-pointer", filter === "active" && "ring-2 ring-primary")}
          onClick={() => setFilter("active")}
        >
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">En cours</p>
        </Card>
        <Card 
          className={cn("p-3 text-center cursor-pointer", filter === "completed" && "ring-2 ring-success")}
          onClick={() => setFilter("completed")}
        >
          <p className="text-2xl font-bold text-success">{completedCount}</p>
          <p className="text-xs text-muted-foreground">Livrées</p>
        </Card>
      </div>

      {/* Filter badges */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "active", "completed", "cancelled"].map((f) => (
          <Badge
            key={f}
            variant={filter === f ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter(f)}
          >
            {f === "all" && "Toutes"}
            {f === "active" && "En cours"}
            {f === "completed" && "Livrées"}
            {f === "cancelled" && "Annulées"}
          </Badge>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={<AlertCircle className="w-6 h-6" />}
          title="Aucune commande"
          description="Aucune commande ne correspond à ce filtre"
        />
      ) : (
        filteredOrders.map((order, index) => {
          const status = statusConfig[order.status] || statusConfig.en_attente;
          const StatusIcon = status.icon;
          const progress = getStatusProgress(order.status);

          return (
            <Card
              key={order.id}
              className={cn("overflow-hidden animate-fade-in cursor-pointer", `stagger-${(index % 5) + 1}`)}
              style={{ opacity: 0 }}
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {order.product_image ? (
                      <img src={order.product_image} alt={order.product_title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold truncate">{order.product_title}</p>
                        <p className="text-sm text-muted-foreground">{order.seller_name}</p>
                      </div>
                      <Badge className={cn("shrink-0", status.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="font-bold text-primary">
                        {order.proposed_price.toLocaleString()} F
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>

                    {/* Progress bar for active orders */}
                    {["en_attente", "acceptee", "en_cours"].includes(order.status) && (
                      <div className="mt-3">
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex justify-between mt-1">
                          {statusSteps.map((step, i) => (
                            <div
                              key={step.key}
                              className={cn(
                                "text-[10px]",
                                i <= statusSteps.findIndex(s => s.key === order.status)
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            >
                              {step.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de la commande</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  {selectedOrder.product_image ? (
                    <img src={selectedOrder.product_image} alt={selectedOrder.product_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedOrder.product_title}</p>
                  <p className="text-xl font-bold text-primary">
                    {selectedOrder.proposed_price.toLocaleString()} FCFA
                  </p>
                  {selectedOrder.proposed_quantity && (
                    <p className="text-sm text-muted-foreground">
                      Quantité: {selectedOrder.proposed_quantity}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-2">
                <p className="font-medium text-sm">Suivi de commande</p>
                <div className="space-y-3">
                  {statusSteps.map((step, i) => {
                    const currentIndex = statusSteps.findIndex(s => s.key === selectedOrder.status);
                    const isCompleted = i <= currentIndex;
                    const isCurrent = i === currentIndex;
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-medium text-sm", !isCompleted && "text-muted-foreground")}>
                            {step.label}
                          </p>
                          {isCurrent && selectedOrder.responded_at && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(selectedOrder.responded_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                            </p>
                          )}
                        </div>
                        {isCompleted && <CheckCircle2 className="w-4 h-4 text-success" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seller Info */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Vendeur</p>
                <p className="font-semibold">{selectedOrder.seller_name}</p>
                {selectedOrder.seller_location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedOrder.seller_location}
                  </p>
                )}
                {selectedOrder.seller_phone && (
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`tel:${selectedOrder.seller_phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        Appeler
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`https://wa.me/${selectedOrder.seller_phone.replace(/\D/g, '')}`} target="_blank">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Commandé le</p>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.created_at), "dd MMM yyyy", { locale: fr })}
                  </p>
                </div>
                {selectedOrder.delivery_date && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Livraison prévue</p>
                    <p className="font-medium">
                      {format(new Date(selectedOrder.delivery_date), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedOrder.status === "livree" && (
                <Button className="w-full gap-2">
                  <Star className="w-4 h-4" />
                  Laisser un avis
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
