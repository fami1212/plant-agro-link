import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, TrendingUp, AlertTriangle, Calendar, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface YieldPrediction {
  predicted_yield_kg: number;
  predicted_yield_per_hectare?: number;
  confidence_score: number;
  yield_range?: {
    min_kg: number;
    max_kg: number;
  };
  factors_positive?: string[];
  factors_negative?: string[];
  recommendations?: string[];
  weather_impact?: string;
  disease_risk?: string;
  optimal_harvest_date?: string;
  analysis_summary?: string;
}

export function YieldPredictionModule() {
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);

  const { data: crops } = useQuery({
    queryKey: ['crops-for-prediction'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crops')
        .select('*, fields(*)')
        .in('status', ['seme', 'en_croissance', 'floraison', 'maturation']);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: historicalData } = useQuery({
    queryKey: ['harvest-history', selectedCropId],
    queryFn: async () => {
      if (!selectedCropId) return null;
      const selectedCrop = crops?.find(c => c.id === selectedCropId);
      if (!selectedCrop) return null;

      const { data } = await supabase
        .from('harvest_records')
        .select('*')
        .eq('crop_id', selectedCrop.field_id)
        .order('harvest_date', { ascending: false })
        .limit(5);
      
      return data;
    },
    enabled: !!selectedCropId && !!crops,
  });

  const handleAnalyze = async () => {
    if (!selectedCropId) {
      toast.error("Veuillez sélectionner une culture");
      return;
    }

    const selectedCrop = crops?.find(c => c.id === selectedCropId);
    if (!selectedCrop) return;

    setIsAnalyzing(true);
    setPrediction(null);

    try {
      const { data, error } = await supabase.functions.invoke('predict-yield', {
        body: {
          cropData: selectedCrop,
          fieldData: selectedCrop.fields,
          historicalData,
          iotData: null // TODO: Fetch IoT data if available
        }
      });

      if (error) throw error;

      if (data.success && data.prediction) {
        setPrediction(data.prediction);
        toast.success("Prédiction générée avec succès");
      } else {
        throw new Error(data.error || "Erreur lors de la prédiction");
      }
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la prédiction");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'faible':
        return <Badge variant="outline" className="bg-green-100 text-green-700">Faible</Badge>;
      case 'moyen':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-700">Moyen</Badge>;
      case 'élevé':
        return <Badge variant="outline" className="bg-red-100 text-red-700">Élevé</Badge>;
      default:
        return <Badge variant="secondary">{risk}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" />
            Prédiction de rendement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sélectionner une culture</label>
            <Select value={selectedCropId} onValueChange={setSelectedCropId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une culture en cours..." />
              </SelectTrigger>
              <SelectContent>
                {crops?.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.name} - {crop.variety || crop.crop_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={!selectedCropId || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyser et prédire
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Résultat de la prédiction</span>
              <span className={`text-lg font-bold ${getConfidenceColor(prediction.confidence_score)}`}>
                {prediction.confidence_score}% confiance
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main prediction */}
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Rendement prédit</p>
              <p className="text-3xl font-bold text-primary">
                {prediction.predicted_yield_kg?.toLocaleString()} kg
              </p>
              {prediction.predicted_yield_per_hectare && (
                <p className="text-sm text-muted-foreground">
                  ({prediction.predicted_yield_per_hectare?.toLocaleString()} kg/ha)
                </p>
              )}
              {prediction.yield_range && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fourchette: {prediction.yield_range.min_kg?.toLocaleString()} - {prediction.yield_range.max_kg?.toLocaleString()} kg
                </p>
              )}
            </div>

            {/* Risk indicators */}
            <div className="grid grid-cols-2 gap-3">
              {prediction.weather_impact && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">Impact météo</span>
                  {getRiskBadge(prediction.weather_impact)}
                </div>
              )}
              {prediction.disease_risk && (
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">Risque maladie</span>
                  {getRiskBadge(prediction.disease_risk)}
                </div>
              )}
            </div>

            {/* Optimal harvest date */}
            {prediction.optimal_harvest_date && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm">
                  Date optimale de récolte: {new Date(prediction.optimal_harvest_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}

            {/* Factors */}
            {prediction.factors_positive && prediction.factors_positive.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Facteurs positifs
                </p>
                <ul className="space-y-1">
                  {prediction.factors_positive.map((factor, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-600">+</span> {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.factors_negative && prediction.factors_negative.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Facteurs à surveiller
                </p>
                <ul className="space-y-1">
                  {prediction.factors_negative.map((factor, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-red-600">-</span> {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Recommandations
                </p>
                <ul className="space-y-1">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {prediction.analysis_summary && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm italic">{prediction.analysis_summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!crops?.length && (
        <Card>
          <CardContent className="text-center py-8">
            <Sprout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucune culture en cours. Ajoutez des cultures pour obtenir des prédictions de rendement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
