import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Wheat, Calendar, TrendingUp, X, Edit, Trash2, Package, ChevronRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CropForm } from "@/components/crops/CropForm";
import { HarvestRecordForm } from "@/components/crops/HarvestRecordForm";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type CropStatus = Database["public"]["Enums"]["crop_status"];

interface Crop {
  id: string;
  name: string;
  field_id: string;
  crop_type: string;
  variety: string | null;
  status: CropStatus;
  sowing_date: string | null;
  expected_harvest_date: string | null;
  actual_harvest_date: string | null;
  area_hectares: number | null;
  expected_yield_kg: number | null;
  actual_yield_kg: number | null;
  notes: string | null;
  field: {
    name: string;
  } | null;
}

interface HarvestRecord {
  id: string;
  harvest_date: string;
  quantity_kg: number;
  quality_grade: string | null;
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

const statusOrder: CropStatus[] = ['planifie', 'seme', 'en_croissance', 'floraison', 'maturation', 'recolte', 'termine'];

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
  const [harvestRecords, setHarvestRecords] = useState<Record<string, HarvestRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [deletingCrop, setDeletingCrop] = useState<Crop | null>(null);
  const [harvestingCrop, setHarvestingCrop] = useState<Crop | null>(null);
  const [viewingHarvests, setViewingHarvests] = useState<Crop | null>(null);

  const fetchCrops = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("crops")
      .select(`
        id,
        name,
        field_id,
        crop_type,
        variety,
        status,
        sowing_date,
        expected_harvest_date,
        actual_harvest_date,
        area_hectares,
        expected_yield_kg,
        actual_yield_kg,
        notes,
        field:fields(name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCrops(data as Crop[]);
      // Fetch harvest records for all crops
      const cropIds = data.map((c) => c.id);
      if (cropIds.length > 0) {
        const { data: harvests } = await supabase
          .from("harvest_records")
          .select("id, crop_id, harvest_date, quantity_kg, quality_grade")
          .in("crop_id", cropIds)
          .order("harvest_date", { ascending: false });

        if (harvests) {
          const grouped: Record<string, HarvestRecord[]> = {};
          harvests.forEach((h: any) => {
            if (!grouped[h.crop_id]) grouped[h.crop_id] = [];
            grouped[h.crop_id].push(h);
          });
          setHarvestRecords(grouped);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCrops();
  }, [user]);

  const handleDelete = async () => {
    if (!deletingCrop) return;
    try {
      // First delete harvest records
      await supabase.from("harvest_records").delete().eq("crop_id", deletingCrop.id);
      
      const { error } = await supabase.from("crops").delete().eq("id", deletingCrop.id);
      if (error) throw error;
      toast.success("Culture supprimée");
      fetchCrops();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeletingCrop(null);
    }
  };

  // Quick status update
  const advanceStatus = async (crop: Crop) => {
    const currentIndex = statusOrder.indexOf(crop.status);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      try {
        const updates: any = { status: nextStatus };
        
        // Auto-fill dates based on status
        if (nextStatus === 'seme' && !crop.sowing_date) {
          updates.sowing_date = new Date().toISOString().split('T')[0];
        }
        if (nextStatus === 'recolte' || nextStatus === 'termine') {
          updates.actual_harvest_date = new Date().toISOString().split('T')[0];
        }
        
        const { error } = await supabase.from("crops").update(updates).eq("id", crop.id);
        if (error) throw error;
        toast.success(`Statut mis à jour: ${statusConfig[nextStatus].label}`);
        fetchCrops();
      } catch (error: any) {
        toast.error("Erreur lors de la mise à jour");
      }
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
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

  const getTotalHarvest = (cropId: string) => {
    const records = harvestRecords[cropId] || [];
    return records.reduce((sum, r) => sum + r.quantity_kg, 0);
  };

  const activeCrops = crops.filter((c) => c.status !== "termine");
  const totalArea = crops.reduce((sum, c) => sum + (c.area_hectares || 0), 0);
  const totalHarvested = Object.values(harvestRecords).flat().reduce((sum, r) => sum + r.quantity_kg, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Cultures"
        subtitle={`${activeCrops.length} active${activeCrops.length > 1 ? "s" : ""} • ${totalArea.toFixed(1)} ha`}
        action={
          <Button
            variant="hero"
            size="icon"
            onClick={() => {
              setShowForm(!showForm);
              setEditingCrop(null);
            }}
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </Button>
        }
      />

      {/* Quick Stats */}
      {crops.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">En cours</p>
              <p className="text-lg font-bold text-foreground">{activeCrops.length}</p>
            </div>
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
              <p className="text-xs text-muted-foreground">Récolté</p>
              <p className="text-lg font-bold text-success">{(totalHarvested / 1000).toFixed(1)} t</p>
            </div>
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">Terminées</p>
              <p className="text-lg font-bold text-accent">{crops.length - activeCrops.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-4 pb-6">
        {(showForm || editingCrop) && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4">
                {editingCrop ? "Modifier la culture" : "Nouvelle culture"}
              </h3>
              <CropForm
                crop={editingCrop || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingCrop(null);
                  fetchCrops();
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingCrop(null);
                }}
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
              const totalHarvest = getTotalHarvest(crop.id);
              const harvestCount = (harvestRecords[crop.id] || []).length;
              const canAdvance = crop.status !== 'termine';
              
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
                      {/* Quick Advance Button */}
                      {canAdvance ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => advanceStatus(crop)}
                        >
                          <span className={cn("w-2 h-2 rounded-full mr-2", config.color)} />
                          {config.label}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium text-primary-foreground shrink-0", config.color)}>
                          {config.label}
                        </span>
                      )}
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
                        {(totalHarvest > 0 || crop.actual_yield_kg || crop.expected_yield_kg) && (
                          <div className="flex items-center gap-1.5 text-success font-medium">
                            <TrendingUp className="w-4 h-4" />
                            <span>
                              {totalHarvest > 0
                                ? `${(totalHarvest / 1000).toFixed(1)} t`
                                : formatYield(
                                    crop.actual_yield_kg || crop.expected_yield_kg,
                                    crop.area_hectares
                                  )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setHarvestingCrop(crop)}
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Récolte
                        </Button>
                        {harvestCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingHarvests(crop)}
                          >
                            {harvestCount} entrée{harvestCount > 1 ? "s" : ""}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCrop(crop);
                            setShowForm(false);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCrop(crop)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCrop} onOpenChange={() => setDeletingCrop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette culture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La culture "{deletingCrop?.name}" et tout son historique
              de récoltes seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Harvest Form Dialog */}
      <Dialog open={!!harvestingCrop} onOpenChange={() => setHarvestingCrop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une récolte - {harvestingCrop?.name}</DialogTitle>
          </DialogHeader>
          {harvestingCrop && (
            <HarvestRecordForm
              cropId={harvestingCrop.id}
              onSuccess={() => {
                setHarvestingCrop(null);
                fetchCrops();
              }}
              onCancel={() => setHarvestingCrop(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Harvest History Dialog */}
      <Dialog open={!!viewingHarvests} onOpenChange={() => setViewingHarvests(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique des récoltes - {viewingHarvests?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {viewingHarvests && (harvestRecords[viewingHarvests.id] || []).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-foreground">{formatDate(record.harvest_date)}</p>
                  <p className="text-sm text-muted-foreground">
                    Qualité: {record.quality_grade || "Non spécifié"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">{record.quantity_kg} kg</p>
                  <p className="text-xs text-muted-foreground">
                    {(record.quantity_kg / 1000).toFixed(2)} t
                  </p>
                </div>
              </div>
            ))}
            {viewingHarvests && (harvestRecords[viewingHarvests.id] || []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">Aucune récolte enregistrée</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
