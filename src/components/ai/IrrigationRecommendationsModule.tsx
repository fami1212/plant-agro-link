import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Droplets, Loader2, AlertTriangle, Leaf, Clock, Beaker } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IrrigationRecommendations {
  irrigation: {
    action_needed: boolean;
    urgency: string;
    water_amount_liters?: number;
    best_time?: string;
    method_recommended?: string;
    frequency?: string;
    duration_minutes?: number;
  };
  fertilization: {
    action_needed: boolean;
    type?: string;
    quantity_kg_per_hectare?: number;
    timing?: string;
    application_method?: string;
  };
  soil_health?: {
    status: string;
    ph_recommendation?: string;
    organic_matter_advice?: string;
  };
  alerts?: string[];
  recommendations?: string[];
  water_savings_tips?: string[];
  next_check_date?: string;
  confidence_score?: number;
  analysis_summary?: string;
}

export function IrrigationRecommendationsModule() {
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<IrrigationRecommendations | null>(null);

  const { data: fields } = useQuery({
    queryKey: ['fields-for-irrigation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: currentCrop } = useQuery({
    queryKey: ['current-crop', selectedFieldId],
    queryFn: async () => {
      if (!selectedFieldId) return null;
      const { data } = await supabase
        .from('crops')
        .select('*')
        .eq('field_id', selectedFieldId)
        .in('status', ['seme', 'en_croissance', 'floraison', 'maturation'])
        .single();
      
      return data;
    },
    enabled: !!selectedFieldId,
  });

  const { data: iotData } = useQuery({
    queryKey: ['iot-data', selectedFieldId],
    queryFn: async () => {
      if (!selectedFieldId) return null;
      
      // Get devices for this field
      const { data: devices } = await supabase
        .from('iot_devices')
        .select('id')
        .eq('field_id', selectedFieldId)
        .eq('is_active', true);

      if (!devices?.length) return null;

      // Get latest readings
      const { data } = await supabase
        .from('device_data')
        .select('*')
        .in('device_id', devices.map(d => d.id))
        .order('recorded_at', { ascending: false })
        .limit(20);
      
      return data;
    },
    enabled: !!selectedFieldId,
  });

  // Fetch weather data from Open-Meteo
  const fetchWeatherData = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,soil_temperature_0cm,soil_moisture_0_to_1cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration&timezone=auto&forecast_days=7`
      );
      
      if (!response.ok) throw new Error('Weather API error');
      
      const data = await response.json();
      return {
        current: {
          temperature: data.current?.temperature_2m,
          humidity: data.current?.relative_humidity_2m,
          precipitation: data.current?.precipitation,
          wind_speed: data.current?.wind_speed_10m,
          soil_temperature: data.current?.soil_temperature_0cm,
          soil_moisture: data.current?.soil_moisture_0_to_1cm,
        },
        forecast: data.daily ? {
          dates: data.daily.time,
          temp_max: data.daily.temperature_2m_max,
          temp_min: data.daily.temperature_2m_min,
          precipitation: data.daily.precipitation_sum,
          precipitation_probability: data.daily.precipitation_probability_max,
          evapotranspiration: data.daily.et0_fao_evapotranspiration,
        } : null,
      };
    } catch (error) {
      console.error('Weather fetch error:', error);
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFieldId) {
      toast.error("Veuillez sélectionner une parcelle");
      return;
    }

    const selectedField = fields?.find(f => f.id === selectedFieldId);
    if (!selectedField) return;

    setIsAnalyzing(true);
    setRecommendations(null);

    try {
      // Fetch weather data - default to Dakar, Senegal coordinates if no GPS
      let weatherData = null;
      const defaultLat = 14.6928;
      const defaultLon = -17.4467;
      
      // Try to parse location_gps if available
      let lat = defaultLat;
      let lon = defaultLon;
      
      if (selectedField.location_gps) {
        // location_gps is a point type, might be in format "(x,y)"
        const gpsStr = String(selectedField.location_gps);
        const match = gpsStr.match(/\(?([-\d.]+),\s*([-\d.]+)\)?/);
        if (match) {
          lat = parseFloat(match[1]);
          lon = parseFloat(match[2]);
        }
      }

      weatherData = await fetchWeatherData(lat, lon);

      const { data, error } = await supabase.functions.invoke('irrigation-recommendations', {
        body: {
          fieldData: selectedField,
          cropData: currentCrop,
          iotData,
          weatherData,
        }
      });

      if (error) throw error;

      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
        toast.success("Recommandations générées avec succès");
      } else {
        throw new Error(data.error || "Erreur lors de l'analyse");
      }
    } catch (error) {
      console.error('Recommendations error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'immédiate':
        return <Badge variant="destructive">Immédiate</Badge>;
      case "aujourd'hui":
        return <Badge variant="outline" className="bg-orange-100 text-orange-700">Aujourd'hui</Badge>;
      case 'cette semaine':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Cette semaine</Badge>;
      case 'non nécessaire':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Non nécessaire</Badge>;
      default:
        return <Badge variant="secondary">{urgency}</Badge>;
    }
  };

  const getSoilStatusBadge = (status: string) => {
    switch (status) {
      case 'bon':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Bon</Badge>;
      case 'moyen':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Moyen</Badge>;
      case 'attention nécessaire':
        return <Badge variant="outline" className="bg-red-100 text-red-700">Attention</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            Recommandations irrigation et fertilisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sélectionner une parcelle</label>
            <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une parcelle..." />
              </SelectTrigger>
              <SelectContent>
                {fields?.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name} - {field.area_hectares} ha ({field.soil_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentCrop && (
            <div className="p-2 bg-muted rounded text-sm">
              <span className="text-muted-foreground">Culture en cours:</span>{" "}
              <span className="font-medium">{currentCrop.name}</span> ({currentCrop.status})
            </div>
          )}

          {iotData && iotData.length > 0 && (
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {iotData.length} mesures IoT disponibles
            </div>
          )}

          <Button 
            onClick={handleAnalyze} 
            disabled={!selectedFieldId || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Droplets className="w-4 h-4 mr-2" />
                Obtenir les recommandations
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {recommendations && (
        <>
          {/* Irrigation Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  Irrigation
                </span>
                {getUrgencyBadge(recommendations.irrigation.urgency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.irrigation.action_needed ? (
                <>
                  {recommendations.irrigation.water_amount_liters && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantité d'eau</span>
                      <span className="font-medium">{recommendations.irrigation.water_amount_liters.toLocaleString()} L</span>
                    </div>
                  )}
                  {recommendations.irrigation.best_time && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Meilleur moment</span>
                      <span className="font-medium">{recommendations.irrigation.best_time}</span>
                    </div>
                  )}
                  {recommendations.irrigation.method_recommended && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Méthode</span>
                      <span className="font-medium">{recommendations.irrigation.method_recommended}</span>
                    </div>
                  )}
                  {recommendations.irrigation.frequency && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fréquence</span>
                      <span className="font-medium">{recommendations.irrigation.frequency}</span>
                    </div>
                  )}
                  {recommendations.irrigation.duration_minutes && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Durée</span>
                      <span className="font-medium">{recommendations.irrigation.duration_minutes} min</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-green-600">Aucune irrigation nécessaire pour le moment</p>
              )}
            </CardContent>
          </Card>

          {/* Fertilization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="w-4 h-4 text-amber-500" />
                Fertilisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.fertilization.action_needed ? (
                <>
                  {recommendations.fertilization.type && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type d'engrais</span>
                      <span className="font-medium">{recommendations.fertilization.type}</span>
                    </div>
                  )}
                  {recommendations.fertilization.quantity_kg_per_hectare && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Quantité</span>
                      <span className="font-medium">{recommendations.fertilization.quantity_kg_per_hectare} kg/ha</span>
                    </div>
                  )}
                  {recommendations.fertilization.timing && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Moment</span>
                      <span className="font-medium">{recommendations.fertilization.timing}</span>
                    </div>
                  )}
                  {recommendations.fertilization.application_method && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Application</span>
                      <span className="font-medium">{recommendations.fertilization.application_method}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-green-600">Aucune fertilisation nécessaire pour le moment</p>
              )}
            </CardContent>
          </Card>

          {/* Soil Health */}
          {recommendations.soil_health && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-green-500" />
                    Santé du sol
                  </span>
                  {getSoilStatusBadge(recommendations.soil_health.status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.soil_health.ph_recommendation && (
                  <p className="text-sm text-muted-foreground">{recommendations.soil_health.ph_recommendation}</p>
                )}
                {recommendations.soil_health.organic_matter_advice && (
                  <p className="text-sm text-muted-foreground">{recommendations.soil_health.organic_matter_advice}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {recommendations.alerts && recommendations.alerts.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  Alertes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {recommendations.alerts.map((alert, i) => (
                    <li key={i} className="text-sm text-red-700">⚠️ {alert}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.recommendations && recommendations.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conseils</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {recommendations.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Water savings */}
          {recommendations.water_savings_tips && recommendations.water_savings_tips.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  Économies d'eau
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {recommendations.water_savings_tips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground">💧 {tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {recommendations.analysis_summary && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm italic text-muted-foreground">{recommendations.analysis_summary}</p>
                {recommendations.next_check_date && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Prochaine vérification: {new Date(recommendations.next_check_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!fields?.length && (
        <Card>
          <CardContent className="text-center py-8">
            <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucune parcelle active. Ajoutez des parcelles pour obtenir des recommandations.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
