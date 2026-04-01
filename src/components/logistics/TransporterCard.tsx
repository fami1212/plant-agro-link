import { Truck, Star, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";

interface TransporterCardProps {
  transporter: {
    id: string;
    company_name: string;
    vehicle_type: string;
    capacity_kg?: number | null;
    service_areas?: string[] | null;
    phone?: string | null;
    rating: number;
    price_per_km?: number | null;
    is_available: boolean;
  };
  onContact?: (id: string) => void;
}

export function TransporterCard({ transporter, onContact }: TransporterCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{transporter.company_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{transporter.vehicle_type}</span>
            {transporter.capacity_kg && <span>· {transporter.capacity_kg}kg max</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-xs font-medium">{transporter.rating.toFixed(1)}</span>
        </div>
      </div>

      {transporter.service_areas && transporter.service_areas.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {transporter.service_areas.slice(0, 3).map(a => (
            <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {transporter.price_per_km && (
          <p className="text-sm font-semibold text-primary">{transporter.price_per_km} FCFA/km</p>
        )}
        <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={() => onContact?.(transporter.id)}>
          <Phone className="w-3.5 h-3.5" /> {t("logistics.contact")}
        </Button>
      </div>
    </div>
  );
}
