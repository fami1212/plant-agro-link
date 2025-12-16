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
import { Loader2, Plus, X, Camera, FileText, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { blockchainService } from "@/services/blockchainService";

interface VetConsultationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    id: string;
    identifier: string;
    species: string;
    user_id: string;
  } | null;
  onSuccess?: () => void;
}

const recordTypes = [
  { value: "consultation", label: "Consultation générale" },
  { value: "vaccination", label: "Vaccination" },
  { value: "traitement", label: "Traitement médical" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "suivi", label: "Suivi de traitement" },
  { value: "urgence", label: "Intervention d'urgence" },
  { value: "insemination", label: "Insémination artificielle" },
];

const healthStatusOptions = [
  { value: "sain", label: "Sain" },
  { value: "malade", label: "Malade" },
  { value: "traitement", label: "En traitement" },
  { value: "quarantaine", label: "Quarantaine" },
];

const commonMedications = [
  "Antibiotique",
  "Anti-inflammatoire",
  "Antiparasitaire",
  "Vaccin",
  "Vitamines",
  "Antidouleur",
];

export function VetConsultationForm({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: VetConsultationFormProps) {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    record_type: "consultation",
    description: "",
    diagnosis: "",
    treatment: "",
    medications: [] as string[],
    cost: "",
    next_appointment: "",
    update_health_status: "",
    notes: "",
  });

  const handleAddMedication = (med: string) => {
    if (!formData.medications.includes(med)) {
      setFormData((prev) => ({
        ...prev,
        medications: [...prev.medications, med],
      }));
    }
  };

  const handleRemoveMedication = (med: string) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((m) => m !== med),
    }));
  };

  const handleSubmit = async () => {
    if (!user || !patient) return;

    setSaving(true);
    try {
      // Create veterinary record
      const { data: record, error } = await supabase
        .from("veterinary_records")
        .insert({
          livestock_id: patient.id,
          user_id: user.id,
          record_type: formData.record_type,
          description: `${formData.diagnosis ? `Diagnostic: ${formData.diagnosis}\n` : ""}${formData.description}`,
          treatment: `${formData.treatment}${formData.medications.length > 0 ? `\nMédicaments: ${formData.medications.join(", ")}` : ""}`,
          veterinarian_name: profile?.full_name || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          next_appointment: formData.next_appointment || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update livestock health status if specified
      if (formData.update_health_status) {
        await supabase
          .from("livestock")
          .update({ health_status: formData.update_health_status as any })
          .eq("id", patient.id);
      }

      // Create blockchain record for traceability
      if (record) {
        const blockchainData = {
          record_id: record.id,
          animal_id: patient.id,
          animal_identifier: patient.identifier,
          record_type: formData.record_type,
          veterinarian: profile?.full_name || user.id,
          date: new Date().toISOString(),
          diagnosis: formData.diagnosis,
          treatment: formData.treatment,
          medications: formData.medications,
        };

        const hash = await blockchainService.recordTransaction({
          type: "VET_INTERVENTION",
          data: blockchainData,
          timestamp: new Date().toISOString(),
        });

        console.log("Blockchain hash:", hash);
      }

      toast.success("Consultation enregistrée");
      onOpenChange(false);
      setFormData({
        record_type: "consultation",
        description: "",
        diagnosis: "",
        treatment: "",
        medications: [],
        cost: "",
        next_appointment: "",
        update_health_status: "",
        notes: "",
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nouvelle consultation - {patient.identifier}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type d'intervention *</Label>
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

          <div>
            <Label>Diagnostic</Label>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Diagnostic établi..."
              rows={2}
            />
          </div>

          <div>
            <Label>Description de l'intervention</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails de l'examen et observations..."
              rows={3}
            />
          </div>

          <div>
            <Label>Traitement prescrit</Label>
            <Textarea
              value={formData.treatment}
              onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
              placeholder="Protocole de traitement..."
              rows={2}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Médicaments administrés
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonMedications.map((med) => (
                <Badge
                  key={med}
                  variant={formData.medications.includes(med) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    if (formData.medications.includes(med)) {
                      handleRemoveMedication(med);
                    } else {
                      handleAddMedication(med);
                    }
                  }}
                >
                  {med}
                  {formData.medications.includes(med) && <X className="w-3 h-3 ml-1" />}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Mettre à jour l'état de santé</Label>
            <Select
              value={formData.update_health_status || "none"}
              onValueChange={(value) => setFormData({ ...formData, update_health_status: value === "none" ? "" : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ne pas modifier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ne pas modifier</SelectItem>
                {healthStatusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Coût (FCFA)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="15000"
              />
            </div>
            <div>
              <Label>Prochain RDV</Label>
              <Input
                type="date"
                value={formData.next_appointment}
                onChange={(e) => setFormData({ ...formData, next_appointment: e.target.value })}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">🔗 Blockchain</p>
            <p className="text-sm">Cette intervention sera enregistrée sur la blockchain pour garantir la traçabilité sanitaire.</p>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Enregistrer la consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
