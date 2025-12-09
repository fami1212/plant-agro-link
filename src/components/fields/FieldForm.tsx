import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SoilType = 'argileux' | 'sableux' | 'limoneux' | 'calcaire' | 'humifere' | 'mixte';
type FieldStatus = 'active' | 'en_jachère' | 'en_préparation' | 'inactive';

interface FieldFormProps {
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

const irrigationSystems = [
  'Aucun',
  'Goutte à goutte',
  'Aspersion',
  'Gravitaire',
  'Pivot',
  'Autre',
];

export function FieldForm({ onSuccess, onCancel }: FieldFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area_hectares: '',
    soil_type: 'mixte' as SoilType,
    irrigation_system: '',
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

      const { error } = await supabase.from('fields').insert({
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        area_hectares: parseFloat(formData.area_hectares),
        soil_type: formData.soil_type,
        irrigation_system: formData.irrigation_system || null,
        location_gps: locationGps,
        status: 'active' as FieldStatus,
      });

      if (error) throw error;

      toast.success("Parcelle créée avec succès!");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating field:', error);
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Nouvelle Parcelle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description de la parcelle..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
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
                "Créer la parcelle"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
