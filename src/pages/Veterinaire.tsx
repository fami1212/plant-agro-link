import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Stethoscope,
  Calendar,
  ClipboardList,
  Users,
  RefreshCw,
  Loader2,
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  CheckCircle2,
  Clock,
  X,
  FileText,
  Heart,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

interface Booking {
  id: string;
  client_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  description: string | null;
  notes: string | null;
  price: number | null;
  client_name?: string;
  client_phone?: string;
}

interface Consultation {
  id: string;
  livestock_id: string;
  record_type: string;
  description: string | null;
  treatment: string | null;
  veterinarian_name: string | null;
  next_appointment: string | null;
  recorded_at: string;
  cost: number | null;
  livestock_identifier?: string;
  livestock_species?: string;
  owner_name?: string;
}

interface AnimalPatient {
  id: string;
  identifier: string;
  species: string;
  breed: string | null;
  health_status: string;
  weight_kg: number | null;
  birth_date: string | null;
  owner_name?: string;
  owner_phone?: string;
  consultations_count: number;
  last_consultation?: string;
}

const statusColors: Record<string, string> = {
  en_attente: "bg-warning/15 text-warning border-warning/30",
  confirme: "bg-primary/15 text-primary border-primary/30",
  termine: "bg-success/15 text-success border-success/30",
  annule: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  en_attente: "En attente",
  confirme: "Confirmé",
  termine: "Terminé",
  annule: "Annulé",
};

const healthStatusConfig: Record<string, { label: string; color: string }> = {
  sain: { label: "En santé", color: "bg-success/15 text-success" },
  malade: { label: "Malade", color: "bg-destructive/15 text-destructive" },
  traitement: { label: "En traitement", color: "bg-warning/15 text-warning" },
  quarantaine: { label: "Quarantaine", color: "bg-amber-500/15 text-amber-600" },
  decede: { label: "Décédé", color: "bg-muted text-muted-foreground" },
};

const speciesLabels: Record<string, string> = {
  bovin: "Bovin",
  ovin: "Ovin",
  caprin: "Caprin",
  volaille: "Volaille",
  porcin: "Porcin",
  equin: "Équin",
  autre: "Autre",
};

const speciesIcons: Record<string, string> = {
  bovin: "🐄",
  ovin: "🐑",
  caprin: "🐐",
  volaille: "🐔",
  porcin: "🐖",
  equin: "🐴",
  autre: "🐾",
};

export default function Veterinaire() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("rdv");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<AnimalPatient[]>([]);
  const [myProvider, setMyProvider] = useState<any>(null);
  
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    business_name: "",
    description: "",
    hourly_rate: "",
    phone: "",
    whatsapp: "",
    location: "",
    specializations: [] as string[],
  });
  const [savingService, setSavingService] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<AnimalPatient | null>(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [consultationData, setConsultationData] = useState({
    record_type: "consultation",
    description: "",
    treatment: "",
    cost: "",
    next_appointment: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMyProvider(),
        fetchBookings(),
        fetchConsultations(),
        fetchPatients(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProvider = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_providers")
      .select("*")
      .eq("user_id", user.id)
      .eq("service_category", "veterinaire")
      .maybeSingle();
    
    if (data) {
      setMyProvider(data);
      setServiceFormData({
        business_name: data.business_name || "",
        description: data.description || "",
        hourly_rate: data.hourly_rate?.toString() || "",
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        location: data.location || "",
        specializations: data.specializations || [],
      });
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
    
    // Get provider first
    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!provider) return;

    const { data } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("provider_id", provider.id)
      .order("scheduled_date", { ascending: true });

    if (data) {
      const bookingsWithClients = await Promise.all(
        data.map(async (booking) => {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", booking.client_id)
            .maybeSingle();

          return {
            ...booking,
            client_name: clientProfile?.full_name || "Client",
            client_phone: clientProfile?.phone,
          };
        })
      );
      setBookings(bookingsWithClients);
    }
  };

  const fetchConsultations = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("veterinary_records")
      .select(`
        *,
        livestock:livestock_id (identifier, species, user_id)
      `)
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (data) {
      const consultationsWithDetails = await Promise.all(
        data.map(async (record: any) => {
          let ownerName = "Propriétaire";
          if (record.livestock?.user_id) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", record.livestock.user_id)
              .maybeSingle();
            ownerName = ownerProfile?.full_name || "Propriétaire";
          }

          return {
            id: record.id,
            livestock_id: record.livestock_id,
            record_type: record.record_type,
            description: record.description,
            treatment: record.treatment,
            veterinarian_name: record.veterinarian_name,
            next_appointment: record.next_appointment,
            recorded_at: record.recorded_at,
            cost: record.cost,
            livestock_identifier: record.livestock?.identifier,
            livestock_species: record.livestock?.species,
            owner_name: ownerName,
          };
        })
      );
      setConsultations(consultationsWithDetails);
    }
  };

  const fetchPatients = async () => {
    if (!user) return;
    
    const { data: livestock } = await supabase
      .from("livestock")
      .select("*")
      .order("identifier");

    if (livestock) {
      const patientsWithDetails = await Promise.all(
        livestock.map(async (animal: any) => {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", animal.user_id)
            .maybeSingle();

          const { data: records, count } = await supabase
            .from("veterinary_records")
            .select("recorded_at", { count: "exact" })
            .eq("livestock_id", animal.id)
            .order("recorded_at", { ascending: false })
            .limit(1);

          return {
            id: animal.id,
            identifier: animal.identifier,
            species: animal.species,
            breed: animal.breed,
            health_status: animal.health_status,
            weight_kg: animal.weight_kg,
            birth_date: animal.birth_date,
            owner_name: ownerProfile?.full_name || "Propriétaire",
            owner_phone: ownerProfile?.phone,
            consultations_count: count || 0,
            last_consultation: records?.[0]?.recorded_at,
          };
        })
      );
      setPatients(patientsWithDetails);
    }
  };

  const handleSaveService = async () => {
    if (!user) return;
    setSavingService(true);

    try {
      const serviceData = {
        user_id: user.id,
        service_category: "veterinaire" as const,
        business_name: serviceFormData.business_name,
        description: serviceFormData.description || null,
        hourly_rate: serviceFormData.hourly_rate ? parseFloat(serviceFormData.hourly_rate) : null,
        phone: serviceFormData.phone || null,
        whatsapp: serviceFormData.whatsapp || null,
        location: serviceFormData.location || null,
        specializations: serviceFormData.specializations,
        is_active: true,
      };

      if (myProvider) {
        const { error } = await supabase
          .from("service_providers")
          .update(serviceData)
          .eq("id", myProvider.id);
        if (error) throw error;
        toast.success("Profil mis à jour");
      } else {
        const { error } = await supabase
          .from("service_providers")
          .insert(serviceData);
        if (error) throw error;
        toast.success("Profil créé avec succès");
      }

      setShowServiceForm(false);
      fetchMyProvider();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingService(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("service_bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Statut mis à jour");
      fetchBookings();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAddConsultation = async () => {
    if (!user || !selectedPatient) return;

    try {
      const { error } = await supabase.from("veterinary_records").insert({
        livestock_id: selectedPatient.id,
        user_id: user.id,
        record_type: consultationData.record_type,
        description: consultationData.description || null,
        treatment: consultationData.treatment || null,
        veterinarian_name: profile?.full_name || null,
        cost: consultationData.cost ? parseFloat(consultationData.cost) : null,
        next_appointment: consultationData.next_appointment || null,
      });

      if (error) throw error;
      toast.success("Consultation enregistrée");
      setShowConsultationForm(false);
      setConsultationData({
        record_type: "consultation",
        description: "",
        treatment: "",
        cost: "",
        next_appointment: "",
      });
      fetchConsultations();
      fetchPatients();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    }
  };

  // Stats
  const todayBookings = bookings.filter(
    (b) => b.scheduled_date === new Date().toISOString().split("T")[0]
  ).length;
  const pendingBookings = bookings.filter((b) => b.status === "en_attente").length;
  const sickPatients = patients.filter(
    (p) => p.health_status === "malade" || p.health_status === "traitement"
  ).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Espace Vétérinaire"
        subtitle={`Bienvenue, Dr. ${profile?.full_name || "Vétérinaire"}`}
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-primary">{todayBookings}</p>
              <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
              <p className="text-lg font-bold text-warning">{pendingBookings}</p>
              <p className="text-[10px] text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-3 text-center">
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-destructive" />
              <p className="text-lg font-bold text-destructive">{sickPatients}</p>
              <p className="text-[10px] text-muted-foreground">Malades</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-3 text-center">
              <Heart className="w-4 h-4 mx-auto mb-1 text-success" />
              <p className="text-lg font-bold text-success">{patients.length}</p>
              <p className="text-[10px] text-muted-foreground">Patients</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="rdv" className="text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              RDV
            </TabsTrigger>
            <TabsTrigger value="patients" className="text-xs">
              <Heart className="w-3 h-3 mr-1" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="historique" className="text-xs">
              <ClipboardList className="w-3 h-3 mr-1" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="profil" className="text-xs">
              <Stethoscope className="w-3 h-3 mr-1" />
              Profil
            </TabsTrigger>
          </TabsList>

          {/* RDV Tab */}
          <TabsContent value="rdv" className="space-y-4 pb-24">
            {bookings.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-8 h-8" />}
                title="Aucun rendez-vous"
                description={myProvider ? "Vos rendez-vous apparaîtront ici" : "Configurez d'abord votre profil"}
                action={
                  !myProvider
                    ? { label: "Configurer mon profil", onClick: () => setActiveTab("profil") }
                    : undefined
                }
              />
            ) : (
              bookings.map((booking, index) => (
                <Card key={booking.id} className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)} style={{ opacity: 0 }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{booking.service_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          {booking.client_name} • {format(new Date(booking.scheduled_date), "dd MMM yyyy", { locale: fr })}
                          {booking.scheduled_time && ` à ${booking.scheduled_time}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusColors[booking.status]}>
                        {statusLabels[booking.status] || booking.status}
                      </Badge>
                    </div>

                    {booking.description && (
                      <p className="text-sm text-muted-foreground mb-3">{booking.description}</p>
                    )}

                    <div className="flex gap-2">
                      {booking.client_phone && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`tel:${booking.client_phone}`, "_self")}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://wa.me/${booking.client_phone?.replace(/\s/g, "")}`, "_blank")}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === "en_attente" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateBookingStatus(booking.id, "confirme")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Confirmer
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUpdateBookingStatus(booking.id, "annule")}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {booking.status === "confirme" && (
                        <Button
                          size="sm"
                          className="ml-auto"
                          onClick={() => handleUpdateBookingStatus(booking.id, "termine")}
                        >
                          Terminer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="space-y-4 pb-24">
            {patients.length === 0 ? (
              <EmptyState
                icon={<Heart className="w-8 h-8" />}
                title="Aucun patient"
                description="Les animaux enregistrés apparaîtront ici"
              />
            ) : (
              patients.map((patient, index) => {
                const statusConfig = healthStatusConfig[patient.health_status] || healthStatusConfig.autre;
                return (
                  <Card
                    key={patient.id}
                    variant="interactive"
                    className={cn("animate-fade-in cursor-pointer", `stagger-${(index % 5) + 1}`)}
                    style={{ opacity: 0 }}
                    onClick={() => setSelectedPatient(patient)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl">
                          {speciesIcons[patient.species] || "🐾"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{patient.identifier}</h3>
                            <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {patient.breed || speciesLabels[patient.species]}
                            {patient.weight_kg && ` • ${patient.weight_kg} kg`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Propriétaire: {patient.owner_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-primary">{patient.consultations_count}</p>
                          <p className="text-xs text-muted-foreground">consultations</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Historique Tab */}
          <TabsContent value="historique" className="space-y-4 pb-24">
            {consultations.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-8 h-8" />}
                title="Aucune consultation"
                description="Votre historique de consultations apparaîtra ici"
              />
            ) : (
              consultations.map((consultation, index) => (
                <Card key={consultation.id} className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)} style={{ opacity: 0 }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{speciesIcons[consultation.livestock_species || "autre"]}</span>
                          <h3 className="font-semibold text-foreground">{consultation.livestock_identifier}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {consultation.owner_name} • {format(new Date(consultation.recorded_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline">{consultation.record_type}</Badge>
                    </div>
                    
                    {consultation.description && (
                      <p className="text-sm text-muted-foreground mb-2">{consultation.description}</p>
                    )}
                    
                    {consultation.treatment && (
                      <div className="p-2 rounded bg-primary/5 text-sm">
                        <span className="font-medium">Traitement:</span> {consultation.treatment}
                      </div>
                    )}
                    
                    {consultation.cost && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Coût: {consultation.cost.toLocaleString()} FCFA
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Profil Tab */}
          <TabsContent value="profil" className="space-y-4 pb-24">
            {myProvider ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary" />
                    Mon profil vétérinaire
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h3 className="font-semibold text-lg">{myProvider.business_name}</h3>
                    {myProvider.description && (
                      <p className="text-sm text-muted-foreground mt-1">{myProvider.description}</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {myProvider.hourly_rate && (
                      <div className="p-3 rounded-lg bg-primary/5">
                        <p className="text-xs text-muted-foreground">Tarif horaire</p>
                        <p className="font-semibold text-primary">{myProvider.hourly_rate.toLocaleString()} FCFA</p>
                      </div>
                    )}
                    {myProvider.location && (
                      <div className="p-3 rounded-lg bg-muted">
                        <p className="text-xs text-muted-foreground">Localisation</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {myProvider.location}
                        </p>
                      </div>
                    )}
                  </div>

                  {myProvider.specializations?.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Spécialisations</p>
                      <div className="flex flex-wrap gap-2">
                        {myProvider.specializations.map((spec: string, i: number) => (
                          <Badge key={i} variant="secondary">{spec}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {myProvider.phone && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {myProvider.phone}
                      </Badge>
                    )}
                    {myProvider.whatsapp && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </Badge>
                    )}
                  </div>

                  <Button className="w-full" onClick={() => setShowServiceForm(true)}>
                    Modifier mon profil
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Configurez votre profil</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Créez votre profil pour recevoir des demandes de consultation
                  </p>
                  <Button onClick={() => setShowServiceForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer mon profil
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Service Form Dialog */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{myProvider ? "Modifier mon profil" : "Créer mon profil vétérinaire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="business_name">Nom du cabinet / Clinique *</Label>
              <Input
                id="business_name"
                value={serviceFormData.business_name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, business_name: e.target.value })}
                placeholder="Dr. Diallo - Clinique Vétérinaire"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder="Spécialiste des animaux de ferme..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate">Tarif horaire (FCFA)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  value={serviceFormData.hourly_rate}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, hourly_rate: e.target.value })}
                  placeholder="15000"
                />
              </div>
              <div>
                <Label htmlFor="location">Localisation</Label>
                <Input
                  id="location"
                  value={serviceFormData.location}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, location: e.target.value })}
                  placeholder="Dakar, Sénégal"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={serviceFormData.phone}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, phone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={serviceFormData.whatsapp}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, whatsapp: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowServiceForm(false)}>
                Annuler
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSaveService}
                disabled={savingService || !serviceFormData.business_name}
              >
                {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Detail Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{speciesIcons[selectedPatient?.species || "autre"]}</span>
              Fiche patient: {selectedPatient?.identifier}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Espèce</p>
                    <p className="font-medium">{speciesLabels[selectedPatient.species]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Race</p>
                    <p className="font-medium">{selectedPatient.breed || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Poids</p>
                    <p className="font-medium">{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">État</p>
                    <Badge variant="outline" className={healthStatusConfig[selectedPatient.health_status]?.color}>
                      {healthStatusConfig[selectedPatient.health_status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Propriétaire
                </h4>
                <p className="font-medium">{selectedPatient.owner_name}</p>
                {selectedPatient.owner_phone && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${selectedPatient.owner_phone}`, "_self")}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Appeler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://wa.me/${selectedPatient.owner_phone?.replace(/\s/g, "")}`, "_blank")}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-muted-foreground">
                {selectedPatient.consultations_count} consultation(s) enregistrée(s)
                {selectedPatient.last_consultation && (
                  <> • Dernière: {format(new Date(selectedPatient.last_consultation), "dd MMM yyyy", { locale: fr })}</>
                )}
              </div>

              <Button className="w-full" onClick={() => setShowConsultationForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une consultation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consultation Form Dialog */}
      <Dialog open={showConsultationForm} onOpenChange={setShowConsultationForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle consultation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select
                value={consultationData.record_type}
                onValueChange={(value) => setConsultationData({ ...consultationData, record_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="vaccination">Vaccination</SelectItem>
                  <SelectItem value="traitement">Traitement</SelectItem>
                  <SelectItem value="chirurgie">Chirurgie</SelectItem>
                  <SelectItem value="vermifuge">Vermifuge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={consultationData.description}
                onChange={(e) => setConsultationData({ ...consultationData, description: e.target.value })}
                placeholder="Observations, diagnostic..."
                rows={3}
              />
            </div>
            <div>
              <Label>Traitement prescrit</Label>
              <Textarea
                value={consultationData.treatment}
                onChange={(e) => setConsultationData({ ...consultationData, treatment: e.target.value })}
                placeholder="Médicaments, doses..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Coût (FCFA)</Label>
                <Input
                  type="number"
                  value={consultationData.cost}
                  onChange={(e) => setConsultationData({ ...consultationData, cost: e.target.value })}
                  placeholder="15000"
                />
              </div>
              <div>
                <Label>Prochain RDV</Label>
                <Input
                  type="date"
                  value={consultationData.next_appointment}
                  onChange={(e) => setConsultationData({ ...consultationData, next_appointment: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConsultationForm(false)}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleAddConsultation}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
