import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stethoscope,
  Calendar,
  Users,
  RefreshCw,
  Loader2,
  Heart,
  AlertCircle,
  FileText,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { VetConsultationForm } from "@/components/veterinaire/VetConsultationForm";
import { VetAnimalUpdateDialog } from "@/components/veterinaire/VetAnimalUpdateDialog";
import { VetAIDiagnosis } from "@/components/veterinaire/VetAIDiagnosis";
import { VetAppointmentsList } from "@/components/veterinaire/VetAppointmentsList";
import { VetPatientsList } from "@/components/veterinaire/VetPatientsList";
import { VetMedicalRecords } from "@/components/veterinaire/VetMedicalRecords";
import { AnimalPatientDetails } from "@/components/veterinaire/AnimalPatientDetails";

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
  notes?: string | null;
}

interface AnimalPatient {
  id: string;
  identifier: string;
  species: string;
  breed: string | null;
  health_status: string;
  weight_kg: number | null;
  birth_date: string | null;
  user_id: string;
  owner_name?: string;
  owner_phone?: string;
  last_visit?: string;
}

interface MedicalRecord {
  id: string;
  livestock_id: string;
  record_type: string;
  description: string | null;
  treatment: string | null;
  veterinarian_name: string | null;
  cost: number | null;
  next_appointment: string | null;
  recorded_at: string;
  animal_identifier?: string;
  animal_species?: string;
  owner_name?: string;
  owner_phone?: string;
}

export default function Veterinaire() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("rdv");
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [patients, setPatients] = useState<AnimalPatient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
      .select("*, livestock(identifier, species, user_id)")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(100);

    if (data) {
      const enrichedRecords = await Promise.all(
        data.map(async (r: any) => {
          let ownerName = null;
          let ownerPhone = null;
          
          if (r.livestock?.user_id) {
            const { data: owner } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", r.livestock.user_id)
              .maybeSingle();
            ownerName = owner?.full_name;
            ownerPhone = owner?.phone;
          }

          return {
            ...r,
            animal_identifier: r.livestock?.identifier,
            animal_species: r.livestock?.species,
            owner_name: ownerName,
            owner_phone: ownerPhone,
          };
        })
      );
      setRecords(enrichedRecords);
    }
  };

  const handleUpdateBookingStatus = async (id: string, status: string, notes?: string) => {
    const updateData: { status: string; notes?: string } = { status };
    if (notes) updateData.notes = notes;
    
    await supabase.from("service_bookings").update(updateData).eq("id", id);
    toast.success("Statut mis à jour");
    fetchBookings();
  };

  const openConsultation = (patient: AnimalPatient) => {
    setSelectedPatient(patient);
    setConsultationOpen(true);
  };

  const openUpdate = (patient: AnimalPatient) => {
    setSelectedPatient(patient);
    setUpdateDialogOpen(true);
  };

  const openDetails = (patient: AnimalPatient) => {
    setSelectedPatient(patient);
    setDetailsOpen(true);
  };

  const handleViewAnimalFromRecord = (livestockId: string) => {
    const patient = patients.find((p) => p.id === livestockId);
    if (patient) {
      openDetails(patient);
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
            { icon: AlertCircle, value: pendingBookings, label: "En attente", color: "warning" },
            { icon: Heart, value: sickPatients, label: "À surveiller", color: "destructive" },
            { icon: Users, value: patients.length, label: "Patients", color: "success" },
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
          <TabsList className="grid w-full grid-cols-5 mb-4 h-12">
            <TabsTrigger value="rdv" className="gap-1 text-xs px-1">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">RDV</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-1 text-xs px-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Patients</span>
            </TabsTrigger>
            <TabsTrigger value="dossiers" className="gap-1 text-xs px-1">
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Dossiers</span>
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="gap-1 text-xs px-1">
              <Stethoscope className="w-4 h-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="gap-1 text-xs px-1">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>

          {/* Appointments Tab */}
          <TabsContent value="rdv" className="mt-0">
            <VetAppointmentsList
              bookings={bookings}
              onUpdateStatus={handleUpdateBookingStatus}
            />
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients" className="mt-0">
            <VetPatientsList
              patients={patients}
              onConsult={openConsultation}
              onUpdate={openUpdate}
              onViewDetails={openDetails}
            />
          </TabsContent>

          {/* Medical Records Tab */}
          <TabsContent value="dossiers" className="mt-0">
            <VetMedicalRecords
              records={records}
              onViewAnimal={handleViewAnimalFromRecord}
            />
          </TabsContent>

          {/* AI Diagnosis Tab */}
          <TabsContent value="diagnostic" className="space-y-3">
            <VetAIDiagnosis
              animalInfo={
                selectedPatient
                  ? {
                      species: selectedPatient.species,
                      breed: selectedPatient.breed || undefined,
                      identifier: selectedPatient.identifier,
                    }
                  : undefined
              }
              onDiagnosisComplete={(diagnosis) => {
                toast.success(`Diagnostic: ${diagnosis.condition}`);
              }}
            />
          </TabsContent>

          {/* History Tab (quick view) */}
          <TabsContent value="historique" className="mt-0">
            <VetMedicalRecords
              records={records.slice(0, 20)}
              onViewAnimal={handleViewAnimalFromRecord}
            />
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

      {/* Animal Details Dialog */}
      <AnimalPatientDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        patient={selectedPatient}
        onAddConsultation={() => {
          setDetailsOpen(false);
          setConsultationOpen(true);
        }}
      />
    </AppLayout>
  );
}
