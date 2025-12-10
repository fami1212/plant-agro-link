import { useState, useEffect } from "react";
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

const cropTypes = [
  { value: "cereale", label: "Céréale" },
  { value: "legumineuse", label: "Légumineuse" },
  { value: "oleagineux", label: "Oléagineux" },
  { value: "tubercule", label: "Tubercule" },
  { value: "maraicher", label: "Maraîcher" },
  { value: "fruitier", label: "Fruitier" },
  { value: "fourrage", label: "Fourrage" },
  { value: "autre", label: "Autre" },
];

const cropStatuses = [
  { value: "planifie", label: "Planifié" },
  { value: "seme", label: "Semé" },
  { value: "en_croissance", label: "En croissance" },
  { value: "floraison", label: "Floraison" },
  { value: "maturation", label: "Maturation" },
  { value: "recolte", label: "Récolte" },
  { value: "termine", label: "Terminé" },
];

interface Field {
  id: string;
  name: string;
}

interface CropFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CropForm({ onSuccess, onCancel }: CropFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    field_id: "",
    crop_type: "cereale" as const,
    variety: "",
    sowing_date: "",
    expected_harvest_date: "",
    status: "planifie" as const,
    area_hectares: "",
    expected_yield_kg: "",
    notes: "",
  });

  useEffect(() => {
    const fetchFields = async () => {
      const { data, error } = await supabase
        .from("fields")
        .select("id, name")
        .order("name");

      if (!error && data) {
        setFields(data);
      }
    };
    fetchFields();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!formData.name || !formData.field_id) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("crops").insert({
        user_id: user.id,
        field_id: formData.field_id,
        name: formData.name,
        crop_type: formData.crop_type,
        variety: formData.variety || null,
        sowing_date: formData.sowing_date || null,
        expected_harvest_date: formData.expected_harvest_date || null,
        status: formData.status,
        area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null,
        expected_yield_kg: formData.expected_yield_kg ? parseFloat(formData.expected_yield_kg) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Culture ajoutée avec succès");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom de la culture *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Mil, Arachide, Tomates..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="field_id">Parcelle *</Label>
          <Select
            value={formData.field_id}
            onValueChange={(value) => setFormData({ ...formData, field_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une parcelle" />
            </SelectTrigger>
            <SelectContent>
              {fields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="crop_type">Type de culture</Label>
          <Select
            value={formData.crop_type}
            onValueChange={(value: any) => setFormData({ ...formData, crop_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cropTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="variety">Variété</Label>
          <Input
            id="variety"
            value={formData.variety}
            onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
            placeholder="Ex: Souna 3, 73-33..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Statut</Label>
          <Select
            value={formData.status}
            onValueChange={(value: any) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cropStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area_hectares">Surface (ha)</Label>
          <Input
            id="area_hectares"
            type="number"
            step="0.01"
            value={formData.area_hectares}
            onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
            placeholder="Surface cultivée"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sowing_date">Date de semis</Label>
          <Input
            id="sowing_date"
            type="date"
            value={formData.sowing_date}
            onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_harvest_date">Date de récolte prévue</Label>
          <Input
            id="expected_harvest_date"
            type="date"
            value={formData.expected_harvest_date}
            onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_yield_kg">Rendement prévu (kg)</Label>
          <Input
            id="expected_yield_kg"
            type="number"
            step="0.1"
            value={formData.expected_yield_kg}
            onChange={(e) => setFormData({ ...formData, expected_yield_kg: e.target.value })}
            placeholder="Rendement estimé"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observations, traitements..."
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
          Ajouter la culture
        </Button>
      </div>
    </form>
  );
}
