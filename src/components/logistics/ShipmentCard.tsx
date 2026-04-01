import { Package, MapPin, Truck, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

interface ShipmentCardProps {
  shipment: {
    id: string;
    origin: string;
    destination: string;
    status: string;
    weight_kg?: number | null;
    pickup_date?: string | null;
    estimated_delivery?: string | null;
    created_at: string;
  };
  onClick?: () => void;
}

const statusSteps = ["en_preparation", "en_transit", "livre"];
const statusIcons: Record<string, any> = {
  en_preparation: Package,
  en_transit: Truck,
  livre: CheckCircle2,
  annule: Clock,
};

export function ShipmentCard({ shipment, onClick }: ShipmentCardProps) {
  const { t } = useLanguage();
  const currentStep = statusSteps.indexOf(shipment.status);
  const Icon = statusIcons[shipment.status] || Package;

  const statusColors: Record<string, string> = {
    en_preparation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    en_transit: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    livre: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    annule: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <button onClick={onClick} className="w-full bg-card rounded-2xl border border-border/30 p-4 text-left space-y-3 hover:shadow-soft transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground">#{shipment.id.slice(0, 8)}</span>
        </div>
        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusColors[shipment.status])}>
          {t(`logistics.status.${shipment.status}`)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{shipment.origin}</span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate">{shipment.destination}</span>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1">
        {statusSteps.map((step, i) => (
          <div key={step} className="flex items-center flex-1">
            <div className={cn("h-1.5 flex-1 rounded-full", i <= currentStep ? "bg-primary" : "bg-muted")} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {shipment.weight_kg && <span>{shipment.weight_kg} kg</span>}
        {shipment.estimated_delivery && <span>{t("logistics.eta")}: {new Date(shipment.estimated_delivery).toLocaleDateString()}</span>}
      </div>
    </button>
  );
}
