import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
}

interface FieldFormProps {
  field?: Field;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const soilTypes: { value: SoilType; label: string }[] = [
  { value: 'argileux', label: 'Argileux' },
  { value: 'sableux', label: 'Sableux' },
  { value: 'limoneux', label: 'Limoneux' },
  { value: 'calcaire', label: 'Calcaire' },
  { value: 'humifere', label: 'Humifère' },
  { value: 'mixte', label: 'Mixte' },
];

const statusOptions: { value: FieldStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'en_jachère', label: 'En jachère' },
  { value: 'en_préparation', label: 'En préparation' },
  { value: 'inactive', label: 'Inactive' },
];

const irrigationSystems = [
  'Aucun',
  'Goutte à goutte',
  'Aspersion',
  'Gravitaire',
  'Pivot',
  'Autre',
];

export function FieldForm({ field, onSuccess, onCancel }: FieldFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: field?.name || '',
    description: field?.description || '',
    area_hectares: field?.area_hectares?.toString() || '',
    soil_type: field?.soil_type || 'mixte' as SoilType,
    irrigation_system: field?.irrigation_system || '',
    status: field?.status || 'active' as FieldStatus,
    latitude: '',
    longitude: '',
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setGettingLocation(false);
        toast.success("Position GPS capturée");
      },
      (error) => {
        setGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Permission de géolocalisation refusée");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Position non disponible");
            break;
          case error.TIMEOUT:
            toast.error("Délai d'attente dépassé");
            break;
          default:
            toast.error("Erreur de géolocalisation");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!formData.name || !formData.area_hectares) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setLoading(true);

    try {
      const locationGps = formData.latitude && formData.longitude
        ? `(${formData.longitude},${formData.latitude})`
        : null;

      const payload = {
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        area_hectares: parseFloat(formData.area_hectares),
        soil_type: formData.soil_type,
        irrigation_system: formData.irrigation_system || null,
        status: formData.status,
        ...(locationGps && { location_gps: locationGps }),
      };

      if (field) {
        const { error } = await supabase.from('fields').update(payload).eq('id', field.id);
        if (error) throw error;
        toast.success("Parcelle modifiée avec succès!");
      } else {
        const { error } = await supabase.from('fields').insert(payload);
        if (error) throw error;
        toast.success("Parcelle créée avec succès!");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving field:', error);
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom de la parcelle *</Label>
          <Input
            id="name"
            placeholder="Ex: Parcelle Nord"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="area">Surface (hectares) *</Label>
          <Input
            id="area"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ex: 2.5"
            value={formData.area_hectares}
            onChange={(e) => setFormData(prev => ({ ...prev, area_hectares: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Type de sol</Label>
          <Select
            value={formData.soil_type}
            onValueChange={(value: SoilType) => setFormData(prev => ({ ...prev, soil_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le type de sol" />
            </SelectTrigger>
            <SelectContent>
              {soilTypes.map((soil) => (
                <SelectItem key={soil.value} value={soil.value}>
                  {soil.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            value={formData.status}
            onValueChange={(value: FieldStatus) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Système d'irrigation</Label>
          <Select
            value={formData.irrigation_system}
            onValueChange={(value) => setFormData(prev => ({ ...prev, irrigation_system: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner le système" />
            </SelectTrigger>
            <SelectContent>
              {irrigationSystems.map((system) => (
                <SelectItem key={system} value={system}>
                  {system}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description de la parcelle..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={2}
        />
      </div>

      {/* GPS Location */}
      <div className="space-y-2">
        <Label>Position GPS</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className="flex-1"
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            Capturer ma position
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label htmlFor="latitude" className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              placeholder="14.6937"
              value={formData.latitude}
              onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="longitude" className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              placeholder="-17.4441"
              value={formData.longitude}
              onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" variant="hero" disabled={loading} className="flex-1">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            field ? "Modifier" : "Créer la parcelle"
          )}
        </Button>
      </div>
    </form>
  );
}
