import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stethoscope,
  Calendar,
  Users,
  RefreshCw,
  Loader2,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  X,
  Heart,
  AlertCircle,
  FileText,
  Plus,
  Activity,
  Scale,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { VetConsultationForm } from "@/components/veterinaire/VetConsultationForm";
import { VetAnimalUpdateDialog } from "@/components/veterinaire/VetAnimalUpdateDialog";
interface Booking {
  id: string;
  client_id: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  description: string | null;
  client_name?: string;
  client_phone?: string;
}

interface AnimalPatient {
  id: string;
  identifier: string;
  species: string;
  breed: string | null;
  health_status: string;
  weight_kg: number | null;
  user_id: string;
  owner_name?: string;
  owner_phone?: string;
  last_visit?: string;
}

interface VetRecord {
  id: string;
  livestock_id: string;
  record_type: string;
  description: string | null;
  treatment: string | null;
  recorded_at: string;
  animal_name?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "bg-warning/10 text-warning" },
  confirme: { label: "Confirmé", color: "bg-primary/10 text-primary" },
  termine: { label: "Terminé", color: "bg-success/10 text-success" },
  annule: { label: "Annulé", color: "bg-muted text-muted-foreground" },
};

const healthConfig: Record<string, { label: string; color: string }> = {
  sain: { label: "En santé", color: "bg-success/10 text-success" },
  malade: { label: "Malade", color: "bg-destructive/10 text-destructive" },
  traitement: { label: "Traitement", color: "bg-warning/10 text-warning" },
  quarantaine: { label: "Quarantaine", color: "bg-amber-500/10 text-amber-600" },
};

const speciesEmoji: Record<string, string> = {
  bovin: "🐄", ovin: "🐑", caprin: "🐐", volaille: "🐔", porcin: "🐖", equin: "🐴", autre: "🐾",
};

export default function Veterinaire() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("rdv");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<AnimalPatient[]>([]);
  const [records, setRecords] = useState<VetRecord[]>([]);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AnimalPatient | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBookings(), fetchPatients(), fetchRecords()]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) return;
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
      const withClients = await Promise.all(
        data.map(async (b) => {
          const { data: client } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", b.client_id)
            .maybeSingle();
          return { ...b, client_name: client?.full_name || "Client", client_phone: client?.phone };
        })
      );
      setBookings(withClients);
    }
  };

  const fetchPatients = async () => {
    const { data } = await supabase.from("livestock").select("*").order("identifier");
    if (data) {
      const withOwners = await Promise.all(
        data.map(async (a: any) => {
          const { data: owner } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", a.user_id)
            .maybeSingle();
          
          const { data: lastRecord } = await supabase
            .from("veterinary_records")
            .select("recorded_at")
            .eq("livestock_id", a.id)
            .order("recorded_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return { 
            ...a, 
            owner_name: owner?.full_name, 
            owner_phone: owner?.phone,
            last_visit: lastRecord?.recorded_at 
          };
        })
      );
      setPatients(withOwners);
    }
  };

  const fetchRecords = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("veterinary_records")
      .select("*, livestock(identifier)")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(20);

    if (data) {
      setRecords(data.map((r: any) => ({
        ...r,
        animal_name: r.livestock?.identifier,
      })));
    }
  };

  const updateBookingStatus = async (id: string, status: string) => {
    await supabase.from("service_bookings").update({ status }).eq("id", id);
    toast.success("Statut mis à jour");
    fetchBookings();
  };

  const openConsultation = (patient: AnimalPatient) => {
    setSelectedPatient(patient);
    setConsultationOpen(true);
  };

  const todayBookings = bookings.filter(b => b.scheduled_date === new Date().toISOString().split("T")[0]).length;
  const pendingBookings = bookings.filter(b => b.status === "en_attente").length;
  const sickPatients = patients.filter(p => p.health_status === "malade" || p.health_status === "traitement").length;

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
        title={`Dr. ${profile?.full_name?.split(" ")[0] || "Vétérinaire"}`}
        subtitle="Espace vétérinaire"
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      {/* AI Contextual Tip */}
      <div className="px-4 mb-4">
        <AIContextualTip 
          context="veterinaire" 
          data={{ todayBookings, pendingBookings, sickPatients, totalPatients: patients.length }} 
        />
      </div>

      {/* Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Calendar, value: todayBookings, label: "Aujourd'hui", color: "primary" },
            { icon: Clock, value: pendingBookings, label: "En attente", color: "warning" },
            { icon: AlertCircle, value: sickPatients, label: "Malades", color: "destructive" },
            { icon: Heart, value: patients.length, label: "Patients", color: "success" },
          ].map(({ icon: Icon, value, label, color }) => (
            <Card key={label} className={cn(`bg-${color}/5 border-${color}/20`)}>
              <CardContent className="p-3 text-center">
                <Icon className={cn("w-4 h-4 mx-auto mb-1", `text-${color}`)} />
                <p className={cn("text-lg font-bold", `text-${color}`)}>{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4 h-12">
            <TabsTrigger value="rdv" className="gap-2">
              <Calendar className="w-4 h-4" />
              RDV
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-2">
              <Users className="w-4 h-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="historique" className="gap-2">
              <FileText className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Bookings */}
          <TabsContent value="rdv" className="space-y-3">
            {bookings.length === 0 ? (
              <EmptyState icon={<Calendar className="w-8 h-8" />} title="Aucun rendez-vous" description="Vos réservations apparaîtront ici" />
            ) : (
              bookings.map((b, i) => {
                const status = statusConfig[b.status] || statusConfig.en_attente;
                return (
                  <Card key={b.id} className={cn("animate-fade-in", `stagger-${(i % 5) + 1}`)} style={{ opacity: 0 }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{b.client_name}</p>
                          <p className="text-sm text-muted-foreground">{b.service_type}</p>
                        </div>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {format(new Date(b.scheduled_date), "EEEE d MMMM", { locale: fr })}
                        {b.scheduled_time && ` à ${b.scheduled_time}`}
                      </p>
                      {b.status === "en_attente" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => updateBookingStatus(b.id, "confirme")}>
                            <CheckCircle2 className="w-4 h-4 mr-1" />Confirmer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateBookingStatus(b.id, "annule")}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {b.client_phone && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`tel:${b.client_phone}`)}>
                            <Phone className="w-4 h-4 mr-1" />Appeler
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`https://wa.me/${b.client_phone?.replace(/\s/g, "")}`)}>
                            <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Patients */}
          <TabsContent value="patients" className="space-y-3">
            {patients.length === 0 ? (
              <EmptyState icon={<Users className="w-8 h-8" />} title="Aucun patient" description="Les animaux apparaîtront ici" />
            ) : (
              patients.map((p, i) => {
                const health = healthConfig[p.health_status] || healthConfig.sain;
                return (
                  <Card key={p.id} className={cn("animate-fade-in", `stagger-${(i % 5) + 1}`)} style={{ opacity: 0 }}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl">
                          {speciesEmoji[p.species] || "🐾"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{p.identifier}</p>
                            <Badge className={health.color}>{health.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {p.breed || p.species} • {p.owner_name}
                          </p>
                          {p.last_visit && (
                            <p className="text-xs text-muted-foreground">
                              Dernière visite: {format(new Date(p.last_visit), "dd MMM yyyy", { locale: fr })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="outline" onClick={() => openConsultation(p)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Consulter
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setSelectedPatient(p);
                              setUpdateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="historique" className="space-y-3">
            {records.length === 0 ? (
              <EmptyState icon={<FileText className="w-8 h-8" />} title="Aucun historique" description="Vos consultations apparaîtront ici" />
            ) : (
              records.map((r, i) => (
                <Card key={r.id} className={cn("animate-fade-in", `stagger-${(i % 5) + 1}`)} style={{ opacity: 0 }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{r.animal_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{r.record_type}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.recorded_at), "dd MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                    )}
                    {r.treatment && (
                      <div className="mt-2 p-2 rounded-lg bg-primary/5">
                        <p className="text-xs font-medium text-primary">Traitement:</p>
                        <p className="text-sm">{r.treatment}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Consultation Form */}
      <VetConsultationForm
        open={consultationOpen}
        onOpenChange={setConsultationOpen}
        patient={selectedPatient}
        onSuccess={fetchData}
      />

      {/* Animal Update Dialog */}
      <VetAnimalUpdateDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        animal={selectedPatient}
        onSuccess={fetchData}
      />
    </AppLayout>
  );
}