import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Wifi,
  WifiOff,
  Plus,
  Settings,
  Bell,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Clock,
  Save,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useIoTData } from "@/hooks/useIoTData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const sensorTypes = [
  { metric: "temperature", label: "Température", unit: "°C", icon: Thermometer, color: "text-orange-500", defaultMin: 15, defaultMax: 35 },
  { metric: "humidity", label: "Humidité Air", unit: "%", icon: Droplets, color: "text-blue-500", defaultMin: 30, defaultMax: 80 },
  { metric: "soil_moisture", label: "Humidité Sol", unit: "%", icon: Droplets, color: "text-cyan-500", defaultMin: 20, defaultMax: 70 },
  { metric: "ph", label: "pH Sol", unit: "pH", icon: Activity, color: "text-purple-500", defaultMin: 5.5, defaultMax: 7.5 },
  { metric: "light", label: "Luminosité", unit: "lux", icon: Sun, color: "text-yellow-500", defaultMin: 200, defaultMax: 1000 },
  { metric: "wind_speed", label: "Vent", unit: "km/h", icon: Wind, color: "text-teal-500", defaultMin: 0, defaultMax: 50 },
];

// Generate simulated historical data
const generateHistoricalData = (metric: string, hours: number = 24) => {
  const data = [];
  const now = new Date();
  const baseValues: Record<string, { base: number; variance: number }> = {
    temperature: { base: 28, variance: 8 },
    humidity: { base: 55, variance: 25 },
    soil_moisture: { base: 45, variance: 20 },
    ph: { base: 6.5, variance: 0.8 },
    light: { base: 600, variance: 400 },
    wind_speed: { base: 12, variance: 10 },
  };
  
  const config = baseValues[metric] || { base: 50, variance: 20 };
  
  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourFactor = Math.sin((time.getHours() / 24) * Math.PI * 2);
    data.push({
      time: time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      value: config.base + hourFactor * config.variance * 0.5 + (Math.random() - 0.5) * config.variance,
    });
  }
  return data;
};

export default function IoT() {
  const {
    devices,
    sensorData,
    alerts,
    alertConfigs,
    loading,
    isRefreshing,
    lastUpdate,
    fetchData,
    addDevice,
    updateAlertConfig,
    resolveAlert,
  } = useIoTData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedMetric, setSelectedMetric] = useState("temperature");
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showConfigAlert, setShowConfigAlert] = useState(false);

  const [newDevice, setNewDevice] = useState({
    name: "",
    device_type: "soil_sensor",
    device_token: "",
  });

  const [editingConfig, setEditingConfig] = useState({
    metric: "temperature",
    min: "15",
    max: "35",
    enabled: true,
    sms: false,
    push: true,
  });

  useEffect(() => {
    setHistoricalData(generateHistoricalData(selectedMetric));
  }, [selectedMetric]);

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.device_token) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const success = await addDevice(newDevice);
    if (success) {
      toast.success("Appareil ajouté avec succès");
      setShowAddDevice(false);
      setNewDevice({ name: "", device_type: "soil_sensor", device_token: "" });
    } else {
      toast.error("Erreur lors de l'ajout de l'appareil");
    }
  };

  const handleSaveAlertConfig = async () => {
    const success = await updateAlertConfig({
      metric: editingConfig.metric,
      min_value: parseFloat(editingConfig.min),
      max_value: parseFloat(editingConfig.max),
      is_enabled: editingConfig.enabled,
      notification_sms: editingConfig.sms,
      notification_push: editingConfig.push,
    });

    if (success) {
      toast.success("Configuration d'alerte sauvegardée");
      setShowConfigAlert(false);
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    const success = await resolveAlert(alertId);
    if (success) {
      toast.success("Alerte résolue");
    } else {
      toast.error("Erreur lors de la résolution");
    }
  };

  const getSensorReading = (metric: string) => {
    return sensorData.find((d) => d.metric === metric);
  };

  const getDeviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      soil_sensor: "Capteur Sol",
      weather_station: "Station Météo",
      greenhouse_sensor: "Capteur Serre",
      water_sensor: "Capteur Eau",
      light_sensor: "Capteur Lumière",
    };
    return labels[type] || type;
  };

  const activeDevices = devices.filter((d) => d.is_active);
  const unresolvedAlerts = alerts.filter((a) => !a.is_resolved);

  return (
    <AppLayout>
      <PageHeader
        title="Capteurs IoT"
        subtitle={`${activeDevices.length} appareil${activeDevices.length > 1 ? "s" : ""} en ligne`}
        action={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="hero" size="icon" onClick={() => setShowAddDevice(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      {/* AI Contextual Tip */}
      <div className="px-4 mb-4">
        <AIContextualTip 
          context="iot" 
          data={{ devicesCount: devices.length, activeDevices: activeDevices.length, alerts: unresolvedAlerts.length }} 
        />
      </div>

      {/* Quick Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 dark:bg-primary/20 dark:border-primary/30">
            <p className="text-xs text-muted-foreground font-medium">Appareils</p>
            <p className="text-lg font-bold text-foreground">{devices.length}</p>
          </div>
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-success/10 border border-success/20 dark:bg-success/20 dark:border-success/30">
            <p className="text-xs text-muted-foreground font-medium">En ligne</p>
            <p className="text-lg font-bold text-success">{activeDevices.length}</p>
          </div>
          <div className={cn(
            "flex-shrink-0 px-4 py-3 rounded-xl",
            unresolvedAlerts.length > 0 
              ? "bg-destructive/10 border border-destructive/20 dark:bg-destructive/20 dark:border-destructive/40" 
              : "bg-muted border border-border"
          )}>
            <p className="text-xs text-muted-foreground font-medium">Alertes</p>
            <p className={cn("text-lg font-bold", unresolvedAlerts.length > 0 ? "text-destructive" : "text-foreground")}>
              {unresolvedAlerts.length}
            </p>
          </div>
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-muted border border-border">
            <p className="text-xs text-muted-foreground font-medium">Mise à jour</p>
            <p className="text-sm font-semibold text-foreground">
              {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="dashboard" className="text-xs">
              <Activity className="w-4 h-4 mr-1" />
              Live
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <BarChart3 className="w-4 h-4 mr-1" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="devices" className="text-xs">
              <Wifi className="w-4 h-4 mr-1" />
              Appareils
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">
              <Bell className="w-4 h-4 mr-1" />
              Alertes
            </TabsTrigger>
          </TabsList>

          {/* LIVE DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sensorTypes.map((type) => {
                  const Icon = type.icon;
                  const reading = getSensorReading(type.metric);
                  const value = reading?.value ?? 0;
                  const isLow = value < type.defaultMin;
                  const isHigh = value > type.defaultMax;
                  const status = isLow || isHigh ? "danger" : "normal";
                  
                  return (
                    <Card 
                      key={type.metric} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        status === "danger" && "border-destructive/50 dark:border-destructive/70"
                      )}
                      onClick={() => {
                        setSelectedMetric(type.metric);
                        setActiveTab("history");
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn("p-2 rounded-lg bg-muted dark:bg-muted/50", type.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          {status === "danger" && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{type.label}</p>
                        <p className={cn("text-2xl font-bold", type.color)}>
                          {reading ? value.toFixed(1) : "--"}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {type.unit}
                          </span>
                        </p>
                        <Progress 
                          value={((value - type.defaultMin) / (type.defaultMax - type.defaultMin)) * 100} 
                          className={cn("h-1.5 mt-2", status === "danger" && "[&>div]:bg-destructive")}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {sensorTypes.map((type) => (
                <button
                  key={type.metric}
                  onClick={() => setSelectedMetric(type.metric)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all",
                    selectedMetric === type.metric
                      ? "gradient-hero text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {sensorTypes.find((t) => t.metric === selectedMetric)?.label} - 24h
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                        stroke="hsl(var(--muted-foreground))"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                        stroke="hsl(var(--muted-foreground))"
                        domain={['auto', 'auto']}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingDown className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">
                    {Math.min(...historicalData.map((d) => d.value)).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Min</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Activity className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">
                    {(historicalData.reduce((a, b) => a + b.value, 0) / historicalData.length).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Moyenne</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold">
                    {Math.max(...historicalData.map((d) => d.value)).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Max</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DEVICES */}
          <TabsContent value="devices" className="space-y-4">
            {devices.length === 0 ? (
              <EmptyState
                icon={<Wifi className="w-8 h-8" />}
                title="Aucun appareil"
                description="Ajoutez vos capteurs IoT pour commencer à surveiller vos parcelles"
                action={{
                  label: "Ajouter un appareil",
                  onClick: () => setShowAddDevice(true),
                }}
              />
            ) : (
              <div className="space-y-3">
                {devices.map((device) => (
                  <Card key={device.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            device.is_active ? "bg-success/15 dark:bg-success/25" : "bg-muted"
                          )}>
                            {device.is_active ? (
                              <Wifi className="w-5 h-5 text-success" />
                            ) : (
                              <WifiOff className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{device.name || "Appareil sans nom"}</p>
                            <p className="text-sm text-muted-foreground">
                              {getDeviceTypeLabel(device.device_type)}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={device.is_active ? "default" : "secondary"}
                          className="outdoor-badge"
                        >
                          {device.is_active ? "En ligne" : "Hors ligne"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {device.last_seen_at 
                              ? new Date(device.last_seen_at).toLocaleString("fr-FR")
                              : "Jamais vu"}
                          </span>
                        </div>
                        {device.field && (
                          <span className="text-xs bg-muted px-2 py-1 rounded-full">
                            {device.field.name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ALERTS */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Configuration des alertes</h3>
              <Button variant="outline" size="sm" onClick={() => setShowConfigAlert(true)}>
                <Settings className="w-4 h-4 mr-1" />
                Configurer
              </Button>
            </div>

            {unresolvedAlerts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-success" />
                  </div>
                  <p className="font-medium text-foreground">Aucune alerte active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tous vos capteurs fonctionnent normalement
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className={cn(
                    "border-l-4",
                    alert.severity === "critical" ? "border-l-destructive" : "border-l-amber-500",
                    alert.is_resolved && "opacity-50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn(
                            "w-5 h-5 mt-0.5 flex-shrink-0",
                            alert.severity === "critical" ? "text-destructive" : "text-amber-500"
                          )} />
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.created_at).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </div>
                        {!alert.is_resolved && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            Résoudre
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Device Dialog */}
      <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un appareil</DialogTitle>
            <DialogDescription>
              Configurez un nouveau capteur IoT
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nom de l'appareil</Label>
              <Input
                placeholder="Ex: Capteur Parcelle Nord"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Type d'appareil</Label>
              <Select
                value={newDevice.device_type}
                onValueChange={(value) => setNewDevice({ ...newDevice, device_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soil_sensor">Capteur Sol</SelectItem>
                  <SelectItem value="weather_station">Station Météo</SelectItem>
                  <SelectItem value="greenhouse_sensor">Capteur Serre</SelectItem>
                  <SelectItem value="water_sensor">Capteur Eau</SelectItem>
                  <SelectItem value="light_sensor">Capteur Lumière</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Token de l'appareil</Label>
              <Input
                placeholder="Token unique fourni avec l'appareil"
                value={newDevice.device_token}
                onChange={(e) => setNewDevice({ ...newDevice, device_token: e.target.value })}
              />
            </div>
            <Button className="w-full" onClick={handleAddDevice}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter l'appareil
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Config Dialog */}
      <Dialog open={showConfigAlert} onOpenChange={setShowConfigAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuration des alertes</DialogTitle>
            <DialogDescription>
              Définissez les seuils d'alerte pour chaque métrique
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Métrique</Label>
              <Select
                value={editingConfig.metric}
                onValueChange={(value) => {
                  const type = sensorTypes.find((t) => t.metric === value);
                  const existingConfig = alertConfigs.find((c) => c.metric === value);
                  setEditingConfig({
                    metric: value,
                    min: existingConfig?.min_value?.toString() || String(type?.defaultMin || 0),
                    max: existingConfig?.max_value?.toString() || String(type?.defaultMax || 100),
                    enabled: existingConfig?.is_enabled ?? true,
                    sms: existingConfig?.notification_sms ?? false,
                    push: existingConfig?.notification_push ?? true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sensorTypes.map((type) => (
                    <SelectItem key={type.metric} value={type.metric}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Seuil minimum</Label>
                <Input
                  type="number"
                  value={editingConfig.min}
                  onChange={(e) => setEditingConfig({ ...editingConfig, min: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Seuil maximum</Label>
                <Input
                  type="number"
                  value={editingConfig.max}
                  onChange={(e) => setEditingConfig({ ...editingConfig, max: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label>Alertes activées</Label>
                <Switch
                  checked={editingConfig.enabled}
                  onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notification SMS</Label>
                <Switch
                  checked={editingConfig.sms}
                  onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, sms: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Notification Push</Label>
                <Switch
                  checked={editingConfig.push}
                  onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, push: checked })}
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleSaveAlertConfig}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
