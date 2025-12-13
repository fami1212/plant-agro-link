import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ServiceCategory = Database["public"]["Enums"]["service_category"];

interface ServiceProviderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProvider?: any;
  onSuccess?: () => void;
}

const serviceCategoryLabels: Record<ServiceCategory, string> = {
  veterinaire: "Vétérinaire",
  technicien_iot: "Technicien IoT",
  transporteur: "Transporteur",
  conseiller: "Conseiller agricole",
  cooperative: "Coopérative",
  autre: "Autre",
};

const specializationOptions: Record<ServiceCategory, string[]> = {
  veterinaire: ["Bovins", "Ovins", "Caprins", "Volailles", "Équins", "Chirurgie", "Vaccinations"],
  technicien_iot: ["Installation capteurs", "Maintenance", "Configuration", "Formation"],
  transporteur: ["Produits frais", "Bétail", "Matériel agricole", "Longue distance"],
  conseiller: ["Cultures", "Élevage", "Gestion financière", "Bio/Organique"],
  cooperative: ["Stockage", "Transformation", "Distribution", "Formation"],
  autre: ["Général"],
};

export function ServiceProviderForm({
  open,
  onOpenChange,
  existingProvider,
  onSuccess
}: ServiceProviderFormProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    business_name: existingProvider?.business_name || "",
    service_category: (existingProvider?.service_category || "veterinaire") as ServiceCategory,
    description: existingProvider?.description || "",
    hourly_rate: existingProvider?.hourly_rate?.toString() || "",
    phone: existingProvider?.phone || "",
    whatsapp: existingProvider?.whatsapp || "",
    location: existingProvider?.location || "",
    specializations: existingProvider?.specializations || [] as string[],
    service_areas: existingProvider?.service_areas || [] as string[],
  });
  const [newArea, setNewArea] = useState("");

  const handleAddSpecialization = (spec: string) => {
    if (!formData.specializations.includes(spec)) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, spec]
      }));
    }
  };

  const handleRemoveSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }));
  };

  const handleAddArea = () => {
    if (newArea.trim() && !formData.service_areas.includes(newArea.trim())) {
      setFormData(prev => ({
        ...prev,
        service_areas: [...prev.service_areas, newArea.trim()]
      }));
      setNewArea("");
    }
  };

  const handleRemoveArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter(a => a !== area)
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!formData.business_name.trim()) {
      toast.error("Le nom de l'entreprise est requis");
      return;
    }

    setSaving(true);
    try {
      const providerData = {
        user_id: user.id,
        business_name: formData.business_name,
        service_category: formData.service_category,
        description: formData.description || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || null,
        location: formData.location || null,
        specializations: formData.specializations,
        service_areas: formData.service_areas,
        is_active: true,
      };

      if (existingProvider) {
        const { error } = await supabase
          .from("service_providers")
          .update(providerData)
          .eq("id", existingProvider.id);
        if (error) throw error;
        toast.success("Profil mis à jour");
      } else {
        const { error } = await supabase
          .from("service_providers")
          .insert(providerData);
        if (error) throw error;
        toast.success("Profil créé avec succès");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingProvider ? "Modifier mon profil prestataire" : "Devenir prestataire"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="business_name">Nom de l'entreprise / Cabinet *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
              placeholder="Ex: Cabinet Vétérinaire Diallo"
            />
          </div>

          <div>
            <Label htmlFor="service_category">Catégorie de service *</Label>
            <Select
              value={formData.service_category}
              onValueChange={(value: ServiceCategory) => {
                setFormData(prev => ({
                  ...prev,
                  service_category: value,
                  specializations: []
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(serviceCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Spécialisations</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {specializationOptions[formData.service_category]?.map((spec) => (
                <Badge
                  key={spec}
                  variant={formData.specializations.includes(spec) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (formData.specializations.includes(spec)) {
                      handleRemoveSpecialization(spec);
                    } else {
                      handleAddSpecialization(spec);
                    }
                  }}
                >
                  {spec}
                  {formData.specializations.includes(spec) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez vos services..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+221..."
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="+221..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="hourly_rate">Tarif horaire (FCFA)</Label>
            <Input
              id="hourly_rate"
              type="number"
              value={formData.hourly_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
              placeholder="5000"
            />
          </div>

          <div>
            <Label htmlFor="location">Localisation</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Thiès, Sénégal"
            />
          </div>

          <div>
            <Label>Zones de service</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Ajouter une zone"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddArea}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.service_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.service_areas.map((area) => (
                  <Badge key={area} variant="secondary">
                    {area}
                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => handleRemoveArea(area)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {existingProvider ? "Mettre à jour" : "Créer mon profil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
