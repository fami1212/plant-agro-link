import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShipmentCard } from "@/components/logistics/ShipmentCard";
import { ShipmentTracker } from "@/components/logistics/ShipmentTracker";
import { ShipmentForm } from "@/components/logistics/ShipmentForm";
import { TransporterCard } from "@/components/logistics/TransporterCard";
import { TransporterForm } from "@/components/logistics/TransporterForm";
import { StockManager } from "@/components/logistics/StockManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { EmptyState } from "@/components/common/EmptyState";
import { Plus, ArrowLeft, Truck, Search } from "lucide-react";
import { toast } from "sonner";

export default function Logistique() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shipments, setShipments] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showTransporterForm, setShowTransporterForm] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [transporterSearch, setTransporterSearch] = useState("");

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

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("shipments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_shipments" }, () => fetchShipments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCreateShipment = () => {
    setShowCreate(false);
    fetchShipments();
  };

  const handleUpdateStatus = async (shipmentId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "en_transit") updates.pickup_date = new Date().toISOString().split("T")[0];
    if (newStatus === "livre") updates.delivery_date = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("logistics_shipments").update(updates).eq("id", shipmentId);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t(`logistics.status.${newStatus}`));
    fetchShipments();
    if (selectedShipment?.id === shipmentId) {
      setSelectedShipment({ ...selectedShipment, ...updates });
    }
  };

  const handleContactTransporter = (transporter: any) => {
    if (transporter.phone) {
      window.open(`tel:${transporter.phone}`);
    } else if (transporter.whatsapp) {
      window.open(`https://wa.me/${transporter.whatsapp}`);
    }
  };

  const filteredShipments = statusFilter === "all"
    ? shipments
    : shipments.filter(s => s.status === statusFilter);

  const filteredTransporters = transporterSearch
    ? transporters.filter(t =>
        t.company_name.toLowerCase().includes(transporterSearch.toLowerCase()) ||
        (t.service_areas || []).some((a: string) => a.toLowerCase().includes(transporterSearch.toLowerCase()))
      )
    : transporters;

  // Shipment detail view
  if (selectedShipment) {
    const nextStatus: Record<string, string> = {
      en_preparation: "en_transit",
      en_transit: "livre",
    };
    const canAdvance = nextStatus[selectedShipment.status] && selectedShipment.seller_id === user?.id;

    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <PageHeader title={t("logistics.tracking")} subtitle={`${selectedShipment.origin} → ${selectedShipment.destination}`} />
          <div className="px-4 pb-24 space-y-4">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedShipment(null)}>
              <ArrowLeft className="w-4 h-4" /> {t("common.back")}
            </Button>
            <ShipmentTracker shipment={selectedShipment} />

            {canAdvance && (
              <Button className="w-full rounded-xl" onClick={() => handleUpdateStatus(selectedShipment.id, nextStatus[selectedShipment.status])}>
                {t(`logistics.markAs.${nextStatus[selectedShipment.status]}`)}
              </Button>
            )}

            {selectedShipment.status !== "annule" && selectedShipment.status !== "livre" && selectedShipment.seller_id === user?.id && (
              <Button variant="outline" className="w-full rounded-xl text-destructive" onClick={() => handleUpdateStatus(selectedShipment.id, "annule")}>
                {t("logistics.cancelShipment")}
              </Button>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

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
                    <Input type="date" placeholder={t("logistics.estimatedDelivery")} value={form.estimated_delivery} onChange={e => setForm({ ...form, estimated_delivery: e.target.value })} />
                    <Button className="w-full" onClick={handleCreateShipment}>{t("common.create")}</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Status filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {["all", "en_preparation", "en_transit", "livre", "annule"].map(status => (
                  <Button key={status} size="sm" variant={statusFilter === status ? "default" : "outline"} className="rounded-full text-xs shrink-0"
                    onClick={() => setStatusFilter(status)}>
                    {status === "all" ? t("common.all") : t(`logistics.status.${status}`)}
                  </Button>
                ))}
              </div>

              {filteredShipments.length === 0 ? (
                <EmptyState title={t("logistics.noShipments")} description={t("logistics.noShipmentsDesc")} />
              ) : (
                filteredShipments.map(s => <ShipmentCard key={s.id} shipment={s} onClick={() => setSelectedShipment(s)} />)
              )}
            </TabsContent>

            <TabsContent value="transporters" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("logistics.searchTransporters")}
                  value={transporterSearch}
                  onChange={e => setTransporterSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Dialog open={showTransporterForm} onOpenChange={setShowTransporterForm}>
                <DialogTrigger asChild>
                  <Button className="w-full rounded-xl gap-2" variant="outline">
                    <Truck className="w-4 h-4" />{t("logistics.registerTransporter")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("logistics.registerTransporter")}</DialogTitle></DialogHeader>
                  <TransporterForm onSuccess={() => { setShowTransporterForm(false); fetchTransporters(); }} />
                </DialogContent>
              </Dialog>
              {filteredTransporters.length === 0 ? (
                <EmptyState title={t("logistics.noTransporters")} description={t("logistics.noTransportersDesc")} />
              ) : (
                filteredTransporters.map(tr => (
                  <TransporterCard key={tr.id} transporter={tr} onContact={() => handleContactTransporter(tr)} />
                ))
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
