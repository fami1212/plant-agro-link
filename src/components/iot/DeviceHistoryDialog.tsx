import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  device: { id: string; name: string | null; device_type: string } | null;
  onClose: () => void;
}

export function DeviceHistoryDialog({ device, onClose }: Props) {
  const [readings, setReadings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!device) return;
    let active = true;
    const load = () => {
      setLoading(true);
      setFailed(false);
      Promise.all([
      supabase.from("device_data").select("id, metric, value, unit, recorded_at")
        .eq("device_id", device.id).order("recorded_at", { ascending: false }).limit(100),
      supabase.from("iot_ingest_log").select("id, status, accepted_count, rejected_count, reason, rejected, created_at")
        .eq("device_id", device.id).order("created_at", { ascending: false }).limit(100),
    ]).then(([r, l]) => {
      if (!active) return;
      setFailed(!!r.error || !!l.error);
      setReadings(r.data || []);
      setLogs(l.data || []);
      setLoading(false);
      }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    };
    load();
    const channel = supabase.channel(`device-history-${device.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_data', filter: `device_id=eq.${device.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_ingest_log', filter: `device_id=eq.${device.id}` }, load)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [device, refresh]);

  const rejects = logs.flatMap((l) =>
    (Array.isArray(l.rejected) && l.rejected.length ? l.rejected : l.status === "rejected" ? [{ reason: l.reason }] : [])
      .map((x: any, i: number) => ({ key: `${l.id}-${i}`, at: l.created_at, ...x }))
  );

  const fmt = (d: string) => new Date(d).toLocaleString("fr-FR");

  return (
    <Dialog open={!!device} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Historique — {device?.name || device?.device_type}</DialogTitle></DialogHeader>
        <Tabs defaultValue="readings" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="readings">Relevés ({readings.length})</TabsTrigger>
            <TabsTrigger value="sends">Envois ({logs.length})</TabsTrigger>
            <TabsTrigger value="rejects">Rejets ({rejects.length})</TabsTrigger>
          </TabsList>
          {loading ? <p className="text-sm text-muted-foreground p-4 text-center">Chargement…</p> : <>
            <TabsContent value="readings" className="overflow-y-auto space-y-1">
              {readings.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Aucun relevé</p>}
              {readings.map((r) => (
                <div key={r.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                  <span>{r.metric}</span>
                  <span className="font-medium">{Number(r.value).toFixed(1)} {r.unit}</span>
                  <span className="text-xs text-muted-foreground">{fmt(r.recorded_at)}</span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="sends" className="overflow-y-auto space-y-1">
              {logs.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Aucun envoi</p>}
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                  <Badge variant={l.status === "accepted" ? "default" : l.status === "partial" ? "secondary" : "destructive"}>
                    {l.status === "accepted" ? "Accepté" : l.status === "partial" ? "Partiel" : "Rejeté"}
                  </Badge>
                  <span className="text-xs">{l.accepted_count} ok · {l.rejected_count} rejet(s)</span>
                  <span className="text-xs text-muted-foreground">{fmt(l.created_at)}</span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="rejects" className="overflow-y-auto space-y-1">
              {rejects.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">Aucun relevé refusé</p>}
              {rejects.map((x) => (
                <div key={x.key} className="text-sm p-2 rounded border border-destructive/30 bg-destructive/5">
                  <div className="flex justify-between">
                    <span>{x.reading?.metric ?? x.metric ?? "—"} {(x.reading?.value ?? x.value) !== undefined ? `= ${x.reading?.value ?? x.value}` : ""}</span>
                    <span className="text-xs text-muted-foreground">{fmt(x.at)}</span>
                  </div>
                  <p className="text-xs text-destructive">{x.reason || "Refusé"}</p>
                </div>
              ))}
            </TabsContent>
          </>}
        </Tabs>
        {failed && <div role="alert"><p className="text-sm text-destructive">Historique indisponible</p><Button variant="outline" onClick={() => setRefresh(v => v + 1)}>Réessayer</Button></div>}
      </DialogContent>
    </Dialog>
  );
}
