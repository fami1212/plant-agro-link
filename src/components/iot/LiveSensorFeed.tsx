import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Radio } from "lucide-react";

interface Reading {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

interface Props {
  /** Appareils de l'utilisateur : id -> nom affiché */
  devices: { id: string; name: string | null; device_type: string }[];
}

/** Flux temps réel des mesures reçues via l'endpoint iot-webhook (HMAC). */
export function LiveSensorFeed({ devices }: Props) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [live, setLive] = useState(false);

  const deviceIds = devices.map((d) => d.id);
  const nameOf = (id: string) => {
    const d = devices.find((x) => x.id === id);
    return d?.name || d?.device_type || "Capteur";
  };

  useEffect(() => {
    if (deviceIds.length === 0) {
      setReadings([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("device_data")
        .select("id, device_id, metric, value, unit, recorded_at")
        .in("device_id", deviceIds)
        .order("recorded_at", { ascending: false })
        .limit(30);
      if (!cancelled) setReadings((data as Reading[]) || []);
    })();

    const channel = supabase
      .channel("devices-live-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "device_data" },
        (payload) => {
          const r = payload.new as Reading;
          if (!deviceIds.includes(r.device_id)) return;
          setReadings((prev) => [r, ...prev].slice(0, 30));
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceIds.join(",")]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Flux en direct
          </span>
          <Badge variant={live ? "default" : "secondary"} className="gap-1">
            <Radio className="w-3 h-3" /> {live ? "En direct" : "Connexion…"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune mesure reçue pour l'instant. Envoyez une lecture signée vers l'endpoint ci-dessus
            (ou utilisez « Tester ») : elle apparaîtra ici instantanément.
          </p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {readings.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm border rounded-lg px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate">{nameOf(r.device_id)}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {r.metric.replace("_", " ")} ·{" "}
                    {new Date(r.recorded_at).toLocaleTimeString("fr-FR")}
                  </p>
                </div>
                <span className="font-semibold shrink-0">
                  {Number(r.value).toFixed(1)} {r.unit ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
