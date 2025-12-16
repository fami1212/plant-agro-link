import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Calendar, Clock, Loader2, Truck, Wrench, User, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import { PaymentType } from "@/services/paymentService";

interface ServiceProvider {
  id: string;
  user_id: string;
  business_name: string;
  service_category: string;
  hourly_rate: number | null;
  phone: string | null;
}

interface ServiceBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ServiceProvider | null;
  onSuccess?: () => void;
}

const serviceTypesByCategory: Record<string, { value: string; label: string }[]> = {
  technicien_iot: [
    { value: "installation", label: "Installation capteurs" },
    { value: "maintenance", label: "Maintenance" },
    { value: "reparation", label: "Réparation" },
    { value: "configuration", label: "Configuration système" },
  ],
  transporteur: [
    { value: "livraison_locale", label: "Livraison locale" },
    { value: "livraison_regionale", label: "Livraison régionale" },
    { value: "transport_betail", label: "Transport bétail" },
    { value: "transport_materiel", label: "Transport matériel" },
  ],
  conseiller: [
    { value: "conseil_culture", label: "Conseil culture" },
    { value: "conseil_elevage", label: "Conseil élevage" },
    { value: "formation", label: "Formation" },
    { value: "audit", label: "Audit exploitation" },
  ],
  cooperative: [
    { value: "adhesion", label: "Adhésion" },
    { value: "stockage", label: "Stockage" },
    { value: "commercialisation", label: "Commercialisation" },
  ],
  autre: [
    { value: "autre", label: "Autre service" },
  ],
};

export function ServiceBookingDialog({
  open,
  onOpenChange,
  provider,
  onSuccess,
}: ServiceBookingDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"details" | "success">("details");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceType: "",
    scheduledDate: "",
    scheduledTime: "",
    duration: "1",
    description: "",
    location: "",
  });

  if (!provider) return null;

  const serviceTypes = serviceTypesByCategory[provider.service_category] || serviceTypesByCategory.autre;
  const estimatedPrice = (provider.hourly_rate || 5000) * parseFloat(formData.duration || "1");

  const handleSubmit = async () => {
    if (!user || !formData.serviceType || !formData.scheduledDate) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("service_bookings")
        .insert({
          client_id: user.id,
          provider_id: provider.id,
          service_type: formData.serviceType,
          scheduled_date: formData.scheduledDate,
          scheduled_time: formData.scheduledTime || null,
          duration_hours: parseFloat(formData.duration),
          price: estimatedPrice,
          description: formData.description || null,
          notes: formData.location ? `Lieu: ${formData.location}` : null,
          status: "en_attente",
          payment_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      
      setBookingId(data.id);
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Booking error:", error);
      toast.error("Erreur lors de la réservation");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!bookingId) return;
    
    try {
      await supabase
        .from("service_bookings")
        .update({ payment_status: "paid", status: "confirmee" })
        .eq("id", bookingId);

      setShowPaymentModal(false);
      setStep("success");
    } catch (error) {
      console.error("Payment update error:", error);
    }
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess?.();
    }
    onOpenChange(false);
    setStep("details");
    setShowPaymentModal(false);
    setFormData({
      serviceType: "",
      scheduledDate: "",
      scheduledTime: "",
      duration: "1",
      description: "",
      location: "",
    });
  };

  const getCategoryIcon = () => {
    switch (provider.service_category) {
      case "technicien_iot": return <Wrench className="w-5 h-5" />;
      case "transporteur": return <Truck className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getCategoryIcon()}
              Réserver {provider.business_name}
            </DialogTitle>
            <DialogDescription>
              {step === "details" 
                ? "Remplissez les détails de votre demande"
                : "Votre réservation est confirmée"
              }
            </DialogDescription>
          </DialogHeader>

          {step === "details" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type de service *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, serviceType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un service" />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Heure</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-10"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Durée estimée (heures)</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, duration: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 heure</SelectItem>
                    <SelectItem value="2">2 heures</SelectItem>
                    <SelectItem value="4">4 heures (demi-journée)</SelectItem>
                    <SelectItem value="8">8 heures (journée)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {provider.service_category === "transporteur" && (
                <div className="space-y-2">
                  <Label>Lieu de prise en charge</Label>
                  <Input
                    placeholder="Adresse ou localisation GPS"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Description de la demande</Label>
                <Textarea
                  placeholder="Décrivez votre besoin en détail..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimation</span>
                  <span className="text-xl font-bold text-primary">
                    {estimatedPrice.toLocaleString()} FCFA
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {provider.hourly_rate?.toLocaleString() || "5 000"} FCFA/h × {formData.duration}h
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSubmit}
                disabled={submitting || !formData.serviceType || !formData.scheduledDate}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Réservation...
                  </>
                ) : (
                  "Continuer vers le paiement"
                )}
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <div>
                <p className="font-semibold text-lg">Réservation confirmée!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le prestataire sera notifié de votre demande
                </p>
              </div>
              <Button className="w-full" onClick={handleClose}>
                Terminé
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {bookingId && (
        <MobileMoneyPayment
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          amount={estimatedPrice}
          description={`Réservation ${provider.business_name}`}
          paymentType={"service_booking" as PaymentType}
          referenceId={bookingId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}