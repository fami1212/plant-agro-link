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

export function VetBilling() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);

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

  const statusLabel: Record<string, { label: string; className: string }> = {
    paid: { label: "Payé", className: "bg-success/10 text-success" },
    pending: { label: "En attente", className: "bg-warning/10 text-warning" },
  };

  return (
    <div className="space-y-4">
      {/* Revenue Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <Wallet className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-success">{(totalRevenue / 1000).toFixed(0)}k</p>
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

      {/* Payment History */}
      {payments.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title="Aucun paiement"
          description="Vos paiements apparaîtront ici"
        />
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
      )}
    </div>
  );
}
