import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Droplets, Wind, Thermometer, CloudRain, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeatherData {
  location: string;
  current: {
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    weatherLabel: string;
    weatherIcon: string;
  };
  forecast: {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    precipProbability: number;
  }[];
  recommendations: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async (lat?: number, lon?: number) => {
    setLoading(true);
    try {
      // Try to get user position
      if (!lat && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } catch {
          // Fallback to Dakar
        }
      }

      const { data, error } = await supabase.functions.invoke("weather-data", {
        body: { latitude: lat, longitude: lon },
      });

      if (error) throw error;
      if (data?.success) setWeather(data);
    } catch (e) {
      console.error("Weather error:", e);
      toast.error("Impossible de charger la météo");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Chargement météo...</span>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="space-y-3">
      {/* Current Weather */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground">{weather.location}</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl">{weather.current.weatherIcon}</span>
                <div>
                  <p className="text-2xl font-bold">{weather.current.temperature}°C</p>
                  <p className="text-xs text-muted-foreground">{weather.current.weatherLabel}</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchWeather()} className="h-8 w-8">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-background/60">
              <Droplets className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
              <p className="text-xs font-medium">{weather.current.humidity}%</p>
              <p className="text-[10px] text-muted-foreground">Humidité</p>
            </div>
            <div className="p-2 rounded-lg bg-background/60">
              <CloudRain className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
              <p className="text-xs font-medium">{weather.current.precipitation}mm</p>
              <p className="text-[10px] text-muted-foreground">Pluie</p>
            </div>
            <div className="p-2 rounded-lg bg-background/60">
              <Wind className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
              <p className="text-xs font-medium">{weather.current.windSpeed}km/h</p>
              <p className="text-[10px] text-muted-foreground">Vent</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 7-day Forecast */}
      <Card>
        <CardContent className="p-3">
          <p className="text-sm font-semibold mb-2">Prévisions 7 jours</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {weather.forecast.map((day, i) => {
              const d = new Date(day.date);
              return (
                <div key={day.date} className="flex-shrink-0 w-14 text-center p-1.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] font-medium">{i === 0 ? "Auj." : dayNames[d.getDay()]}</p>
                  <div className="my-1">
                    <Thermometer className="w-3 h-3 mx-auto text-muted-foreground" />
                  </div>
                  <p className="text-xs font-bold">{Math.round(day.tempMax)}°</p>
                  <p className="text-[10px] text-muted-foreground">{Math.round(day.tempMin)}°</p>
                  {day.precipitation > 0 && (
                    <Badge variant="outline" className="text-[8px] mt-1 px-1 py-0">
                      {day.precipitation}mm
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {weather.recommendations && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium mb-1">Conseils IA basés sur la météo</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{weather.recommendations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
