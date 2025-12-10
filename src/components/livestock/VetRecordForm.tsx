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

const recordTypes = [
  { value: "vaccination", label: "Vaccination" },
  { value: "consultation", label: "Consultation" },
  { value: "traitement", label: "Traitement" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "vermifuge", label: "Vermifuge" },
  { value: "autre", label: "Autre" },
];

interface VetRecordFormProps {
  livestockId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function VetRecordForm({ livestockId, onSuccess, onCancel }: VetRecordFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    record_type: "consultation",
    description: "",
    treatment: "",
    veterinarian_name: "",
    cost: "",
    next_appointment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("veterinary_records").insert({
        livestock_id: livestockId,
        user_id: user.id,
        record_type: formData.record_type,
        description: formData.description || null,
        treatment: formData.treatment || null,
        veterinarian_name: formData.veterinarian_name || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_appointment: formData.next_appointment || null,
      });

      if (error) throw error;

      toast.success("Enregistrement vétérinaire ajouté");
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
          <Label htmlFor="record_type">Type</Label>
          <Select
            value={formData.record_type}
            onValueChange={(value) => setFormData({ ...formData, record_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {recordTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="veterinarian_name">Vétérinaire</Label>
          <Input
            id="veterinarian_name"
            value={formData.veterinarian_name}
            onChange={(e) => setFormData({ ...formData, veterinarian_name: e.target.value })}
            placeholder="Nom du vétérinaire"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de l'intervention"
            rows={2}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="treatment">Traitement prescrit</Label>
          <Textarea
            id="treatment"
            value={formData.treatment}
            onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
            placeholder="Médicaments, doses..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Coût (FCFA)</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="Coût de l'intervention"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_appointment">Prochain RDV</Label>
          <Input
            id="next_appointment"
            type="date"
            value={formData.next_appointment}
            onChange={(e) => setFormData({ ...formData, next_appointment: e.target.value })}
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
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
