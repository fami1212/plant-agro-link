import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldForm } from "@/components/fields/FieldForm";
import { Plus, MapPin, Droplets, Leaf, X, Edit, Trash2, Wheat, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import type { Database } from "@/integrations/supabase/types";

type SoilType = Database["public"]["Enums"]["soil_type"];
type FieldStatus = Database["public"]["Enums"]["field_status"];

interface Field {
  id: string;
  name: string;
  description: string | null;
  area_hectares: number;
  soil_type: SoilType;
  irrigation_system: string | null;
  status: FieldStatus | null;
  created_at: string;
  crops_count?: number;
}

interface Crop {
  id: string;
  name: string;
  status: string;
  crop_type: string;
}

const soilTypeLabels: Record<SoilType, string> = {
  argileux: 'Argileux',
  sableux: 'Sableux',
  limoneux: 'Limoneux',
  calcaire: 'Calcaire',
  humifere: 'Humifère',
  mixte: 'Mixte',
};

const statusColors: Record<FieldStatus, string> = {
  active: 'bg-success/15 text-success',
  'en_jachère': 'bg-warning/15 text-warning',
  'en_préparation': 'bg-primary/15 text-primary',
  inactive: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<FieldStatus, string> = {
  active: 'Active',
  'en_jachère': 'En jachère',
  'en_préparation': 'En préparation',
  inactive: 'Inactive',
};

export default function Parcelles() {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldCrops, setFieldCrops] = useState<Record<string, Crop[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [deletingField, setDeletingField] = useState<Field | null>(null);
  const [viewingField, setViewingField] = useState<Field | null>(null);

  const fetchFields = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const fieldsData = (data || []) as Field[];
      setFields(fieldsData);
      
      // Fetch crops for all fields
      if (fieldsData.length > 0) {
        const fieldIds = fieldsData.map(f => f.id);
        const { data: crops } = await supabase
          .from('crops')
          .select('id, name, status, crop_type, field_id')
          .in('field_id', fieldIds);
          
        if (crops) {
          const grouped: Record<string, Crop[]> = {};
          crops.forEach((c: any) => {
            if (!grouped[c.field_id]) grouped[c.field_id] = [];
            grouped[c.field_id].push(c);
          });
          setFieldCrops(grouped);
        }
      }
    } catch (error: any) {
      console.error('Error fetching fields:', error);
      toast.error("Erreur lors du chargement des parcelles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [user]);

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingField(null);
    fetchFields();
  };

  const handleDelete = async () => {
    if (!deletingField) return;
    
    // Check if field has crops
    const crops = fieldCrops[deletingField.id] || [];
    if (crops.length > 0) {
      toast.error(`Cette parcelle a ${crops.length} culture(s). Supprimez d'abord les cultures.`);
      setDeletingField(null);
      return;
    }
    
    try {
      const { error } = await supabase.from('fields').delete().eq('id', deletingField.id);
      if (error) throw error;
      toast.success("Parcelle supprimée");
      fetchFields();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeletingField(null);
    }
  };

  const totalArea = fields.reduce((sum, f) => sum + Number(f.area_hectares), 0);
  const activeFields = fields.filter(f => f.status === 'active').length;

  return (
    <AppLayout>
      <PageHeader
        title="Mes Parcelles"
        subtitle={`${fields.length} parcelle${fields.length !== 1 ? 's' : ''} • ${totalArea.toFixed(1)} ha total`}
        action={
          <Button
            variant="hero"
            size="icon"
            onClick={() => {
              setShowForm(!showForm);
              setEditingField(null);
            }}
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </Button>
        }
      />

      {/* Quick Stats */}
      {fields.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-muted-foreground">Actives</p>
              <p className="text-lg font-bold text-foreground">{activeFields}</p>
            </div>
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
              <p className="text-xs text-muted-foreground">Surface totale</p>
              <p className="text-lg font-bold text-success">{totalArea.toFixed(1)} ha</p>
            </div>
            <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground">Cultures</p>
              <p className="text-lg font-bold text-accent">
                {Object.values(fieldCrops).flat().length}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3 pb-24">
        {/* Form */}
        {(showForm || editingField) && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {editingField ? "Modifier la parcelle" : "Nouvelle parcelle"}
              </h3>
              <FieldForm
                field={editingField || undefined}
                onSuccess={handleFormSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingField(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Fields List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} variant="elevated" className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : fields.length === 0 && !showForm ? (
          <EmptyState
            icon={<MapPin className="w-12 h-12" />}
            title="Aucune parcelle"
            description="Commencez par ajouter votre première parcelle pour suivre vos cultures."
            action={{
              label: "Ajouter une parcelle",
              onClick: () => setShowForm(true)
            }}
          />
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const crops = fieldCrops[field.id] || [];
              const activeCrops = crops.filter(c => c.status !== 'termine');
              
              return (
                <Card
                  key={field.id}
                  variant="interactive"
                  className={cn("animate-fade-in cursor-pointer", `stagger-${index + 1}`)}
                  style={{ opacity: 0 }}
                  onClick={() => setViewingField(field)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{field.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {soilTypeLabels[field.soil_type]} • {field.area_hectares} ha
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[field.status || 'active']}>
                        {statusLabels[field.status || 'active']}
                      </Badge>
                    </div>

                    {field.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {field.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 pt-3 border-t border-border">
                      {activeCrops.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Wheat className="w-4 h-4 text-accent" />
                          <span className="text-sm text-muted-foreground">
                            {activeCrops.length} culture{activeCrops.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {field.irrigation_system && field.irrigation_system !== 'Aucun' && (
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">{field.irrigation_system}</span>
                        </div>
                      )}
                      <div className="flex-1" />
                      
                      {/* Quick Actions */}
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingField(field);
                            setShowForm(false);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeletingField(field)}
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
      <AlertDialog open={!!deletingField} onOpenChange={() => setDeletingField(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette parcelle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La parcelle "{deletingField?.name}" sera supprimée définitivement.
              {(fieldCrops[deletingField?.id || ''] || []).length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Cette parcelle contient des cultures. Supprimez-les d'abord.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={(fieldCrops[deletingField?.id || ''] || []).length > 0}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Field Details Dialog */}
      <Dialog open={!!viewingField} onOpenChange={() => setViewingField(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {viewingField?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingField && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Surface</p>
                  <p className="font-semibold text-foreground">{viewingField.area_hectares} ha</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Type de sol</p>
                  <p className="font-semibold text-foreground">{soilTypeLabels[viewingField.soil_type]}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Irrigation</p>
                  <p className="font-semibold text-foreground">{viewingField.irrigation_system || 'Aucun'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Statut</p>
                  <Badge className={statusColors[viewingField.status || 'active']}>
                    {statusLabels[viewingField.status || 'active']}
                  </Badge>
                </div>
              </div>
              
              {viewingField.description && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground">{viewingField.description}</p>
                </div>
              )}

              {/* Cultures on this field */}
              <div>
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Wheat className="w-4 h-4 text-accent" />
                  Cultures sur cette parcelle
                </h4>
                {(fieldCrops[viewingField.id] || []).length > 0 ? (
                  <div className="space-y-2">
                    {(fieldCrops[viewingField.id] || []).map((crop) => (
                      <div key={crop.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/10">
                        <span className="text-sm font-medium text-foreground">{crop.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{crop.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune culture sur cette parcelle</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setViewingField(null);
                    setEditingField(viewingField);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
