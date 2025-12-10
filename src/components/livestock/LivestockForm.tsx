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
import type { Database } from "@/integrations/supabase/types";

type LivestockSpecies = Database["public"]["Enums"]["livestock_species"];
type LivestockHealthStatus = Database["public"]["Enums"]["livestock_health_status"];

const speciesOptions: { value: LivestockSpecies; label: string; icon: string }[] = [
  { value: "bovin", label: "Bovin", icon: "🐄" },
  { value: "ovin", label: "Ovin", icon: "🐑" },
  { value: "caprin", label: "Caprin", icon: "🐐" },
  { value: "volaille", label: "Volaille", icon: "🐔" },
  { value: "porcin", label: "Porcin", icon: "🐖" },
  { value: "equin", label: "Équin", icon: "🐴" },
  { value: "autre", label: "Autre", icon: "🐾" },
];

const healthStatusOptions: { value: LivestockHealthStatus; label: string }[] = [
  { value: "sain", label: "Sain" },
  { value: "malade", label: "Malade" },
  { value: "traitement", label: "En traitement" },
  { value: "quarantaine", label: "Quarantaine" },
  { value: "decede", label: "Décédé" },
];

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
}

interface LivestockFormProps {
  livestock?: Livestock;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LivestockForm({ livestock, onSuccess, onCancel }: LivestockFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: livestock?.identifier || "",
    species: livestock?.species || ("bovin" as LivestockSpecies),
    breed: livestock?.breed || "",
    birth_date: livestock?.birth_date || "",
    weight_kg: livestock?.weight_kg?.toString() || "",
    health_status: livestock?.health_status || ("sain" as LivestockHealthStatus),
    acquisition_date: livestock?.acquisition_date || "",
    acquisition_price: livestock?.acquisition_price?.toString() || "",
    notes: livestock?.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!formData.identifier) {
      toast.error("Veuillez remplir l'identifiant");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        identifier: formData.identifier,
        species: formData.species,
        breed: formData.breed || null,
        birth_date: formData.birth_date || null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        health_status: formData.health_status,
        acquisition_date: formData.acquisition_date || null,
        acquisition_price: formData.acquisition_price ? parseFloat(formData.acquisition_price) : null,
        notes: formData.notes || null,
      };

      if (livestock) {
        const { error } = await supabase
          .from("livestock")
          .update(payload)
          .eq("id", livestock.id);
        if (error) throw error;
        toast.success("Animal modifié avec succès");
      } else {
        const { error } = await supabase.from("livestock").insert(payload);
        if (error) throw error;
        toast.success("Animal ajouté avec succès");
      }

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
          <Label htmlFor="identifier">Identifiant *</Label>
          <Input
            id="identifier"
            value={formData.identifier}
            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
            placeholder="Ex: BV-001, OV-012..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="species">Espèce</Label>
          <Select
            value={formData.species}
            onValueChange={(value: LivestockSpecies) =>
              setFormData({ ...formData, species: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {speciesOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="breed">Race</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            placeholder="Ex: Ndama, Gobra, Touabire..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="health_status">État de santé</Label>
          <Select
            value={formData.health_status}
            onValueChange={(value: LivestockHealthStatus) =>
              setFormData({ ...formData, health_status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {healthStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">Date de naissance</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight_kg">Poids (kg)</Label>
          <Input
            id="weight_kg"
            type="number"
            step="0.1"
            value={formData.weight_kg}
            onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
            placeholder="Poids actuel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="acquisition_date">Date d'acquisition</Label>
          <Input
            id="acquisition_date"
            type="date"
            value={formData.acquisition_date}
            onChange={(e) => setFormData({ ...formData, acquisition_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="acquisition_price">Prix d'achat (FCFA)</Label>
          <Input
            id="acquisition_price"
            type="number"
            value={formData.acquisition_price}
            onChange={(e) => setFormData({ ...formData, acquisition_price: e.target.value })}
            placeholder="Prix d'acquisition"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observations, caractéristiques..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {livestock ? "Modifier" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
