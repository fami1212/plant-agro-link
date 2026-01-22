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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIoTData, SensorReading } from "@/hooks/useIoTData";

interface SensorConfig {
  metric: string;
  min: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const sensorConfigs: SensorConfig[] = [
  { metric: "temperature", min: 15, max: 35, unit: "°C", icon: <Thermometer className="w-5 h-5" />, label: "Température", color: "text-orange-500" },
  { metric: "humidity", min: 30, max: 80, unit: "%", icon: <Droplets className="w-5 h-5" />, label: "Humidité Air", color: "text-blue-500" },
  { metric: "soil_moisture", min: 20, max: 70, unit: "%", icon: <Droplets className="w-5 h-5" />, label: "Humidité Sol", color: "text-cyan-500" },
  { metric: "light", min: 200, max: 1000, unit: "lux", icon: <Sun className="w-5 h-5" />, label: "Luminosité", color: "text-yellow-500" },
  { metric: "ph", min: 5.5, max: 7.5, unit: "pH", icon: <Activity className="w-5 h-5" />, label: "pH Sol", color: "text-purple-500" },
  { metric: "wind_speed", min: 0, max: 50, unit: "km/h", icon: <Wind className="w-5 h-5" />, label: "Vent", color: "text-teal-500" },
];

interface IoTDashboardProps {
  compact?: boolean;
}

export function IoTDashboard({ compact = false }: IoTDashboardProps) {
  const { devices, sensorData, alerts, loading, isRefreshing, lastUpdate, fetchData } = useIoTData();

  const getSensorReading = (metric: string): SensorReading | undefined => {
    return sensorData.find((d) => d.metric === metric);
  };

  const getProgressValue = (reading: SensorReading | undefined, config: SensorConfig) => {
    if (!reading) return 0;
    const range = config.max - config.min;
    const value = ((reading.value - config.min) / range) * 100;
    return Math.max(0, Math.min(100, value));
  };

  const getValueStatus = (reading: SensorReading | undefined, config: SensorConfig) => {
    if (!reading) return "neutral";
    if (reading.value < config.min || reading.value > config.max) return "danger";
    const midpoint = (config.min + config.max) / 2;
    const tolerance = (config.max - config.min) * 0.2;
    if (Math.abs(reading.value - midpoint) < tolerance) return "optimal";
    return "normal";
  };

  const unresolvedAlerts = alerts.filter((a) => !a.is_resolved);
  const activeDevices = devices.filter((d) => d.is_active);

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Capteurs IoT
            </CardTitle>
            <Badge 
              variant={unresolvedAlerts.length > 0 ? "destructive" : "secondary"} 
              className="text-xs outdoor-badge"
            >
              {unresolvedAlerts.length > 0 ? `${unresolvedAlerts.length} alerte${unresolvedAlerts.length > 1 ? "s" : ""}` : "Normal"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {sensorConfigs.slice(0, 3).map((config) => {
                  const reading = getSensorReading(config.metric);
                  const status = getValueStatus(reading, config);
                  
                  return (
                    <div key={config.metric} className="text-center">
                      <div className={cn("text-2xl font-bold", config.color)}>
                        {reading ? reading.value.toFixed(1) : "--"}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">{config.unit}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
                      {status === "danger" && (
                        <AlertTriangle className="w-3 h-3 text-destructive mx-auto mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {unresolvedAlerts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{unresolvedAlerts[0].message}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{activeDevices.length} appareil{activeDevices.length > 1 ? "s" : ""} en ligne</span>
                <span>{lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </>
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
      {unresolvedAlerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {unresolvedAlerts.length} alerte{unresolvedAlerts.length > 1 ? "s" : ""} détectée{unresolvedAlerts.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {unresolvedAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="text-sm flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
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
        {sensorConfigs.map((config) => {
          const reading = getSensorReading(config.metric);
          const status = getValueStatus(reading, config);
          const progress = getProgressValue(reading, config);
          
          return (
            <Card key={config.metric} className={cn(
              "transition-all",
              status === "danger" && "border-destructive/50 dark:border-destructive/70"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-lg bg-muted dark:bg-muted/50", config.color)}>
                    {config.icon}
                  </div>
                  {status === "danger" && (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className={cn("text-2xl font-bold", config.color)}>
                    {reading ? reading.value.toFixed(1) : "--"}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{config.unit}</span>
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
                    <span>{config.min}{config.unit}</span>
                    <span>{config.max}{config.unit}</span>
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
                <Badge 
                  variant={device.is_active ? "default" : "secondary"}
                  className="outdoor-badge"
                >
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
