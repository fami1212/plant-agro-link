import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Wheat,
  TrendingUp,
  ArrowRight,
  PawPrint,
  LineChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SmartAlerts } from "./SmartAlerts";

interface Field {
  id: string;
  name: string;
  area_hectares: number;
  status: string;
  crops?: Crop[];
}

interface Crop {
  id: string;
  name: string;
  status: string;
  expected_yield_kg?: number;
}

const cropStatusProgress: Record<string, number> = {
  planifie: 10,
  seme: 25,
  en_croissance: 50,
  floraison: 65,
  maturation: 80,
  recolte: 95,
  termine: 100,
};

export function FarmOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [livestock, setLivestock] = useState({ total: 0, healthy: 0 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArea: 0,
    totalCrops: 0,
    expectedYield: 0,
  });

  useEffect(() => {
    if (user) {
      fetchFields();
      fetchLivestock();
    }
  }, [user]);

  const fetchFields = async () => {
    if (!user) return;

    try {
      const { data: fieldsData, error } = await supabase
        .from("fields")
        .select(`
          *,
          crops(id, name, status, expected_yield_kg)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFields(fieldsData || []);

      // Calculate stats
      const totalArea = fieldsData?.reduce((sum, f) => sum + (f.area_hectares || 0), 0) || 0;
      const totalCrops = fieldsData?.reduce((sum, f) => sum + (f.crops?.length || 0), 0) || 0;
      const expectedYield = fieldsData?.reduce((sum, f) => {
        return sum + (f.crops?.reduce((cSum, c) => cSum + (c.expected_yield_kg || 0), 0) || 0);
      }, 0) || 0;

      setStats({ totalArea, totalCrops, expectedYield });
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLivestock = async () => {
    if (!user) return;
    try {
      const { data, count } = await supabase
        .from("livestock")
        .select("id, health_status", { count: "exact" })
        .eq("user_id", user.id);
      
      const healthy = data?.filter(l => l.health_status === "sain").length || 0;
      setLivestock({ total: count || 0, healthy });
    } catch (error) {
      console.error("Error fetching livestock:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Smart AI Alerts */}
      <SmartAlerts />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/parcelles")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalArea.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Hectares</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/cultures")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Wheat className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCrops}</p>
                <p className="text-xs text-muted-foreground">Cultures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/betail")}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{livestock.total}</p>
                <p className="text-xs text-muted-foreground">Animaux</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {(stats.expectedYield / 1000).toFixed(1)}t
                </p>
                <p className="text-xs text-muted-foreground">Rendement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access to Market Prices */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-r from-primary/5 to-accent/5"
        onClick={() => navigate("/ia")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LineChart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Prix du marché & IA</p>
                <p className="text-xs text-muted-foreground">Analyse et recommandations</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Fields Preview - Simplified */}
      {fields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Mes parcelles</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate("/parcelles")}>
              Tout voir
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {fields.slice(0, 3).map((field) => (
            <Card
              key={field.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/parcelles")}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{field.name}</p>
                      <p className="text-xs text-muted-foreground">{field.area_hectares} ha</p>
                    </div>
                  </div>
                  {field.crops && field.crops.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Wheat className="w-4 h-4 text-primary" />
                      <span className="text-sm">{field.crops.length}</span>
                    </div>
                  )}
                </div>
                {field.crops && field.crops.length > 0 && field.crops[0] && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{field.crops[0].name}</span>
                    <Progress value={cropStatusProgress[field.crops[0].status] || 0} className="h-1 flex-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {fields.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Ajoutez vos premières parcelles</p>
            <Button size="sm" onClick={() => navigate("/parcelles")}>
              Commencer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
