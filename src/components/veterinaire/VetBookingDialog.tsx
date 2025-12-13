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
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VetBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: {
    id: string;
    business_name: string;
    hourly_rate: number | null;
    specializations: string[] | null;
  };
  onSuccess?: () => void;
}

const serviceTypes = [
  { value: "consultation", label: "Consultation" },
  { value: "vaccination", label: "Vaccination" },
  { value: "urgence", label: "Urgence" },
  { value: "suivi", label: "Suivi médical" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "insemination", label: "Insémination" },
];

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "14:00", "15:00", "16:00", "17:00", "18:00",
];

export function VetBookingDialog({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: VetBookingDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    service_type: "",
    scheduled_time: "",
    description: "",
    animals_count: "1",
  });

  const handleSubmit = async () => {
    if (!user || !selectedDate || !formData.service_type) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("service_bookings").insert({
        client_id: user.id,
        provider_id: provider.id,
        service_type: formData.service_type,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        scheduled_time: formData.scheduled_time || null,
        description: formData.description || null,
        price: provider.hourly_rate,
        status: "en_attente",
      });

      if (error) throw error;
      toast.success("Demande de rendez-vous envoyée !");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la réservation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver avec {provider.business_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Type de service *</Label>
            <Select
              value={formData.service_type}
              onValueChange={(value) => setFormData({ ...formData, service_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un service" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-4 h-4" />
              Date du rendez-vous *
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={fr}
              disabled={(date) => date < new Date()}
              className="rounded-lg border"
            />
          </div>

          {selectedDate && (
            <div>
              <Label>Créneau horaire</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={formData.scheduled_time === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, scheduled_time: slot })}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Nombre d'animaux</Label>
            <Input
              type="number"
              min="1"
              value={formData.animals_count}
              onChange={(e) => setFormData({ ...formData, animals_count: e.target.value })}
            />
          </div>

          <div>
            <Label>Description du problème</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez les symptômes ou la raison de la consultation..."
              rows={3}
            />
          </div>

          {provider.hourly_rate && (
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-sm text-muted-foreground">Tarif estimé</p>
              <p className="text-xl font-bold text-primary">
                {provider.hourly_rate.toLocaleString()} FCFA
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={saving || !selectedDate || !formData.service_type} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Envoyer la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
