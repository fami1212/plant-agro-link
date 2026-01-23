import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Phone, MessageCircle, Stethoscope, Clock, MapPin, Loader2, Star, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface VetProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  specializations: string[] | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  hourly_rate: number | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean;
}

interface VetAppointmentRequestProps {
  livestockId: string;
  livestockName: string;
  healthStatus: string;
  onSuccess?: () => void;
}

const urgencyOptions = [
  { value: "normal", label: "Normal", description: "Consultation de routine", color: "bg-muted" },
  { value: "soon", label: "Sous 48h", description: "Problème non urgent", color: "bg-warning/20 text-warning" },
  { value: "urgent", label: "Urgent", description: "Intervention rapide nécessaire", color: "bg-destructive/20 text-destructive" },
];

const serviceTypes = [
  { value: "consultation", label: "Consultation" },
  { value: "vaccination", label: "Vaccination" },
  { value: "traitement", label: "Traitement" },
  { value: "chirurgie", label: "Chirurgie" },
  { value: "suivi", label: "Suivi" },
  { value: "autre", label: "Autre" },
];

export function VetAppointmentRequest({
  livestockId,
  livestockName,
  healthStatus,
  onSuccess,
}: VetAppointmentRequestProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVets, setLoadingVets] = useState(false);
  const [vets, setVets] = useState<VetProvider[]>([]);
  const [selectedVet, setSelectedVet] = useState<VetProvider | null>(null);
  const [step, setStep] = useState<"select-vet" | "book">("select-vet");
  
  const [formData, setFormData] = useState({
    serviceType: "consultation",
    urgency: healthStatus !== "sain" ? "soon" : "normal",
    date: "",
    time: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      fetchVets();
    }
  }, [open]);

  const fetchVets = async () => {
    setLoadingVets(true);
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .eq("service_category", "veterinaire")
        .eq("is_active", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      setVets(data || []);
    } catch (error) {
      console.error("Error fetching vets:", error);
    } finally {
      setLoadingVets(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedVet || !formData.date) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("service_bookings").insert({
        provider_id: selectedVet.id,
        client_id: user.id,
        service_type: formData.serviceType,
        scheduled_date: formData.date,
        scheduled_time: formData.time || null,
        description: `[${livestockName}] ${formData.description}`,
        notes: `Urgence: ${formData.urgency}, Statut santé: ${healthStatus}`,
        status: "en_attente",
      });

      if (error) throw error;

      toast.success("Demande de RDV envoyée avec succès!");
      setOpen(false);
      setStep("select-vet");
      setSelectedVet(null);
      setFormData({
        serviceType: "consultation",
        urgency: "normal",
        date: "",
        time: "",
        description: "",
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  const handleContact = (type: "call" | "whatsapp", phone: string | null) => {
    if (!phone) {
      toast.error("Numéro non disponible");
      return;
    }
    if (type === "call") {
      window.open(`tel:${phone}`, "_self");
    } else {
      window.open(`https://wa.me/${phone.replace(/\s/g, "")}`, "_blank");
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          healthStatus !== "sain" && "border-warning text-warning hover:bg-warning/10"
        )}
      >
        <Stethoscope className="w-4 h-4 mr-1" />
        Demander RDV vétérinaire
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              {step === "select-vet" ? "Choisir un vétérinaire" : "Réserver un RDV"}
            </DialogTitle>
            <DialogDescription>
              Pour: {livestockName} • Statut: {healthStatus}
            </DialogDescription>
          </DialogHeader>

          {step === "select-vet" && (
            <div className="space-y-3">
              {loadingVets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : vets.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="p-6 text-center">
                    <Stethoscope className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Aucun vétérinaire disponible pour le moment
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez contacter directement un vétérinaire local
                    </p>
                  </CardContent>
                </Card>
              ) : (
                vets.map((vet) => (
                  <Card
                    key={vet.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary",
                      selectedVet?.id === vet.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedVet(vet)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{vet.business_name}</h4>
                            {vet.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          {vet.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {vet.location}
                            </p>
                          )}
                        </div>
                        {vet.rating && vet.rating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-warning text-warning" />
                            <span className="text-sm font-medium">{vet.rating.toFixed(1)}</span>
                            {vet.reviews_count && (
                              <span className="text-xs text-muted-foreground">
                                ({vet.reviews_count})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {vet.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {vet.description}
                        </p>
                      )}
                      
                      {vet.specializations && vet.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {vet.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        {vet.hourly_rate && (
                          <span className="text-sm font-medium text-primary">
                            {vet.hourly_rate.toLocaleString()} FCFA/h
                          </span>
                        )}
                        <div className="flex gap-2">
                          {vet.phone && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContact("call", vet.phone);
                              }}
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                          {vet.whatsapp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContact("whatsapp", vet.whatsapp);
                              }}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {selectedVet && (
                <Button className="w-full" onClick={() => setStep("book")}>
                  Continuer avec {selectedVet.business_name}
                </Button>
              )}
            </div>
          )}

          {step === "book" && selectedVet && (
            <div className="space-y-4">
              {/* Selected vet summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedVet.business_name}</p>
                    {selectedVet.location && (
                      <p className="text-xs text-muted-foreground">{selectedVet.location}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("select-vet")}
                  >
                    Changer
                  </Button>
                </CardContent>
              </Card>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <Label>Type de service</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(v) => setFormData({ ...formData, serviceType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <Label>Urgence</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {urgencyOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={cn(
                          "p-2 rounded-lg border text-center transition-all",
                          formData.urgency === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => setFormData({ ...formData, urgency: opt.value })}
                      >
                        <span className={cn("text-xs font-medium", opt.color)}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date souhaitée *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label>Heure préférée</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Description du problème</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez les symptômes ou le motif de la consultation..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("select-vet")}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={loading || !formData.date}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-1" />
                        Envoyer la demande
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
