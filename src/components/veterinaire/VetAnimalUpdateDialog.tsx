import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Heart, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VetAnimalUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: {
    id: string;
    identifier: string;
    species: string;
    health_status: string;
    weight_kg: number | null;
  } | null;
  onSuccess?: () => void;
}

const healthStatusOptions = [
  { value: "sain", label: "Sain", color: "text-success" },
  { value: "malade", label: "Malade", color: "text-destructive" },
  { value: "traitement", label: "En traitement", color: "text-warning" },
  { value: "quarantaine", label: "Quarantaine", color: "text-amber-600" },
];

const speciesEmoji: Record<string, string> = {
  bovin: "🐄", ovin: "🐑", caprin: "🐐", volaille: "🐔", porcin: "🐖", equin: "🐴", autre: "🐾",
};

export function VetAnimalUpdateDialog({
  open,
  onOpenChange,
  animal,
  onSuccess,
}: VetAnimalUpdateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState(animal?.health_status || "sain");
  const [weightKg, setWeightKg] = useState(animal?.weight_kg?.toString() || "");

  // Reset form when animal changes
  useState(() => {
    if (animal) {
      setHealthStatus(animal.health_status);
      setWeightKg(animal.weight_kg?.toString() || "");
    }
  });

  const handleSubmit = async () => {
    if (!animal) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("livestock")
        .update({
          health_status: healthStatus as "sain" | "malade" | "traitement" | "quarantaine" | "decede",
          weight_kg: weightKg ? parseFloat(weightKg) : null,
        })
        .eq("id", animal.id);

      if (error) throw error;

      toast.success("Animal mis à jour");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  if (!animal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{speciesEmoji[animal.species] || "🐾"}</span>
            <div>
              <p>{animal.identifier}</p>
              <p className="text-sm font-normal text-muted-foreground capitalize">
                {animal.species}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-destructive" />
              État de santé
            </Label>
            <Select value={healthStatus} onValueChange={setHealthStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {healthStatusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <span className={status.color}>{status.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              Poids (kg)
            </Label>
            <Input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Ex: 450"
              step="0.1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
