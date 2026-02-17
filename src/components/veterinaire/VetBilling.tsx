import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface BookingPayment {
  id: string;
  service_type: string;
  scheduled_date: string;
  price: number | null;
  payment_status: string | null;
  status: string | null;
  client_name?: string;
}

interface EscrowTransaction {
  id: string;
  amount: number;
  fees: number;
  total_amount: number;
  status: string;
  created_at: string;
  released_at: string | null;
  buyer_name?: string;
}

export function VetBilling() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<"consultations" | "transactions">("consultations");

  useEffect(() => {
    if (user) fetchPayments();
  }, [user]);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: provider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!provider) { setLoading(false); return; }

      const { data } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("provider_id", provider.id)
        .order("scheduled_date", { ascending: false });

      if (data) {
        const clientIds = [...new Set(data.map(b => b.client_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", clientIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        setPayments(data.map(b => ({
          ...b,
          client_name: profileMap.get(b.client_id) || "Client",
        })));
      }

      // Fetch real escrow transactions
      const { data: escrows } = await supabase
        .from("escrow_contracts")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (escrows) {
        const buyerIds = [...new Set(escrows.map(e => e.buyer_id))];
        const { data: buyerProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", buyerIds);
        const buyerMap = new Map(buyerProfiles?.map(p => [p.user_id, p.full_name]) || []);

        setTransactions(escrows.map(e => ({
          id: e.id,
          amount: e.amount,
          fees: e.fees,
          total_amount: e.total_amount,
          status: e.status,
          created_at: e.created_at,
          released_at: e.released_at,
          buyer_name: buyerMap.get(e.buyer_id) || "Client",
        })));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const totalRevenue = payments.filter(p => p.payment_status === "paid").reduce((s, p) => s + (p.price || 0), 0);
  const pendingRevenue = payments.filter(p => p.payment_status === "pending" && p.status === "terminee").reduce((s, p) => s + (p.price || 0), 0);
  const completedCount = payments.filter(p => p.status === "terminee").length;

  const transactionTotal = transactions.filter(t => t.status === "released").reduce((s, t) => s + t.amount, 0);

  const statusLabel: Record<string, { label: string; className: string }> = {
    paid: { label: "Payé", className: "bg-success/10 text-success" },
    pending: { label: "En attente", className: "bg-warning/10 text-warning" },
    released: { label: "Libéré", className: "bg-success/10 text-success" },
    funded: { label: "En escrow", className: "bg-primary/10 text-primary" },
    created: { label: "Créé", className: "bg-muted text-muted-foreground" },
    refunded: { label: "Remboursé", className: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-4">
      {/* Revenue Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <Wallet className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-success">{((totalRevenue + transactionTotal) / 1000).toFixed(0)}k</p>
            <p className="text-[10px] text-muted-foreground">Encaissé</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold text-warning">{(pendingRevenue / 1000).toFixed(0)}k</p>
            <p className="text-[10px] text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-primary">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Consultations</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2">
        <Badge
          variant={viewTab === "consultations" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setViewTab("consultations")}
        >
          Consultations ({payments.length})
        </Badge>
        <Badge
          variant={viewTab === "transactions" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setViewTab("transactions")}
        >
          Transactions ({transactions.length})
        </Badge>
      </div>

      {/* Consultations List */}
      {viewTab === "consultations" && (
        payments.length === 0 ? (
          <EmptyState icon={<Wallet className="w-8 h-8" />} title="Aucun paiement" description="Vos paiements apparaîtront ici" />
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{p.service_type}</p>
                    <p className="text-xs text-muted-foreground">{p.client_name} • {format(new Date(p.scheduled_date), "d MMM yyyy", { locale: fr })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{(p.price || 0).toLocaleString()} F</p>
                    <Badge variant="outline" className={statusLabel[p.payment_status || "pending"]?.className || ""}>
                      {statusLabel[p.payment_status || "pending"]?.label || p.payment_status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Transactions List */}
      {viewTab === "transactions" && (
        transactions.length === 0 ? (
          <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="Aucune transaction" description="Les transactions escrow apparaîtront ici" />
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.buyer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "d MMM yyyy", { locale: fr })}
                      {t.released_at && ` • Libéré ${format(new Date(t.released_at), "d MMM", { locale: fr })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{t.amount.toLocaleString()} F</p>
                    <p className="text-[10px] text-muted-foreground">Frais: {t.fees.toLocaleString()} F</p>
                    <Badge variant="outline" className={statusLabel[t.status]?.className || ""}>
                      {statusLabel[t.status]?.label || t.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
