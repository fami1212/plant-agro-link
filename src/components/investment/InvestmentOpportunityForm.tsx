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

interface Crop {
  id: string;
  name: string;
  field_id: string;
  expected_harvest_date: string | null;
  field: { name: string; area_hectares: number } | null;
}

interface InvestmentOpportunityFormProps {
  cropId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvestmentOpportunityForm({
  cropId,
  onSuccess,
  onCancel,
}: InvestmentOpportunityFormProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCropId, setSelectedCropId] = useState(cropId || "");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAmount: "",
    expectedReturnPercent: "15",
    riskLevel: "moyen",
    location: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchCrops();
  }, [user]);

  useEffect(() => {
    if (selectedCropId && crops.length > 0) {
      const crop = crops.find((c) => c.id === selectedCropId);
      if (crop) {
        setFormData((prev) => ({
          ...prev,
          title: prev.title || `Investissement - ${crop.name}`,
          location: prev.location || crop.field?.name || "",
        }));
      }
    }
  }, [selectedCropId, crops]);

  const fetchCrops = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("crops")
      .select(`
        id,
        name,
        field_id,
        expected_harvest_date,
        field:fields(name, area_hectares)
      `)
      .neq("status", "termine")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCrops(data as Crop[]);
      if (cropId) {
        setSelectedCropId(cropId);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetAmount = parseFloat(formData.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error("Montant cible invalide");
      return;
    }

    const expectedReturn = parseFloat(formData.expectedReturnPercent);
    if (isNaN(expectedReturn) || expectedReturn < 0) {
      toast.error("Rendement attendu invalide");
      return;
    }

    setLoading(true);

    try {
      const selectedCrop = crops.find((c) => c.id === selectedCropId);

      const { error } = await supabase.from("investment_opportunities").insert({
        farmer_id: user.id,
        crop_id: selectedCropId || null,
        field_id: selectedCrop?.field_id || null,
        title: formData.title,
        description: formData.description || null,
        target_amount: targetAmount,
        current_amount: 0,
        expected_return_percent: expectedReturn,
        risk_level: formData.riskLevel,
        status: "ouverte",
        location: formData.location || null,
        start_date: formData.startDate || null,
        expected_harvest_date: selectedCrop?.expected_harvest_date || null,
      });

      if (error) throw error;

      toast.success("Opportunité d'investissement créée!", {
        description: "Les investisseurs peuvent maintenant voir votre projet",
      });
      onSuccess();
    } catch (error: any) {
      console.error("Error creating opportunity:", error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="crop">Culture associée (optionnel)</Label>
        <Select value={selectedCropId || "none"} onValueChange={(value) => setSelectedCropId(value === "none" ? "" : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une culture" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucune culture spécifique</SelectItem>
            {crops.map((crop) => (
              <SelectItem key={crop.id} value={crop.id}>
                {crop.name} - {crop.field?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titre du projet *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Financement campagne maïs 2025"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Décrivez votre projet d'investissement..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="targetAmount">Montant cible (FCFA) *</Label>
          <Input
            id="targetAmount"
            type="number"
            min="1000"
            step="1000"
            value={formData.targetAmount}
            onChange={(e) =>
              setFormData({ ...formData, targetAmount: e.target.value })
            }
            placeholder="500000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedReturn">Rendement attendu (%)</Label>
          <Input
            id="expectedReturn"
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={formData.expectedReturnPercent}
            onChange={(e) =>
              setFormData({ ...formData, expectedReturnPercent: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="riskLevel">Niveau de risque</Label>
          <Select
            value={formData.riskLevel}
            onValueChange={(value) =>
              setFormData({ ...formData, riskLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="faible">Faible</SelectItem>
              <SelectItem value="moyen">Moyen</SelectItem>
              <SelectItem value="eleve">Élevé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Date de début</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData({ ...formData, startDate: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Localisation</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Ex: Thiès, Sénégal"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Créer l'opportunité
        </Button>
      </div>
    </form>
  );
}
