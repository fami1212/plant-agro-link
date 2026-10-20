import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  RefreshCw,
  Loader2,
  MapPin,
  Sprout,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface InvestmentWithIoT {
  id: string;
  title: string;
  farmer_id: string;
  farmer_name: string;
  field_id: string | null;
  crop_id: string | null;
  crop_name: string | null;
  field_name: string | null;
  status: string;
  amount_invested: number;
  expected_harvest_date: string | null;
  devices: DeviceData[];
}

interface DeviceData {
  id: string;
  name: string;
  device_type: string;
  is_active: boolean;
  last_seen_at: string | null;
  metrics: MetricData[];
}

interface MetricData {
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

const metricIcons: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="w-4 h-4" />,
  humidity: <Droplets className="w-4 h-4" />,
  soil_humidity: <Droplets className="w-4 h-4" />,
  luminosity: <Sun className="w-4 h-4" />,
  wind_speed: <Wind className="w-4 h-4" />,
};

const metricLabels: Record<string, string> = {
  temperature: "Température",
  humidity: "Humidité",
  soil_humidity: "Humidité sol",
  luminosity: "Luminosité",
  wind_speed: "Vent",
  ph: "pH",
};

const metricColors: Record<string, string> = {
  temperature: "text-orange-500",
  humidity: "text-blue-500",
  soil_humidity: "text-cyan-500",
  luminosity: "text-yellow-500",
  wind_speed: "text-gray-500",
  ph: "text-purple-500",
};

export function InvestmentIoTMonitor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<InvestmentWithIoT[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_investor_sensor_feed");
      if (error) throw error;
      const map = new Map<string, InvestmentWithIoT>();
      (data || []).forEach((r: any) => {
        let inv = map.get(r.investment_id);
        if (!inv) {
          inv = {
            id: r.investment_id, title: r.title, farmer_id: r.farmer_id,
            farmer_name: r.farmer_name || "Utilisateur", field_id: r.field_id, crop_id: null,
            crop_name: r.crop_name, field_name: r.field_name, status: r.status,
            amount_invested: Number(r.amount_invested), expected_harvest_date: r.expected_harvest_date,
            devices: [],
          };
          map.set(r.investment_id, inv);
        }
        if (!r.device_id) return;
        let dev = inv.devices.find((d) => d.id === r.device_id);
        if (!dev) {
          dev = { id: r.device_id, name: r.device_name, device_type: r.device_type,
            is_active: !!r.is_active, last_seen_at: r.last_seen_at, metrics: [] };
          inv.devices.push(dev);
        }
        if (r.metric) dev.metrics.push({ metric: r.metric, value: Number(r.value), unit: r.unit, recorded_at: r.recorded_at });
      });
      setInvestments(Array.from(map.values()));
    } catch (error) {
      console.error("Error fetching IoT data:", error);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (investments.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="w-8 h-8" />}
        title="Aucun investissement actif"
        description="Investissez dans des projets pour suivre leurs données IoT"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Relevés des capteurs par agriculteur
        </h3>
        <Button variant="ghost" size="icon" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {investments.map((inv) => (
        <Card key={inv.id} className="overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{inv.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Sprout className="w-3.5 h-3.5" />
                  <span>{inv.farmer_name}</span>
                  {inv.field_name && (
                    <>
                      <span>•</span>
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{inv.field_name}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {(inv.amount_invested / 1000).toFixed(0)}k FCFA
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {inv.devices.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun capteur IoT sur cette parcelle</p>
                <p className="text-xs opacity-70">Les données seront disponibles quand l'agriculteur installera des capteurs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inv.devices.map((device) => (
                  <div key={device.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          device.is_active ? "bg-success animate-pulse" : "bg-muted-foreground"
                        )} />
                        <span className="font-medium text-sm">{device.name}</span>
                      </div>
                      {device.last_seen_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(device.last_seen_at), "dd/MM HH:mm", { locale: fr })}
                        </span>
                      )}
                    </div>

                    {device.metrics.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Aucune donnée disponible
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {device.metrics.map((metric, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded bg-background"
                          >
                            <div className={cn("p-1.5 rounded", metricColors[metric.metric] || "text-primary")}>
                              {metricIcons[metric.metric] || <Activity className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold">
                                {metric.value.toFixed(1)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">
                                  {metric.unit || ""}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {metricLabels[metric.metric] || metric.metric}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {inv.expected_harvest_date && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Récolte prévue</span>
                  <span className="font-medium">
                    {format(new Date(inv.expected_harvest_date), "dd MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
