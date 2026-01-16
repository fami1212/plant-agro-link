import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Droplets,
  Bug,
  Sun,
  TrendingUp,
  Heart,
  CloudRain,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  title: string;
  message: string;
  action: string;
  priority: "haute" | "moyenne" | "basse";
  category: "irrigation" | "maladie" | "recolte" | "meteo" | "betail" | "marche";
}

interface PriorityAction {
  title: string;
  description: string;
  urgency: "immediate" | "today" | "this_week";
}

interface SentinelData {
  healthScore: number;
  alerts: Alert[];
  priorityActions: PriorityAction[];
  insights: {
    irrigation: string;
    crops: string;
    livestock?: string;
  };
}

const categoryIcons: Record<string, React.ReactNode> = {
  irrigation: <Droplets className="w-4 h-4" />,
  maladie: <Bug className="w-4 h-4" />,
  recolte: <Sun className="w-4 h-4" />,
  meteo: <CloudRain className="w-4 h-4" />,
  betail: <Heart className="w-4 h-4" />,
  marche: <TrendingUp className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  warning: "bg-warning/20 text-warning border-warning/30",
  danger: "bg-destructive/20 text-destructive border-destructive/30",
  info: "bg-primary/20 text-primary border-primary/30",
  success: "bg-success/20 text-success border-success/30",
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  haute: { label: "Urgent", color: "bg-destructive text-destructive-foreground" },
  moyenne: { label: "Important", color: "bg-warning text-warning-foreground" },
  basse: { label: "Info", color: "bg-muted text-muted-foreground" },
};

export function SmartAlerts() {
  const { user } = useAuth();
  const [data, setData] = useState<SentinelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSentinelData();
    }
  }, [user]);

  const fetchSentinelData = async () => {
    if (!user) return;

    try {
      // Fetch user's farm data
      const [fieldsRes, cropsRes, livestockRes, iotRes] = await Promise.all([
        supabase.from("fields").select("*").eq("user_id", user.id),
        supabase.from("crops").select("*").eq("user_id", user.id),
        supabase.from("livestock").select("*").eq("user_id", user.id),
        supabase.from("device_data").select("*, iot_devices!inner(owner_id)")
          .eq("iot_devices.owner_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(50),
      ]);

      // Fetch weather data (using Open-Meteo)
      let weatherData = null;
      try {
        const weatherRes = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=14.69&longitude=-17.44&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FDakar&forecast_days=7"
        );
        if (weatherRes.ok) {
          weatherData = await weatherRes.json();
        }
      } catch (e) {
        console.log("Weather fetch failed, continuing without weather data");
      }

      // Call AI Farm Sentinel
      const { data: sentinelResult, error } = await supabase.functions.invoke("ai-farm-sentinel", {
        body: {
          crops: cropsRes.data || [],
          fields: fieldsRes.data || [],
          iotData: iotRes.data || [],
          livestock: livestockRes.data || [],
          weatherData,
        },
      });

      if (error) throw error;

      if (sentinelResult.success) {
        setData({
          healthScore: sentinelResult.healthScore || 75,
          alerts: sentinelResult.alerts || [],
          priorityActions: sentinelResult.priorityActions || [],
          insights: sentinelResult.insights || {},
        });
      }
    } catch (error) {
      console.error("Error fetching sentinel data:", error);
      // Set default data on error
      setData({
        healthScore: 75,
        alerts: [],
        priorityActions: [],
        insights: {
          irrigation: "Vérifiez l'humidité du sol",
          crops: "Vos cultures progressent normalement",
        },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info("Actualisation des alertes IA...");
    await fetchSentinelData();
    toast.success("Alertes mises à jour");
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Analyse IA en cours...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Bon";
    if (score >= 40) return "À surveiller";
    return "Critique";
  };

  return (
    <div className="space-y-4">
      {/* Health Score Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">IA Sentinel</h3>
                <p className="text-xs text-muted-foreground">Analyse prédictive</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className={cn("text-4xl font-bold", getHealthScoreColor(data.healthScore))}>
                  {data.healthScore}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Score de santé: <span className={getHealthScoreColor(data.healthScore)}>
                  {getHealthScoreLabel(data.healthScore)}
                </span>
              </p>
            </div>
            <div className="w-20 h-20 relative">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
                  fill="none"
                  stroke={data.healthScore >= 80 ? "hsl(var(--success))" : data.healthScore >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${data.healthScore * 2.2} 220`}
                />
              </svg>
              <ShieldCheck className={cn(
                "w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                getHealthScoreColor(data.healthScore)
              )} />
            </div>
          </div>
        </div>
      </Card>

      {/* Priority Actions */}
      {data.priorityActions && data.priorityActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Actions prioritaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.priorityActions.slice(0, 3).map((action, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border-l-4",
                  action.urgency === "immediate" ? "border-l-destructive bg-destructive/5" :
                  action.urgency === "today" ? "border-l-warning bg-warning/5" :
                  "border-l-primary bg-primary/5"
                )}
              >
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Smart Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Alertes intelligentes</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {data.alerts.length} alertes
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-3 rounded-lg border flex items-start gap-3",
                  typeColors[alert.type]
                )}
              >
                <div className="mt-0.5">
                  {categoryIcons[alert.category] || <AlertTriangle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px]", priorityLabels[alert.priority]?.color)}
                    >
                      {priorityLabels[alert.priority]?.label}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80">{alert.message}</p>
                  {alert.action && (
                    <p className="text-xs font-medium mt-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {alert.action}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Insights */}
      {data.insights && (
        <div className="grid grid-cols-1 gap-3">
          {data.insights.irrigation && (
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Irrigation</p>
                  <p className="text-sm font-medium">{data.insights.irrigation}</p>
                </div>
              </div>
            </Card>
          )}
          {data.insights.crops && (
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cultures</p>
                  <p className="text-sm font-medium">{data.insights.crops}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
