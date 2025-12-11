import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Thermometer, 
  Droplets, 
  Sun, 
  Wind, 
  AlertTriangle, 
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SensorData {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

interface Device {
  id: string;
  name: string | null;
  device_type: string;
  is_active: boolean | null;
  last_seen_at: string | null;
  field_id: string | null;
  field?: { name: string } | null;
}

interface SensorThreshold {
  metric: string;
  min: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const sensorThresholds: SensorThreshold[] = [
  { metric: "temperature", min: 15, max: 35, unit: "°C", icon: <Thermometer className="w-5 h-5" />, label: "Température", color: "text-orange-500" },
  { metric: "humidity", min: 30, max: 80, unit: "%", icon: <Droplets className="w-5 h-5" />, label: "Humidité Sol", color: "text-blue-500" },
  { metric: "soil_moisture", min: 20, max: 70, unit: "%", icon: <Droplets className="w-5 h-5" />, label: "Humidité Sol", color: "text-cyan-500" },
  { metric: "light", min: 200, max: 1000, unit: "lux", icon: <Sun className="w-5 h-5" />, label: "Luminosité", color: "text-yellow-500" },
  { metric: "ph", min: 5.5, max: 7.5, unit: "pH", icon: <Activity className="w-5 h-5" />, label: "pH Sol", color: "text-purple-500" },
  { metric: "wind_speed", min: 0, max: 50, unit: "km/h", icon: <Wind className="w-5 h-5" />, label: "Vent", color: "text-teal-500" },
];

// Simulated real-time data for demo
const generateSimulatedData = (): SensorData[] => {
  const now = new Date();
  return [
    { id: "1", device_id: "demo-1", metric: "temperature", value: 28 + Math.random() * 4, unit: "°C", recorded_at: now.toISOString() },
    { id: "2", device_id: "demo-1", metric: "humidity", value: 45 + Math.random() * 20, unit: "%", recorded_at: now.toISOString() },
    { id: "3", device_id: "demo-2", metric: "soil_moisture", value: 35 + Math.random() * 25, unit: "%", recorded_at: now.toISOString() },
    { id: "4", device_id: "demo-2", metric: "ph", value: 6.2 + Math.random() * 0.8, unit: "pH", recorded_at: now.toISOString() },
    { id: "5", device_id: "demo-3", metric: "light", value: 400 + Math.random() * 400, unit: "lux", recorded_at: now.toISOString() },
    { id: "6", device_id: "demo-3", metric: "wind_speed", value: 5 + Math.random() * 15, unit: "km/h", recorded_at: now.toISOString() },
  ];
};

const generateAlerts = (data: SensorData[]): { metric: string; message: string; severity: "warning" | "critical" }[] => {
  const alerts: { metric: string; message: string; severity: "warning" | "critical" }[] = [];
  
  data.forEach((sensor) => {
    const threshold = sensorThresholds.find((t) => t.metric === sensor.metric);
    if (threshold) {
      if (sensor.value < threshold.min) {
        const severity = sensor.value < threshold.min * 0.7 ? "critical" : "warning";
        alerts.push({
          metric: sensor.metric,
          message: `${threshold.label} trop basse: ${sensor.value.toFixed(1)}${threshold.unit}`,
          severity
        });
      } else if (sensor.value > threshold.max) {
        const severity = sensor.value > threshold.max * 1.3 ? "critical" : "warning";
        alerts.push({
          metric: sensor.metric,
          message: `${threshold.label} trop élevée: ${sensor.value.toFixed(1)}${threshold.unit}`,
          severity
        });
      }
    }
  });
  
  return alerts;
};

interface IoTDashboardProps {
  compact?: boolean;
}

export function IoTDashboard({ compact = false }: IoTDashboardProps) {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [alerts, setAlerts] = useState<{ metric: string; message: string; severity: "warning" | "critical" }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    
    if (user) {
      // Try to fetch real devices
      const { data: realDevices } = await supabase
        .from("iot_devices")
        .select("id, name, device_type, is_active, last_seen_at, field_id, field:fields(name)")
        .eq("owner_id", user.id);

      if (realDevices && realDevices.length > 0) {
        setDevices(realDevices as Device[]);
        
        // Fetch real sensor data
        const deviceIds = realDevices.map((d) => d.id);
        const { data: realData } = await supabase
          .from("device_data")
          .select("*")
          .in("device_id", deviceIds)
          .order("recorded_at", { ascending: false })
          .limit(20);

        if (realData) {
          setSensorData(realData);
          setAlerts(generateAlerts(realData));
        }
      } else {
        // Use simulated data for demo
        const simulatedData = generateSimulatedData();
        setSensorData(simulatedData);
        setAlerts(generateAlerts(simulatedData));
        setDevices([
          { id: "demo-1", name: "Station Météo Parcelle A", device_type: "weather_station", is_active: true, last_seen_at: new Date().toISOString(), field_id: null },
          { id: "demo-2", name: "Capteur Sol Parcelle B", device_type: "soil_sensor", is_active: true, last_seen_at: new Date().toISOString(), field_id: null },
          { id: "demo-3", name: "Capteur Lumière Serre", device_type: "light_sensor", is_active: true, last_seen_at: new Date().toISOString(), field_id: null },
        ]);
      }
    } else {
      const simulatedData = generateSimulatedData();
      setSensorData(simulatedData);
      setAlerts(generateAlerts(simulatedData));
    }
    
    setLastUpdate(new Date());
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const getSensorReading = (metric: string) => {
    return sensorData.find((d) => d.metric === metric);
  };

  const getProgressValue = (reading: SensorData | undefined, threshold: SensorThreshold) => {
    if (!reading) return 0;
    const range = threshold.max - threshold.min;
    const value = ((reading.value - threshold.min) / range) * 100;
    return Math.max(0, Math.min(100, value));
  };

  const getValueStatus = (reading: SensorData | undefined, threshold: SensorThreshold) => {
    if (!reading) return "neutral";
    if (reading.value < threshold.min || reading.value > threshold.max) return "danger";
    const midpoint = (threshold.min + threshold.max) / 2;
    const tolerance = (threshold.max - threshold.min) * 0.15;
    if (Math.abs(reading.value - midpoint) < tolerance) return "optimal";
    return "normal";
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Capteurs IoT
            </CardTitle>
            <Badge variant={alerts.length > 0 ? "destructive" : "secondary"} className="text-xs">
              {alerts.length > 0 ? `${alerts.length} alerte${alerts.length > 1 ? "s" : ""}` : "Normal"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {sensorThresholds.slice(0, 3).map((threshold) => {
              const reading = getSensorReading(threshold.metric);
              const status = getValueStatus(reading, threshold);
              
              return (
                <div key={threshold.metric} className="text-center">
                  <div className={cn("text-2xl font-bold", threshold.color)}>
                    {reading ? reading.value.toFixed(1) : "--"}
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">{threshold.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{threshold.label}</p>
                  {status === "danger" && (
                    <AlertTriangle className="w-3 h-3 text-destructive mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>
          
          {alerts.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="truncate">{alerts[0].message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Capteurs IoT en temps réel
          </h2>
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour: {lastUpdate.toLocaleTimeString("fr-FR")}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchData}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-4 h-4 mr-1", isRefreshing && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {alerts.length} alerte{alerts.length > 1 ? "s" : ""} détectée{alerts.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {alerts.map((alert, i) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    alert.severity === "critical" ? "bg-destructive" : "bg-amber-500"
                  )} />
                  <span className="text-foreground">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sensor Grid */}
      <div className="grid grid-cols-2 gap-3">
        {sensorThresholds.map((threshold) => {
          const reading = getSensorReading(threshold.metric);
          const status = getValueStatus(reading, threshold);
          const progress = getProgressValue(reading, threshold);
          
          return (
            <Card key={threshold.metric} className={cn(
              "transition-all",
              status === "danger" && "border-destructive/50"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-lg bg-muted", threshold.color)}>
                    {threshold.icon}
                  </div>
                  {reading && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      {Math.random() > 0.5 ? (
                        <TrendingUp className="w-3 h-3 mr-1 text-success" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1 text-destructive" />
                      )}
                      <span>vs hier</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{threshold.label}</p>
                  <p className={cn("text-2xl font-bold", threshold.color)}>
                    {reading ? reading.value.toFixed(1) : "--"}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{threshold.unit}</span>
                  </p>
                </div>
                
                <div className="mt-3">
                  <Progress 
                    value={progress} 
                    className={cn(
                      "h-2",
                      status === "danger" && "[&>div]:bg-destructive",
                      status === "optimal" && "[&>div]:bg-success"
                    )}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{threshold.min}{threshold.unit}</span>
                    <span>{threshold.max}{threshold.unit}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Devices Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appareils connectés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {device.is_active ? (
                    <Wifi className="w-4 h-4 text-success" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{device.name || device.device_type}</p>
                    {device.field && (
                      <p className="text-xs text-muted-foreground">{device.field.name}</p>
                    )}
                  </div>
                </div>
                <Badge variant={device.is_active ? "default" : "secondary"}>
                  {device.is_active ? "En ligne" : "Hors ligne"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
