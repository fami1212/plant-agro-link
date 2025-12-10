import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Wheat, Calendar, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CropForm } from "@/components/crops/CropForm";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type CropStatus = Database["public"]["Enums"]["crop_status"];

interface Crop {
  id: string;
  name: string;
  crop_type: string;
  variety: string | null;
  status: CropStatus;
  sowing_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  area_hectares: number | null;
  expected_yield_kg: number | null;
  actual_yield_kg: number | null;
  field: {
    name: string;
  } | null;
}

const statusConfig: Record<CropStatus, { label: string; color: string; progress: number }> = {
  planifie: { label: "Planifié", color: "bg-muted-foreground", progress: 5 },
  seme: { label: "Semé", color: "bg-blue-500", progress: 15 },
  en_croissance: { label: "En croissance", color: "bg-primary", progress: 40 },
  floraison: { label: "Floraison", color: "bg-accent", progress: 60 },
  maturation: { label: "Maturation", color: "bg-amber-500", progress: 80 },
  recolte: { label: "Récolte", color: "bg-success", progress: 95 },
  termine: { label: "Terminé", color: "bg-muted-foreground", progress: 100 },
};

const cropTypeLabels: Record<string, string> = {
  cereale: "Céréale",
  legumineuse: "Légumineuse",
  oleagineux: "Oléagineux",
  tubercule: "Tubercule",
  maraicher: "Maraîcher",
  fruitier: "Fruitier",
  fourrage: "Fourrage",
  autre: "Autre",
};

export default function Cultures() {
  const { user } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchCrops = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("crops")
      .select(`
        id,
        name,
        crop_type,
        variety,
        status,
        sowing_date,
        expected_harvest_date,
        actual_harvest_date,
        area_hectares,
        expected_yield_kg,
        actual_yield_kg,
        field:fields(name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCrops(data as Crop[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCrops();
  }, [user]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatYield = (kg: number | null, hectares: number | null) => {
    if (!kg) return null;
    if (hectares && hectares > 0) {
      const tPerHa = (kg / 1000) / hectares;
      return `${tPerHa.toFixed(1)} t/ha`;
    }
    return `${(kg / 1000).toFixed(1)} t`;
  };

  const activeCrops = crops.filter((c) => c.status !== "termine");

  return (
    <AppLayout>
      <PageHeader
        title="Cultures"
        subtitle={`${activeCrops.length} culture${activeCrops.length > 1 ? "s" : ""} active${activeCrops.length > 1 ? "s" : ""}`}
        action={
          <Button
            variant="hero"
            size="icon"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </Button>
        }
      />

      <div className="px-4 space-y-4 pb-6">
        {showForm && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4">Nouvelle culture</h3>
              <CropForm
                onSuccess={() => {
                  setShowForm(false);
                  fetchCrops();
                }}
                onCancel={() => setShowForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : crops.length === 0 && !showForm ? (
          <EmptyState
            icon={<Wheat className="w-8 h-8" />}
            title="Aucune culture"
            description="Commencez par ajouter une culture à vos parcelles"
            action={{
              label: "Ajouter une culture",
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div className="space-y-3">
            {crops.map((crop, index) => {
              const config = statusConfig[crop.status];
              return (
                <Card
                  key={crop.id}
                  variant="interactive"
                  className={cn("animate-fade-in", `stagger-${index + 1}`)}
                  style={{ opacity: 0 }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                        <Wheat className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {crop.name}
                          {crop.variety && (
                            <span className="text-muted-foreground font-normal"> - {crop.variety}</span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {crop.field?.name} • {cropTypeLabels[crop.crop_type] || crop.crop_type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium text-primary-foreground shrink-0",
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium text-foreground">{config.progress}%</span>
                        </div>
                        <Progress value={config.progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {crop.actual_harvest_date
                              ? `Récolté: ${formatDate(crop.actual_harvest_date)}`
                              : crop.expected_harvest_date
                              ? `Récolte: ${formatDate(crop.expected_harvest_date)}`
                              : crop.sowing_date
                              ? `Semis: ${formatDate(crop.sowing_date)}`
                              : "Non planifié"}
                          </span>
                        </div>
                        {(crop.actual_yield_kg || crop.expected_yield_kg) && (
                          <div className="flex items-center gap-1.5 text-success font-medium">
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {formatYield(
                                crop.actual_yield_kg || crop.expected_yield_kg,
                                crop.area_hectares
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
