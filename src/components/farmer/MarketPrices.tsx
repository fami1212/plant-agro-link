import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Sparkles,
  DollarSign,
  ArrowRight,
  Loader2,
  Bell,
  LineChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MarketPrice {
  name: string;
  displayName: string;
  currentPrice: number;
  unit: string;
  trend: string;
  weekChange: string;
  monthChange: string;
}

interface PricePrediction {
  crop: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  recommendation: "acheter" | "vendre" | "attendre";
  reason: string;
}

interface MarketData {
  currentPrices: MarketPrice[];
  predictions?: PricePrediction[];
  marketSummary?: string;
  bestTimeToSell?: {
    crop: string;
    reason: string;
  };
}

const trendIcons: Record<string, React.ReactNode> = {
  hausse: <TrendingUp className="w-4 h-4 text-success" />,
  baisse: <TrendingDown className="w-4 h-4 text-destructive" />,
  stable: <Minus className="w-4 h-4 text-muted-foreground" />,
};

const recommendationConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  vendre: { 
    label: "Vendre", 
    color: "bg-success text-success-foreground",
    icon: <TrendingUp className="w-3 h-3" />
  },
  acheter: { 
    label: "Acheter", 
    color: "bg-primary text-primary-foreground",
    icon: <DollarSign className="w-3 h-3" />
  },
  attendre: { 
    label: "Attendre", 
    color: "bg-warning text-warning-foreground",
    icon: <Minus className="w-3 h-3" />
  },
};

export function MarketPrices() {
  const { user } = useAuth();
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [activeTab, setActiveTab] = useState("prices");

  useEffect(() => {
    fetchMarketPrices();
  }, []);

  const fetchMarketPrices = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke("market-prices", {
        body: { action: "list" },
      });

      if (error) throw error;

      if (result.success) {
        setData({
          currentPrices: result.currentPrices || [],
        });
      }
    } catch (error) {
      console.error("Error fetching market prices:", error);
      toast.error("Impossible de charger les prix du marché");
    } finally {
      setLoading(false);
    }
  };

  const fetchPredictions = async () => {
    if (!user) return;
    
    setLoadingPredictions(true);
    try {
      // Get user's crops
      const { data: crops } = await supabase
        .from("crops")
        .select("name, crop_type")
        .eq("user_id", user.id);

      const { data: result, error } = await supabase.functions.invoke("market-prices", {
        body: { 
          action: "predict",
          userCrops: crops?.map(c => c.name) || []
        },
      });

      if (error) throw error;

      if (result.success) {
        setData(prev => ({
          ...prev!,
          currentPrices: result.currentPrices || prev?.currentPrices || [],
          predictions: result.predictions,
          marketSummary: result.marketSummary,
          bestTimeToSell: result.bestTimeToSell,
        }));
        toast.success("Prédictions IA générées");
      }
    } catch (error) {
      console.error("Error fetching predictions:", error);
      toast.error("Impossible de générer les prédictions");
    } finally {
      setLoadingPredictions(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Chargement des prix...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-success/10 via-primary/5 to-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <LineChart className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Prix du marché</h3>
                <p className="text-xs text-muted-foreground">Mise à jour en temps réel</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMarketPrices}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualiser
            </Button>
          </div>
        </div>
      </Card>

      {/* Market Summary */}
      {data.marketSummary && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Analyse IA du marché</p>
                <p className="text-sm text-muted-foreground">{data.marketSummary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Time to Sell */}
      {data.bestTimeToSell && (
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Meilleur moment pour vendre</p>
                  <p className="text-xs text-muted-foreground">{data.bestTimeToSell.crop}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-success" />
            </div>
            <p className="text-sm mt-2 text-muted-foreground">{data.bestTimeToSell.reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-10">
          <TabsTrigger value="prices" className="text-sm">
            Prix actuels
          </TabsTrigger>
          <TabsTrigger value="predictions" className="text-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            Prédictions IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prices" className="mt-4 space-y-2">
          {data.currentPrices.map((price) => (
            <Card key={price.name} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{price.displayName}</p>
                      {trendIcons[price.trend]}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold text-primary">
                        {price.currentPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">{price.unit}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        parseFloat(price.weekChange) > 0 ? "text-success" : 
                        parseFloat(price.weekChange) < 0 ? "text-destructive" : ""
                      )}
                    >
                      {parseFloat(price.weekChange) > 0 ? "+" : ""}{price.weekChange}% /7j
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {parseFloat(price.monthChange) > 0 ? "+" : ""}{price.monthChange}% /30j
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="predictions" className="mt-4">
          {!data.predictions ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-primary/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Utilisez l'IA pour prédire les tendances de prix et obtenir des recommandations
                </p>
                <Button onClick={fetchPredictions} disabled={loadingPredictions}>
                  {loadingPredictions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Générer les prédictions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {data.predictions.map((pred, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{pred.crop}</p>
                      <Badge className={cn("text-xs", recommendationConfig[pred.recommendation]?.color)}>
                        {recommendationConfig[pred.recommendation]?.icon}
                        <span className="ml-1">{recommendationConfig[pred.recommendation]?.label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Actuel</p>
                        <p className="font-bold">{pred.currentPrice} F</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Prévu (30j)</p>
                        <p className={cn(
                          "font-bold",
                          pred.predictedPrice > pred.currentPrice ? "text-success" : 
                          pred.predictedPrice < pred.currentPrice ? "text-destructive" : ""
                        )}>
                          {pred.predictedPrice} F
                        </p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-xs text-muted-foreground">Confiance</p>
                        <p className="font-medium">{pred.confidence}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{pred.reason}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
