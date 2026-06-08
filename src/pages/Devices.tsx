import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Wifi, WifiOff, Copy, Send, Trash2, Cpu } from "lucide-react";
import { toast } from "sonner";

interface Device {
  id: string;
  name: string | null;
  device_type: string;
  device_token: string;
  is_active: boolean | null;
  last_seen_at: string | null;
}

const SENSOR_METRICS = [
  { value: "temperature", unit: "°C" },
  { value: "humidity", unit: "%" },
  { value: "soil_moisture", unit: "%" },
  { value: "ph", unit: "pH" },
  { value: "light", unit: "lux" },
  { value: "wind_speed", unit: "km/h" },
];

export default function Devices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDev, setNewDev] = useState({ name: "", device_type: "soil_sensor", device_token: "" });

  const [testDevice, setTestDevice] = useState<Device | null>(null);
  const [testMetric, setTestMetric] = useState("temperature");
  const [testValue, setTestValue] = useState("25");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("iot_devices")
      .select("id, name, device_type, device_token, is_active, last_seen_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur de chargement");
    setDevices((data as Device[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const genToken = () => {
    const t = "dev_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
    setNewDev((p) => ({ ...p, device_token: t }));
  };

  const handleAdd = async () => {
    if (!user) return;
    if (!newDev.name || !newDev.device_token) {
      toast.error("Nom et token requis");
      return;
    }
    const { error } = await supabase.from("iot_devices").insert({
      owner_id: user.id,
      name: newDev.name,
      device_type: newDev.device_type,
      device_token: newDev.device_token,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Appareil ajouté");
    setShowAdd(false);
    setNewDev({ name: "", device_type: "soil_sensor", device_token: "" });
    load();
  };

  const toggleActive = async (d: Device) => {
    const { error } = await supabase
      .from("iot_devices")
      .update({ is_active: !d.is_active })
      .eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success(d.is_active ? "Désactivé" : "Activé");
    load();
  };

  const remove = async (d: Device) => {
    if (!confirm(`Supprimer ${d.name} ?`)) return;
    const { error } = await supabase.from("iot_devices").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    load();
  };

  const copyToken = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Token copié");
  };

  const sendTest = async () => {
    if (!testDevice) return;
    setSending(true);
    try {
      const unit = SENSOR_METRICS.find((m) => m.value === testMetric)?.unit;
      const { data, error } = await supabase.functions.invoke("iot-test-emit", {
        body: {
          device_token: testDevice.device_token,
          metric: testMetric,
          value: parseFloat(testValue),
          unit,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Lecture envoyée ✓");
      setTestDevice(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Devices IoT"
        subtitle={`${devices.length} appareil(s) enregistré(s)`}
        action={
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="icon" variant="hero"><Plus className="w-5 h-5" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvel appareil</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nom</Label>
                  <Input value={newDev.name} onChange={(e) => setNewDev({ ...newDev, name: e.target.value })} placeholder="Capteur parcelle nord" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newDev.device_type} onValueChange={(v) => setNewDev({ ...newDev, device_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soil_sensor">Capteur sol</SelectItem>
                      <SelectItem value="weather_station">Station météo</SelectItem>
                      <SelectItem value="greenhouse_sensor">Capteur serre</SelectItem>
                      <SelectItem value="water_sensor">Capteur eau</SelectItem>
                      <SelectItem value="light_sensor">Capteur lumière</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Device token</Label>
                  <div className="flex gap-2">
                    <Input value={newDev.device_token} onChange={(e) => setNewDev({ ...newDev, device_token: e.target.value })} placeholder="dev_xxxxxxxxxxxx" />
                    <Button type="button" variant="outline" onClick={genToken}>Générer</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ce token doit être configuré sur l'appareil pour publier ses lectures.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
                <Button onClick={handleAdd}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="px-4 pb-24 space-y-3">
        {loading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Chargement…</CardContent></Card>
        ) : devices.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-2">
            <Cpu className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucun appareil enregistré</p>
          </CardContent></Card>
        ) : (
          devices.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {d.is_active ? <Wifi className="w-4 h-4 text-success" /> : <WifiOff className="w-4 h-4 text-muted-foreground" />}
                    {d.name || d.device_type}
                  </CardTitle>
                  <Badge variant={d.is_active ? "default" : "secondary"}>
                    {d.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">{d.device_token}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToken(d.device_token)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Type: <span className="capitalize">{d.device_type.replace("_", " ")}</span>
                  {d.last_seen_at && <> · Dernier signal: {new Date(d.last_seen_at).toLocaleString("fr-FR")}</>}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={!!d.is_active} onCheckedChange={() => toggleActive(d)} />
                    <span className="text-xs">{d.is_active ? "Activé" : "Désactivé"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTestDevice(d)}>
                      <Send className="w-4 h-4 mr-1" /> Tester
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(d)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!testDevice} onOpenChange={(o) => !o && setTestDevice(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Envoyer une lecture test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Appareil: <b>{testDevice?.name}</b></p>
            <div>
              <Label>Métrique</Label>
              <Select value={testMetric} onValueChange={setTestMetric}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SENSOR_METRICS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.value} ({m.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur</Label>
              <Input type="number" step="0.1" value={testValue} onChange={(e) => setTestValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDevice(null)}>Annuler</Button>
            <Button onClick={sendTest} disabled={sending}>
              <Send className="w-4 h-4 mr-2" /> {sending ? "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}