import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Wifi, WifiOff, History, ShieldAlert } from "lucide-react";
import { LiveSensorFeed } from "@/components/iot/LiveSensorFeed";
import { toast } from "sonner";

interface Device {
  id: string;
  name: string | null;
  device_type: string;
  is_active: boolean | null;
  last_seen_at: string | null;
  owner_id: string;
}

interface LogEntry {
  id: string;
  device_id: string | null;
  device_token: string | null;
  status: string;
  accepted_count: number;
  rejected_count: number;
  reason: string | null;
  rejected: { reading: any; reason: string }[];
  created_at: string;
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  accepted: { label: "Accepté", variant: "default" },
  partial: { label: "Partiel", variant: "outline" },
  rejected: { label: "Rejeté", variant: "destructive" },
};

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR");

/** Gestion admin des capteurs : statut, historique des envois, relevés rejetés. */
export function AdminDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [owners, setOwners] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data }, { data: logData }] = await Promise.all([
      supabase
        .from("iot_devices")
        .select("id, name, device_type, is_active, last_seen_at, owner_id")
        .order("last_seen_at", { ascending: false, nullsFirst: false }),
      supabase.from("iot_ingest_log").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const list = (data as Device[]) || [];
    setDevices(list);
    setLogs((logData as unknown as LogEntry[]) || []);
    const ids = [...new Set(list.map((d) => d.owner_id))];
    if (ids.length) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => (map[p.user_id] = p.full_name || "Utilisateur"));
      setOwners(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-ingest-log")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "iot_ingest_log" }, (p) =>
        setLogs((prev) => [p.new as LogEntry, ...prev].slice(0, 200)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const toggle = async (d: Device) => {
    const next = !d.is_active;
    const { error } = await supabase.from("iot_devices").update({ is_active: next }).eq("id", d.id);
    if (error) return toast.error("Mise à jour impossible");
    setDevices((prev) => prev.map((x) => (x.id === d.id ? { ...x, is_active: next } : x)));
    toast.success(next ? "Capteur activé" : "Capteur désactivé : ses envois seront refusés");
  };

  const nameOf = (id: string | null, token: string | null) => {
    const d = devices.find((x) => x.id === id);
    return d ? d.name || d.device_type : token ? `Jeton inconnu (${token.slice(0, 10)}…)` : "Capteur";
  };

  const rejectedItems = logs.flatMap((l) =>
    (l.rejected?.length ? l.rejected : l.status === "rejected" ? [{ reading: null, reason: l.reason || "Rejeté" }] : []).map(
      (r, i) => ({ key: `${l.id}-${i}`, log: l, ...r }),
    ),
  );

  const activeCount = devices.filter((d) => d.is_active).length;
  const since = Date.now() - 24 * 3600_000;
  const recent = logs.filter((l) => Date.parse(l.created_at) > since);
  const rejected24 = recent.reduce((s, l) => s + (l.rejected_count || (l.status === "rejected" ? 1 : 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Capteurs</p>
          <p className="text-lg font-bold">{devices.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Actifs</p>
          <p className="text-lg font-bold text-primary">{activeCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Rejets 24 h</p>
          <p className="text-lg font-bold text-destructive">{rejected24}</p>
        </Card>
      </div>

      <Tabs defaultValue="devices">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="devices">Capteurs</TabsTrigger>
          <TabsTrigger value="history">Envois</TabsTrigger>
          <TabsTrigger value="rejected">Rejets</TabsTrigger>
          <TabsTrigger value="live">Direct</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
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
              <CardContent className="space-y-2 pt-4">
                {devices.map((d) => {
                  const dl = logs.filter((l) => l.device_id === d.id);
                  const rej = dl.reduce((s, l) => s + (l.rejected_count || 0), 0);
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          {d.is_active ? (
                            <Wifi className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          {d.name || d.device_type}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {owners[d.owner_id] || "Utilisateur"} · {dl.length} envois · {rej} rejets
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.last_seen_at ? `Vu le ${fmt(d.last_seen_at)}` : "Jamais vu"}
                        </p>
                      </div>
                      <Switch checked={!!d.is_active} onCheckedChange={() => toggle(d)} aria-label="Activer le capteur" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Historique des envois
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[32rem] overflow-y-auto">
              {logs.length === 0 && <p className="text-sm text-muted-foreground">Aucun envoi reçu.</p>}
              {logs.map((l) => {
                const s = STATUS_LABEL[l.status] ?? STATUS_LABEL.accepted;
                return (
                  <div key={l.id} className="border rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{nameOf(l.device_id, l.device_token)}</span>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmt(l.created_at)} · {l.accepted_count} acceptés · {l.rejected_count} rejetés
                      {l.reason && ` · ${l.reason}`}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" /> Relevés rejetés
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Les relevés invalides (valeur non numérique, hors plage, date future, capteur inconnu ou désactivé)
                sont refusés automatiquement et ne sont pas enregistrés.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[32rem] overflow-y-auto">
              {rejectedItems.length === 0 && <p className="text-sm text-muted-foreground">Aucun relevé rejeté.</p>}
              {rejectedItems.map((r) => (
                <div key={r.key} className="border border-destructive/30 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{nameOf(r.log.device_id, r.log.device_token)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{fmt(r.log.created_at)}</span>
                  </div>
                  <p className="text-xs text-destructive">{r.reason}</p>
                  {r.reading && (
                    <p className="text-xs text-muted-foreground truncate">
                      {String(r.reading.metric ?? "?")} = {String(r.reading.value ?? "?")} {r.reading.unit ?? ""}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live">
          <LiveSensorFeed devices={devices} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
