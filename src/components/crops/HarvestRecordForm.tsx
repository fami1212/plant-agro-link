import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const qualityGrades = [
  { value: "excellent", label: "Excellent" },
  { value: "bon", label: "Bon" },
  { value: "moyen", label: "Moyen" },
  { value: "faible", label: "Faible" },
];

interface HarvestRecordFormProps {
  cropId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HarvestRecordForm({ cropId, onSuccess, onCancel }: HarvestRecordFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    harvest_date: new Date().toISOString().split("T")[0],
    quantity_kg: "",
    quality_grade: "bon",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!formData.quantity_kg || !formData.harvest_date) {
      toast.error("Veuillez remplir la date et la quantité");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("harvest_records").insert({
        crop_id: cropId,
        user_id: user.id,
        harvest_date: formData.harvest_date,
        quantity_kg: parseFloat(formData.quantity_kg),
        quality_grade: formData.quality_grade || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Récolte enregistrée");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="harvest_date">Date de récolte *</Label>
          <Input
            id="harvest_date"
            type="date"
            value={formData.harvest_date}
            onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity_kg">Quantité récoltée (kg) *</Label>
          <Input
            id="quantity_kg"
            type="number"
            step="0.1"
            value={formData.quantity_kg}
            onChange={(e) => setFormData({ ...formData, quantity_kg: e.target.value })}
            placeholder="Quantité en kg"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="quality_grade">Qualité</Label>
          <Select
            value={formData.quality_grade}
            onValueChange={(value) => setFormData({ ...formData, quality_grade: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualityGrades.map((grade) => (
                <SelectItem key={grade.value} value={grade.value}>
                  {grade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observations sur la récolte..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enregistrer la récolte
        </Button>
      </div>
    </form>
  );
}
