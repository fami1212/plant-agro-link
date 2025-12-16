import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Wheat,
  Droplets,
  Sun,
  TrendingUp,
  ArrowRight,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Field {
  id: string;
  name: string;
  area_hectares: number;
  soil_type: string;
  status: string;
  crops?: Crop[];
}

interface Crop {
  id: string;
  name: string;
  status: string;
  expected_yield_kg?: number;
  actual_yield_kg?: number;
}

const soilLabels: Record<string, string> = {
  argileux: "Argileux",
  sableux: "Sableux",
  limoneux: "Limoneux",
  calcaire: "Calcaire",
  humifere: "Humifère",
  mixte: "Mixte",
};

const statusColors: Record<string, string> = {
  active: "bg-success/20 text-success",
  "en_jachère": "bg-warning/20 text-warning",
  "en_préparation": "bg-primary/20 text-primary",
  inactive: "bg-muted text-muted-foreground",
};

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalArea: 0,
    activeFields: 0,
    totalCrops: 0,
    expectedYield: 0,
  });

  useEffect(() => {
    if (user) fetchFields();
  }, [user]);

  const fetchFields = async () => {
    if (!user) return;

    try {
      const { data: fieldsData, error } = await supabase
        .from("fields")
        .select(`
          *,
          crops(id, name, status, expected_yield_kg, actual_yield_kg)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFields(fieldsData || []);

      // Calculate stats
      const totalArea = fieldsData?.reduce((sum, f) => sum + (f.area_hectares || 0), 0) || 0;
      const activeFields = fieldsData?.filter((f) => f.status === "active").length || 0;
      const totalCrops = fieldsData?.reduce((sum, f) => sum + (f.crops?.length || 0), 0) || 0;
      const expectedYield = fieldsData?.reduce((sum, f) => {
        return sum + (f.crops?.reduce((cSum, c) => cSum + (c.expected_yield_kg || 0), 0) || 0);
      }, 0) || 0;

      setStats({ totalArea, activeFields, totalCrops, expectedYield });
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{stats.totalArea.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Hectares totaux</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-accent">{stats.totalCrops}</p>
            <p className="text-sm text-muted-foreground">Cultures actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Expected Yield */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-semibold">Rendement attendu</p>
                <p className="text-sm text-muted-foreground">Cette saison</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-success">
              {(stats.expectedYield / 1000).toFixed(1)}t
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Fields List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Mes parcelles</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate("/parcelles")}>
            Voir tout
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {fields.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">Aucune parcelle enregistrée</p>
              <Button onClick={() => navigate("/parcelles")}>Ajouter une parcelle</Button>
            </CardContent>
          </Card>
        ) : (
          fields.slice(0, 4).map((field) => (
            <Card
              key={field.id}
              className="overflow-hidden cursor-pointer card-hover"
              onClick={() => navigate("/parcelles")}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold">{field.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {field.area_hectares} ha
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {soilLabels[field.soil_type] || field.soil_type}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={cn("text-xs", statusColors[field.status || "active"])}>
                    {field.status === "active" ? "Active" : 
                     field.status === "en_jachère" ? "Jachère" :
                     field.status === "en_préparation" ? "Préparation" : "Inactive"}
                  </Badge>
                </div>

                {/* Crops in this field */}
                {field.crops && field.crops.length > 0 ? (
                  <div className="space-y-2">
                    {field.crops.slice(0, 2).map((crop) => (
                      <div key={crop.id} className="flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-primary" />
                        <span className="text-sm flex-1">{crop.name}</span>
                        <div className="w-20">
                          <Progress value={cropStatusProgress[crop.status] || 0} className="h-1.5" />
                        </div>
                      </div>
                    ))}
                    {field.crops.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{field.crops.length - 2} autres cultures
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune culture</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
