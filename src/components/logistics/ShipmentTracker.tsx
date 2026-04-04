import { Package, Truck, CheckCircle2, Clock, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

interface ShipmentTrackerProps {
  shipment: {
    id: string;
    origin: string;
    destination: string;
    status: string;
    weight_kg?: number | null;
    pickup_date?: string | null;
    estimated_delivery?: string | null;
    delivery_date?: string | null;
    created_at: string;
    tracking_notes?: any;
  };
}

const steps = [
  { key: "en_preparation", icon: Package, label: "logistics.status.en_preparation" },
  { key: "en_transit", icon: Truck, label: "logistics.status.en_transit" },
  { key: "livre", icon: CheckCircle2, label: "logistics.status.livre" },
];

export function ShipmentTracker({ shipment }: ShipmentTrackerProps) {
  const { t } = useLanguage();
  const isCancelled = shipment.status === "annule";
  const currentIdx = steps.findIndex(s => s.key === shipment.status);

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t("logistics.tracking")}</h3>
        <span className="text-xs font-mono text-muted-foreground">#{shipment.id.slice(0, 8)}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <span>{shipment.origin}</span>
        <span className="text-muted-foreground">→</span>
        <span>{shipment.destination}</span>
      </div>

      {isCancelled ? (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl">
          <X className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">{t("logistics.status.annule")}</span>
        </div>
      ) : (
        <div className="relative">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isDone = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={step.key} className="flex items-start gap-3 relative">
                {/* Vertical line */}
                {i < steps.length - 1 && (
                  <div className={cn(
                    "absolute left-[15px] top-[32px] w-0.5 h-8",
                    i < currentIdx ? "bg-primary" : "bg-muted"
                  )} />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
                  isDone ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  isCurrent && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="pb-8">
                  <p className={cn("text-sm font-medium", isDone ? "text-foreground" : "text-muted-foreground")}>
                    {t(step.label)}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.key === "en_preparation" && shipment.pickup_date && `${t("logistics.pickup")}: ${new Date(shipment.pickup_date).toLocaleDateString()}`}
                      {step.key === "en_transit" && shipment.estimated_delivery && `${t("logistics.eta")}: ${new Date(shipment.estimated_delivery).toLocaleDateString()}`}
                      {step.key === "livre" && shipment.delivery_date && `${new Date(shipment.delivery_date).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-border/20">
        {shipment.weight_kg && <span>{shipment.weight_kg} kg</span>}
        <span>{t("logistics.created")}: {new Date(shipment.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
