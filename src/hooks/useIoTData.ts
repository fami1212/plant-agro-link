import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface IoTDevice {
  id: string;
  name: string | null;
  device_type: string;
  device_token: string;
  is_active: boolean | null;
  last_seen_at: string | null;
  field_id: string | null;
  field?: { name: string } | null;
}

export interface SensorReading {
  id: string;
  device_id: string;
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

export interface IoTAlert {
  id: string;
  device_id: string;
  metric: string;
  message: string;
  severity: string | null;
  current_value: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  is_resolved: boolean | null;
  created_at: string;
}

export interface AlertConfig {
  id: string;
  metric: string;
  min_value: number | null;
  max_value: number | null;
  is_enabled: boolean | null;
  notification_sms: boolean | null;
  notification_push: boolean | null;
  device_id: string | null;
}

interface UseIoTDataReturn {
  devices: IoTDevice[];
  sensorData: SensorReading[];
  alerts: IoTAlert[];
  alertConfigs: AlertConfig[];
  loading: boolean;
  isRefreshing: boolean;
  lastUpdate: Date;
  fetchData: () => Promise<void>;
  addDevice: (device: { name: string; device_type: string; device_token: string; field_id?: string }) => Promise<boolean>;
  updateAlertConfig: (config: Partial<AlertConfig> & { metric: string }) => Promise<boolean>;
  resolveAlert: (alertId: string) => Promise<boolean>;
}

const SENSOR_METRICS = [
  { metric: "temperature", unit: "°C", min: 15, max: 35 },
  { metric: "humidity", unit: "%", min: 30, max: 80 },
  { metric: "soil_moisture", unit: "%", min: 20, max: 70 },
  { metric: "ph", unit: "pH", min: 5.5, max: 7.5 },
  { metric: "light", unit: "lux", min: 200, max: 1000 },
  { metric: "wind_speed", unit: "km/h", min: 0, max: 50 },
];

// Génère des données de démonstration réalistes
const generateDemoData = () => {
  const now = new Date();
  const devices: IoTDevice[] = [
    { id: "demo-weather-1", name: "Station Météo Principale", device_type: "weather_station", device_token: "WS-001", is_active: true, last_seen_at: now.toISOString(), field_id: null },
    { id: "demo-soil-1", name: "Capteur Sol Nord", device_type: "soil_sensor", device_token: "SS-001", is_active: true, last_seen_at: now.toISOString(), field_id: null },
    { id: "demo-soil-2", name: "Capteur Sol Sud", device_type: "soil_sensor", device_token: "SS-002", is_active: true, last_seen_at: new Date(now.getTime() - 300000).toISOString(), field_id: null },
  ];

  const sensorData: SensorReading[] = [];
  const metricValues: Record<string, number> = {
    temperature: 26 + Math.random() * 6,
    humidity: 50 + Math.random() * 25,
    soil_moisture: 35 + Math.random() * 20,
    ph: 6 + Math.random() * 1.2,
    light: 450 + Math.random() * 350,
    wind_speed: 8 + Math.random() * 12,
  };

  SENSOR_METRICS.forEach((m, i) => {
    sensorData.push({
      id: `demo-data-${i}`,
      device_id: devices[i % devices.length].id,
      metric: m.metric,
      value: metricValues[m.metric],
      unit: m.unit,
      recorded_at: now.toISOString(),
    });
  });

  const alerts: IoTAlert[] = [];
  // Générer des alertes basées sur les valeurs actuelles
  if (metricValues.soil_moisture < 25) {
    alerts.push({
      id: "demo-alert-1",
      device_id: "demo-soil-1",
      metric: "soil_moisture",
      message: `Humidité sol critique: ${metricValues.soil_moisture.toFixed(1)}%`,
      severity: "critical",
      current_value: metricValues.soil_moisture,
      threshold_min: 25,
      threshold_max: 70,
      is_resolved: false,
      created_at: now.toISOString(),
    });
  }
  if (metricValues.temperature > 32) {
    alerts.push({
      id: "demo-alert-2",
      device_id: "demo-weather-1",
      metric: "temperature",
      message: `Température élevée: ${metricValues.temperature.toFixed(1)}°C`,
      severity: "warning",
      current_value: metricValues.temperature,
      threshold_min: 15,
      threshold_max: 32,
      is_resolved: false,
      created_at: new Date(now.getTime() - 1800000).toISOString(),
    });
  }

  return { devices, sensorData, alerts };
};

export function useIoTData(): UseIoTDataReturn {
  const { user } = useAuth();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);

    if (!user) {
      // Données de démonstration si pas connecté
      const demo = generateDemoData();
      setDevices(demo.devices);
      setSensorData(demo.sensorData);
      setAlerts(demo.alerts);
      setLastUpdate(new Date());
      setLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      // 1. Récupérer les appareils
      const { data: realDevices, error: devicesError } = await supabase
        .from("iot_devices")
        .select("*, field:fields(name)")
        .eq("owner_id", user.id);

      if (devicesError) throw devicesError;

      if (realDevices && realDevices.length > 0) {
        setDevices(realDevices as IoTDevice[]);

        const deviceIds = realDevices.map((d) => d.id);

        // 2. Récupérer les dernières données de chaque capteur
        const { data: latestData, error: dataError } = await supabase
          .from("device_data")
          .select("*")
          .in("device_id", deviceIds)
          .order("recorded_at", { ascending: false })
          .limit(100);

        if (dataError) throw dataError;

        if (latestData && latestData.length > 0) {
          // Garder uniquement la dernière lecture pour chaque métrique/appareil
          const uniqueReadings = new Map<string, SensorReading>();
          latestData.forEach((reading) => {
            const key = `${reading.device_id}-${reading.metric}`;
            if (!uniqueReadings.has(key)) {
              uniqueReadings.set(key, reading);
            }
          });
          setSensorData(Array.from(uniqueReadings.values()));
        } else {
          // Générer des données de démo pour les appareils existants
          const demoReadings = generateDemoData().sensorData.map((r, i) => ({
            ...r,
            device_id: realDevices[i % realDevices.length].id,
          }));
          setSensorData(demoReadings);
        }

        // 3. Récupérer les alertes non résolues
        const { data: realAlerts, error: alertsError } = await supabase
          .from("iot_alerts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_resolved", false)
          .order("created_at", { ascending: false });

        if (!alertsError && realAlerts) {
          setAlerts(realAlerts);
        }

        // 4. Récupérer les configurations d'alertes
        const { data: configs, error: configsError } = await supabase
          .from("iot_alert_configs")
          .select("*")
          .eq("user_id", user.id);

        if (!configsError && configs) {
          setAlertConfigs(configs as AlertConfig[]);
        }
      } else {
        // Utiliser les données de démo
        const demo = generateDemoData();
        setDevices(demo.devices);
        setSensorData(demo.sensorData);
        setAlerts(demo.alerts);
      }
    } catch (error) {
      console.error("Erreur chargement IoT:", error);
      // Fallback aux données de démo
      const demo = generateDemoData();
      setDevices(demo.devices);
      setSensorData(demo.sensorData);
      setAlerts(demo.alerts);
    }

    setLastUpdate(new Date());
    setLoading(false);
    setIsRefreshing(false);
  }, [user]);

  const addDevice = useCallback(async (device: { name: string; device_type: string; device_token: string; field_id?: string }) => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("iot_devices").insert({
        owner_id: user.id,
        name: device.name,
        device_type: device.device_type,
        device_token: device.device_token,
        field_id: device.field_id || null,
        is_active: true,
      });

      if (error) throw error;
      await fetchData();
      return true;
    } catch (error) {
      console.error("Erreur ajout appareil:", error);
      return false;
    }
  }, [user, fetchData]);

  const updateAlertConfig = useCallback(async (config: Partial<AlertConfig> & { metric: string }) => {
    if (!user) return false;

    try {
      const existingConfig = alertConfigs.find((c) => c.metric === config.metric);
      
      if (existingConfig) {
        const { error } = await supabase
          .from("iot_alert_configs")
          .update({
            min_value: config.min_value,
            max_value: config.max_value,
            is_enabled: config.is_enabled,
            notification_sms: config.notification_sms,
            notification_push: config.notification_push,
          })
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("iot_alert_configs").insert({
          user_id: user.id,
          metric: config.metric,
          min_value: config.min_value,
          max_value: config.max_value,
          is_enabled: config.is_enabled ?? true,
          notification_sms: config.notification_sms ?? false,
          notification_push: config.notification_push ?? true,
        });

        if (error) throw error;
      }

      await fetchData();
      return true;
    } catch (error) {
      console.error("Erreur mise à jour config:", error);
      return false;
    }
  }, [user, alertConfigs, fetchData]);

  const resolveAlert = useCallback(async (alertId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("iot_alerts")
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", alertId);

      if (error) throw error;
      
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      return true;
    } catch (error) {
      console.error("Erreur résolution alerte:", error);
      return false;
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Souscrire aux mises à jour temps réel
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("iot-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "device_data" },
        (payload) => {
          const newReading = payload.new as SensorReading;
          setSensorData((prev) => {
            const filtered = prev.filter(
              (r) => !(r.device_id === newReading.device_id && r.metric === newReading.metric)
            );
            return [newReading, ...filtered];
          });
          setLastUpdate(new Date());
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "iot_alerts" },
        (payload) => {
          setAlerts((prev) => [payload.new as IoTAlert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
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
  };
}
