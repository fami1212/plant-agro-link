import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { SmartCameraButton } from "@/components/ai/SmartCameraButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Heart, Syringe, AlertCircle, X, Edit, Trash2, Stethoscope, Scale, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { LivestockForm } from "@/components/livestock/LivestockForm";
import { VetRecordForm } from "@/components/livestock/VetRecordForm";
import { VetAppointmentRequest } from "@/components/livestock/VetAppointmentRequest";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type LivestockSpecies = Database["public"]["Enums"]["livestock_species"];
type LivestockHealthStatus = Database["public"]["Enums"]["livestock_health_status"];

interface Livestock {
  id: string;
  identifier: string;
  species: LivestockSpecies;
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  health_status: LivestockHealthStatus;
  acquisition_date: string | null;
  acquisition_price: number | null;
  notes: string | null;
  user_id: string;
}

interface VetRecord {
  id: string;
  record_type: string;
  description: string | null;
  treatment: string | null;
  veterinarian_name: string | null;
  next_appointment: string | null;
  recorded_at: string;
}

const speciesIcons: Record<LivestockSpecies, string> = {
  bovin: "🐄",
  ovin: "🐑",
  caprin: "🐐",
  volaille: "🐔",
  porcin: "🐖",
  equin: "🐴",
  autre: "🐾",
};

const speciesLabels: Record<LivestockSpecies, string> = {
  bovin: "Bovin",
  ovin: "Ovin",
  caprin: "Caprin",
  volaille: "Volaille",
  porcin: "Porcin",
  equin: "Équin",
  autre: "Autre",
};

const healthStatusConfig: Record<LivestockHealthStatus, { label: string; color: string }> = {
  sain: { label: "En santé", color: "bg-success/15 text-success" },
  malade: { label: "Malade", color: "bg-destructive/15 text-destructive" },
  traitement: { label: "Traitement", color: "bg-warning/15 text-warning" },
  quarantaine: { label: "Quarantaine", color: "bg-amber-500/15 text-amber-600" },
  decede: { label: "Décédé", color: "bg-muted text-muted-foreground" },
};

const healthStatusOrder: LivestockHealthStatus[] = ['malade', 'traitement', 'quarantaine', 'sain'];

export default function Betail() {
  const { user } = useAuth();
  const { isVeterinaire, isAgriculteur, isAdmin } = useRoleAccess();
  const [livestock, setLivestock] = useState<Livestock[]>([]);
  const [vetRecords, setVetRecords] = useState<Record<string, VetRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Livestock | null>(null);
  const [deletingAnimal, setDeletingAnimal] = useState<Livestock | null>(null);
  const [addingVetRecord, setAddingVetRecord] = useState<Livestock | null>(null);
  const [viewingRecords, setViewingRecords] = useState<Livestock | null>(null);
  const [updatingWeight, setUpdatingWeight] = useState<Livestock | null>(null);
  const [newWeight, setNewWeight] = useState("");

  // Vétérinaires can see all livestock, others only their own
  const canManageAnimal = (animal: Livestock) => {
    return isAdmin || animal.user_id === user?.id;
  };

  const canAddAnimal = isAgriculteur || isAdmin;
  const canAddVetRecord = isVeterinaire || isAgriculteur || isAdmin;

  const fetchLivestock = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("livestock")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLivestock(data as Livestock[]);
      
      // Fetch vet records
      const ids = data.map((a) => a.id);
      if (ids.length > 0) {
        const { data: records } = await supabase
          .from("veterinary_records")
          .select("id, livestock_id, record_type, description, treatment, veterinarian_name, next_appointment, recorded_at")
          .in("livestock_id", ids)
          .order("recorded_at", { ascending: false });

        if (records) {
          const grouped: Record<string, VetRecord[]> = {};
          records.forEach((r: any) => {
            if (!grouped[r.livestock_id]) grouped[r.livestock_id] = [];
            grouped[r.livestock_id].push(r);
          });
          setVetRecords(grouped);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLivestock();
  }, [user]);

  const handleDelete = async () => {
    if (!deletingAnimal) return;
    try {
      // Delete vet records first
      await supabase.from("veterinary_records").delete().eq("livestock_id", deletingAnimal.id);
      
      const { error } = await supabase.from("livestock").delete().eq("id", deletingAnimal.id);
      if (error) throw error;
      toast.success("Animal supprimé");
      fetchLivestock();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setDeletingAnimal(null);
    }
  };

  // Quick health status update
  const updateHealthStatus = async (animal: Livestock, newStatus: LivestockHealthStatus) => {
    try {
      const { error } = await supabase.from("livestock").update({ health_status: newStatus }).eq("id", animal.id);
      if (error) throw error;
      toast.success(`Statut mis à jour: ${healthStatusConfig[newStatus].label}`);
      fetchLivestock();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Quick weight update
  const handleWeightUpdate = async () => {
    if (!updatingWeight || !newWeight) return;
    try {
      const { error } = await supabase
        .from("livestock")
        .update({ weight_kg: parseFloat(newWeight) })
        .eq("id", updatingWeight.id);
      if (error) throw error;
      toast.success("Poids mis à jour");
      setUpdatingWeight(null);
      setNewWeight("");
      fetchLivestock();
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - birth.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    
    if (years > 0) return `${years} an${years > 1 ? "s" : ""}`;
    return `${months} mois`;
  };

  const getNextAppointment = (animalId: string) => {
    const records = vetRecords[animalId] || [];
    const upcoming = records
      .filter((r) => r.next_appointment && new Date(r.next_appointment) > new Date())
      .sort((a, b) => new Date(a.next_appointment!).getTime() - new Date(b.next_appointment!).getTime());
    return upcoming[0]?.next_appointment;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Stats
  const speciesCounts = livestock.reduce((acc, a) => {
    if (a.health_status !== 'decede') {
      acc[a.species] = (acc[a.species] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const alertCount = livestock.filter((a) => 
    a.health_status !== "sain" && a.health_status !== "decede"
  ).length;

  const totalWeight = livestock
    .filter(a => a.health_status !== 'decede' && a.weight_kg)
    .reduce((sum, a) => sum + (a.weight_kg || 0), 0);

  const upcomingAppointments = livestock.filter(a => getNextAppointment(a.id)).length;

  return (
    <AppLayout>
      <PageHeader
        title={isVeterinaire && !isAgriculteur ? "Animaux à suivre" : "Mon Bétail"}
        subtitle={`${livestock.filter(a => a.health_status !== 'decede').length} tête${livestock.length > 1 ? "s" : ""}`}
        action={
          canAddAnimal ? (
            <div className="flex gap-2">
              <SmartCameraButton 
                context="betail" 
                variant="icon"
                onActionComplete={() => fetchLivestock()}
              />
              <Button
                variant="hero"
                size="icon"
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingAnimal(null);
                }}
              >
                {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </Button>
            </div>
          ) : null
        }
      />

      {/* AI Contextual Tip */}
      <div className="px-4 mb-4">
        <AIContextualTip 
          context="betail" 
          data={{ totalLivestock: livestock.length, alertCount, speciesCounts }} 
        />
      </div>

      {/* Quick Stats */}
      {livestock.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {Object.entries(speciesCounts).map(([species, count]) => (
              <div
                key={species}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20"
              >
                <p className="text-xs text-muted-foreground">{speciesLabels[species as LivestockSpecies]}</p>
                <p className="text-lg font-bold text-foreground">{count}</p>
              </div>
            ))}
            {totalWeight > 0 && (
              <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-success/10 border border-success/20">
                <p className="text-xs text-muted-foreground">Poids total</p>
                <p className="text-lg font-bold text-success">{(totalWeight / 1000).toFixed(1)} t</p>
              </div>
            )}
            {alertCount > 0 && (
              <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20">
                <p className="text-xs text-muted-foreground">Alertes santé</p>
                <p className="text-lg font-bold text-warning">{alertCount}</p>
              </div>
            )}
            {upcomingAppointments > 0 && (
              <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
                <p className="text-xs text-muted-foreground">RDV vétérinaire</p>
                <p className="text-lg font-bold text-accent">{upcomingAppointments}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-4 space-y-4 pb-6">
        {(showForm || editingAnimal) && (
          <Card className="animate-fade-in">
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-4">
                {editingAnimal ? "Modifier l'animal" : "Nouvel animal"}
              </h3>
              <LivestockForm
                livestock={editingAnimal || undefined}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingAnimal(null);
                  fetchLivestock();
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingAnimal(null);
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
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : livestock.length === 0 && !showForm ? (
          <EmptyState
            icon={<Heart className="w-8 h-8" />}
            title="Aucun animal"
            description="Commencez par enregistrer votre bétail"
            action={{
              label: "Ajouter un animal",
              onClick: () => setShowForm(true),
            }}
          />
        ) : (
          <div className="space-y-3">
            {livestock.map((animal, index) => {
              const statusConfig = healthStatusConfig[animal.health_status];
              const nextAppt = getNextAppointment(animal.id);
              const recordCount = (vetRecords[animal.id] || []).length;
              const hasAlert = animal.health_status !== "sain" && animal.health_status !== "decede";
              const canUpdateHealth = animal.health_status !== 'decede';
              
              return (
                <Card
                  key={animal.id}
                  variant="interactive"
                  className={cn("animate-fade-in", `stagger-${index + 1}`)}
                  style={{ opacity: 0 }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
                        {speciesIcons[animal.species]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{animal.identifier}</h3>
                          {hasAlert && <AlertCircle className="w-4 h-4 text-warning" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {animal.breed || speciesLabels[animal.species]}
                          {animal.birth_date && ` • ${calculateAge(animal.birth_date)}`}
                          {animal.weight_kg && ` • ${animal.weight_kg} kg`}
                        </p>
                      </div>
                      {/* Quick Health Status Toggle */}
                      {canUpdateHealth ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const currentIndex = healthStatusOrder.indexOf(animal.health_status);
                            const nextIndex = (currentIndex + 1) % healthStatusOrder.length;
                            updateHealthStatus(animal, healthStatusOrder[nextIndex]);
                          }}
                        >
                          <span className={cn("px-2 py-0.5 rounded-full text-xs", statusConfig.color)}>
                            {statusConfig.label}
                          </span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                      {nextAppt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Syringe className="w-4 h-4 text-warning" />
                          <span className="text-warning font-medium">{formatDate(nextAppt)}</span>
                        </div>
                      )}
                      {animal.weight_kg && (
                        <button
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => {
                            setUpdatingWeight(animal);
                            setNewWeight(animal.weight_kg?.toString() || "");
                          }}
                        >
                          <Scale className="w-4 h-4" />
                          <span>{animal.weight_kg} kg</span>
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 mt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setAddingVetRecord(animal)}
                      >
                        <Stethoscope className="w-4 h-4 mr-1" />
                        Suivi vétérinaire
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUpdatingWeight(animal);
                          setNewWeight(animal.weight_kg?.toString() || "");
                        }}
                      >
                        <Scale className="w-4 h-4 mr-1" />
                        Poids
                      </Button>
                      {recordCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRecords(animal)}
                        >
                          {recordCount} visite{recordCount > 1 ? "s" : ""}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAnimal(animal);
                          setShowForm(false);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingAnimal(animal)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAnimal} onOpenChange={() => setDeletingAnimal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet animal ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'animal "{deletingAnimal?.identifier}" et tout son
              historique vétérinaire seront supprimés définitivement.
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

      {/* Weight Update Dialog */}
      <Dialog open={!!updatingWeight} onOpenChange={() => setUpdatingWeight(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mettre à jour le poids - {updatingWeight?.identifier}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Nouveau poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Poids en kg"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUpdatingWeight(null)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleWeightUpdate}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vet Record Form Dialog */}
      <Dialog open={!!addingVetRecord} onOpenChange={() => setAddingVetRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suivi vétérinaire - {addingVetRecord?.identifier}</DialogTitle>
          </DialogHeader>
          {addingVetRecord && (
            <VetRecordForm
              livestockId={addingVetRecord.id}
              onSuccess={() => {
                setAddingVetRecord(null);
                fetchLivestock();
              }}
              onCancel={() => setAddingVetRecord(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Vet Records History Dialog */}
      <Dialog open={!!viewingRecords} onOpenChange={() => setViewingRecords(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique vétérinaire - {viewingRecords?.identifier}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {viewingRecords && (vetRecords[viewingRecords.id] || []).map((record) => (
              <div
                key={record.id}
                className="p-3 rounded-lg bg-muted/50 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground capitalize">{record.record_type}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(record.recorded_at)}</span>
                </div>
                {record.description && (
                  <p className="text-sm text-muted-foreground">{record.description}</p>
                )}
                {record.treatment && (
                  <p className="text-sm"><span className="font-medium">Traitement:</span> {record.treatment}</p>
                )}
                {record.veterinarian_name && (
                  <p className="text-xs text-muted-foreground">Dr. {record.veterinarian_name}</p>
                )}
                {record.next_appointment && (
                  <p className="text-xs text-warning">Prochain RDV: {formatDate(record.next_appointment)}</p>
                )}
              </div>
            ))}
            {viewingRecords && (vetRecords[viewingRecords.id] || []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">Aucun enregistrement vétérinaire</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
