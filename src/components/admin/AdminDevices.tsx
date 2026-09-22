import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, Wifi, WifiOff } from "lucide-react";
import { LiveSensorFeed } from "@/components/iot/LiveSensorFeed";

interface Device {
  id: string;
  name: string | null;
  device_type: string;
  is_active: boolean | null;
  last_seen_at: string | null;
  owner_id: string;
}

/** Vue admin : tous les capteurs connectés + flux des relevés en direct. */
export function AdminDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("iot_devices")
        .select("id, name, device_type, is_active, last_seen_at, owner_id")
        .order("last_seen_at", { ascending: false, nullsFirst: false });
      const list = (data as Device[]) || [];
      setDevices(list);

      const ids = [...new Set(list.map((d) => d.owner_id))];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        (profiles || []).forEach((p: any) => {
          map[p.user_id] = p.full_name || "Utilisateur";
        });
        setOwners(map);
      }
      setLoading(false);
    })();
  }, []);

  const activeCount = devices.filter((d) => d.is_active).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Capteurs enregistrés</p>
          <p className="text-lg font-bold">{devices.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Capteurs actifs</p>
          <p className="text-lg font-bold text-green-600">{activeCount}</p>
        </Card>
      </div>

      <LiveSensorFeed devices={devices} />

      {loading ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Chargement…</CardContent></Card>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Cpu className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun capteur enregistré sur la plateforme</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary" /> Capteurs connectés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {d.is_active ? (
                      <Wifi className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    {d.name || d.device_type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {owners[d.owner_id] || "Utilisateur"} ·{" "}
                    <span className="capitalize">{d.device_type.replace("_", " ")}</span>
                    {d.last_seen_at && <> · {new Date(d.last_seen_at).toLocaleString("fr-FR")}</>}
                  </p>
                </div>
                <Badge variant={d.is_active ? "default" : "secondary"} className="shrink-0">
                  {d.is_active ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
