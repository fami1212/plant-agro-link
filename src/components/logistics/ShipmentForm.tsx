import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Package, MapPin, Truck } from "lucide-react";

interface ShipmentFormProps {
  onSuccess: () => void;
}

export function ShipmentForm({ onSuccess }: ShipmentFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    weight_kg: "",
    estimated_delivery: "",
    distance_km: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!user || !form.origin || !form.destination) {
      toast.error(t("logistics.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("logistics_shipments").insert({
        seller_id: user.id,
        buyer_id: user.id,
        origin: form.origin,
        destination: form.destination,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        estimated_delivery: form.estimated_delivery || null,
        tracking_notes: form.notes ? [{ date: new Date().toISOString(), note: form.notes }] : null,
      });

      if (error) throw error;
      toast.success(t("logistics.shipmentCreated"));
      onSuccess();
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary" /> {t("logistics.origin")} *
        </Label>
        <Input
          placeholder="Ex: Thiès, Sénégal"
          value={form.origin}
          onChange={e => setForm({ ...form, origin: e.target.value })}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-destructive" /> {t("logistics.destination")} *
        </Label>
        <Input
          placeholder="Ex: Dakar, Sénégal"
          value={form.destination}
          onChange={e => setForm({ ...form, destination: e.target.value })}
          className="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <Package className="w-3.5 h-3.5" /> {t("logistics.weightKg")}
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={form.weight_kg}
            onChange={e => setForm({ ...form, weight_kg: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <Truck className="w-3.5 h-3.5" /> {t("logistics.distanceKm")}
          </Label>
          <Input
            type="number"
            placeholder="0"
            value={form.distance_km}
            onChange={e => setForm({ ...form, distance_km: e.target.value })}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("logistics.estimatedDelivery")}</Label>
        <Input
          type="date"
          value={form.estimated_delivery}
          onChange={e => setForm({ ...form, estimated_delivery: e.target.value })}
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("logistics.notes")}</Label>
        <Textarea
          placeholder={t("logistics.notesPlaceholder")}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          className="rounded-xl resize-none"
          rows={2}
        />
      </div>

      <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={loading}>
        {loading ? t("common.loading") : t("logistics.createShipment")}
      </Button>
    </div>
  );
}
