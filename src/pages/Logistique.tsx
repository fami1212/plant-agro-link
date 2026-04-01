import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShipmentCard } from "@/components/logistics/ShipmentCard";
import { TransporterCard } from "@/components/logistics/TransporterCard";
import { StockManager } from "@/components/logistics/StockManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Logistique() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shipments, setShipments] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ origin: "", destination: "", weight_kg: "", buyer_id: "" });

  const fetchShipments = async () => {
    if (!user) return;
    const { data } = await supabase.from("logistics_shipments").select("*")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setShipments(data || []);
  };

  const fetchTransporters = async () => {
    const { data } = await supabase.from("logistics_transporters").select("*").eq("is_available", true).order("rating", { ascending: false });
    setTransporters(data || []);
  };

  useEffect(() => { fetchShipments(); fetchTransporters(); }, [user]);

  // Realtime subscription for shipments
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shipments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_shipments" }, () => fetchShipments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCreateShipment = async () => {
    if (!user || !form.origin || !form.destination) return;
    const { error } = await supabase.from("logistics_shipments").insert({
      seller_id: user.id,
      buyer_id: form.buyer_id || user.id,
      origin: form.origin,
      destination: form.destination,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
    });
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("logistics.shipmentCreated"));
    setShowCreate(false);
    setForm({ origin: "", destination: "", weight_kg: "", buyer_id: "" });
    fetchShipments();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={t("logistics.title")} subtitle={t("logistics.subtitle")} />
        <div className="px-4 pb-24">
          <Tabs defaultValue="shipments" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="shipments" className="flex-1 text-xs">{t("logistics.shipments")}</TabsTrigger>
              <TabsTrigger value="transporters" className="flex-1 text-xs">{t("logistics.transporters")}</TabsTrigger>
              <TabsTrigger value="stock" className="flex-1 text-xs">{t("logistics.stock")}</TabsTrigger>
            </TabsList>

            <TabsContent value="shipments" className="space-y-3">
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl gap-2"><Plus className="w-4 h-4" />{t("logistics.newShipment")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("logistics.newShipment")}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder={t("logistics.origin")} value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} />
                    <Input placeholder={t("logistics.destination")} value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
                    <Input type="number" placeholder={t("logistics.weightKg")} value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} />
                    <Button className="w-full" onClick={handleCreateShipment}>{t("common.create")}</Button>
                  </div>
                </DialogContent>
              </Dialog>
              {shipments.length === 0 ? (
                <EmptyState title={t("logistics.noShipments")} description={t("logistics.noShipmentsDesc")} />
              ) : (
                shipments.map(s => <ShipmentCard key={s.id} shipment={s} />)
              )}
            </TabsContent>

            <TabsContent value="transporters" className="space-y-3">
              {transporters.length === 0 ? (
                <EmptyState title={t("logistics.noTransporters")} description={t("logistics.noTransportersDesc")} />
              ) : (
                transporters.map(tr => <TransporterCard key={tr.id} transporter={tr} />)
              )}
            </TabsContent>

            <TabsContent value="stock">
              <StockManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
