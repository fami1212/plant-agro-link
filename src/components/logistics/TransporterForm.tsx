import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

interface TransporterFormProps {
  onSuccess?: () => void;
}

export function TransporterForm({ onSuccess }: TransporterFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    company_name: "",
    vehicle_type: "camion",
    capacity_kg: "",
    phone: "",
    whatsapp: "",
    price_per_km: "",
    service_areas: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !form.company_name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("logistics_transporters").insert({
      user_id: user.id,
      company_name: form.company_name,
      vehicle_type: form.vehicle_type,
      capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      price_per_km: form.price_per_km ? parseFloat(form.price_per_km) : null,
      service_areas: form.service_areas ? form.service_areas.split(",").map(s => s.trim()) : null,
      is_available: true,
      rating: 5,
    });
    setLoading(false);
    if (error) { toast.error(t("common.error")); return; }
    toast.success(t("logistics.transporterCreated"));
    onSuccess?.();
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("logistics.companyName")}
        value={form.company_name}
        onChange={e => setForm({ ...form, company_name: e.target.value })}
      />
      <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="camion">{t("logistics.vehicleType.camion")}</SelectItem>
          <SelectItem value="camionnette">{t("logistics.vehicleType.camionnette")}</SelectItem>
          <SelectItem value="moto">{t("logistics.vehicleType.moto")}</SelectItem>
          <SelectItem value="tricycle">{t("logistics.vehicleType.tricycle")}</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder={t("logistics.capacityKg")}
        value={form.capacity_kg}
        onChange={e => setForm({ ...form, capacity_kg: e.target.value })}
      />
      <Input
        placeholder={t("logistics.phone")}
        value={form.phone}
        onChange={e => setForm({ ...form, phone: e.target.value })}
      />
      <Input
        type="number"
        placeholder={t("logistics.pricePerKm")}
        value={form.price_per_km}
        onChange={e => setForm({ ...form, price_per_km: e.target.value })}
      />
      <Input
        placeholder={t("logistics.serviceAreas")}
        value={form.service_areas}
        onChange={e => setForm({ ...form, service_areas: e.target.value })}
      />
      <Button className="w-full" onClick={handleSubmit} disabled={loading || !form.company_name.trim()}>
        {loading ? t("common.loading") : t("common.create")}
      </Button>
    </div>
  );
}
