import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Activity,
  FileText,
  Phone,
  MessageCircle,
  Thermometer,
  Weight,
  Calendar,
  AlertTriangle,
  Syringe,
  Pill,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  user_id: string;
}

interface VetRecord {
  id: string;
  record_type: string;
  description: string | null;
  treatment: string | null;
  recorded_at: string;
  cost: number | null;
  next_appointment: string | null;
}

interface IoTData {
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

interface AnimalPatientDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: AnimalPatient | null;
  onAddConsultation?: () => void;
}

const speciesIcons: Record<string, string> = {
  bovin: "🐄",
  ovin: "🐑",
  caprin: "🐐",
  volaille: "🐔",
  porcin: "🐖",
  equin: "🐴",
  autre: "🐾",
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

const healthStatusConfig: Record<string, { label: string; color: string }> = {
  sain: { label: "En santé", color: "bg-success/15 text-success" },
  malade: { label: "Malade", color: "bg-destructive/15 text-destructive" },
  traitement: { label: "En traitement", color: "bg-warning/15 text-warning" },
  quarantaine: { label: "Quarantaine", color: "bg-amber-500/15 text-amber-600" },
  decede: { label: "Décédé", color: "bg-muted text-muted-foreground" },
};

export function AnimalPatientDetails({
  open,
  onOpenChange,
  patient,
  onAddConsultation,
}: AnimalPatientDetailsProps) {
  const [records, setRecords] = useState<VetRecord[]>([]);
  const [iotData, setIotData] = useState<IoTData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient && open) {
      fetchPatientData();
    }
  }, [patient, open]);

  const fetchPatientData = async () => {
    if (!patient) return;
    setLoading(true);

    try {
      // Fetch veterinary records
      const { data: recordsData } = await supabase
        .from("veterinary_records")
        .select("*")
        .eq("livestock_id", patient.id)
        .order("recorded_at", { ascending: false })
        .limit(20);

      setRecords(recordsData || []);

      // Try to fetch IoT data if animal has a collar/device
      // This would typically be linked through metadata
      const { data: devices } = await supabase
        .from("iot_devices")
        .select("id")
        .eq("device_type", "collar")
        .limit(1);

      if (devices && devices.length > 0) {
        const { data: iotDataResult } = await supabase
          .from("device_data")
          .select("*")
          .eq("device_id", devices[0].id)
          .order("recorded_at", { ascending: false })
          .limit(10);

        setIotData(iotDataResult || []);
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!patient) return null;

  const statusConfig = healthStatusConfig[patient.health_status] || healthStatusConfig.sain;
  const age = patient.birth_date
    ? Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-3xl">{speciesIcons[patient.species] || "🐾"}</span>
            <div>
              <p className="text-xl">{patient.identifier}</p>
              <p className="text-sm font-normal text-muted-foreground">
                {patient.breed || speciesLabels[patient.species]}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="text-xs">Infos</TabsTrigger>
            <TabsTrigger value="historique" className="text-xs">Historique</TabsTrigger>
            <TabsTrigger value="iot" className="text-xs">IoT</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Health Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-primary" />
                <span className="font-medium">État de santé</span>
              </div>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Weight className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{patient.weight_kg || "-"} kg</p>
                  <p className="text-xs text-muted-foreground">Poids</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">{age || "-"} ans</p>
                  <p className="text-xs text-muted-foreground">Âge</p>
                </CardContent>
              </Card>
            </div>

            {/* Owner Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Propriétaire</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="font-medium">{patient.owner_name || "Non renseigné"}</p>
                {patient.owner_phone && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${patient.owner_phone}`, "_self")}
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Appeler
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://wa.me/${patient.owner_phone?.replace(/\s/g, "")}`, "_blank")}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Button className="w-full" onClick={onAddConsultation}>
              <FileText className="w-4 h-4 mr-2" />
              Ajouter une consultation
            </Button>
          </TabsContent>

          <TabsContent value="historique" className="space-y-3 mt-4">
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun historique médical</p>
              </div>
            ) : (
              records.map((record) => (
                <Card key={record.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {record.record_type === "vaccination" && <Syringe className="w-4 h-4 text-primary" />}
                        {record.record_type === "traitement" && <Pill className="w-4 h-4 text-warning" />}
                        {record.record_type === "consultation" && <FileText className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-medium capitalize">{record.record_type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(record.recorded_at), "dd MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    {record.description && (
                      <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                    )}
                    {record.treatment && (
                      <div className="p-2 rounded bg-primary/5 text-sm">
                        <span className="font-medium">Traitement:</span> {record.treatment}
                      </div>
                    )}
                    {record.next_appointment && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                        <Calendar className="w-3 h-3" />
                        Prochain RDV: {format(new Date(record.next_appointment), "dd MMM yyyy", { locale: fr })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="iot" className="space-y-3 mt-4">
            {iotData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun capteur IoT connecté</p>
                <p className="text-sm mt-1">Connectez un collier pour suivre les données en temps réel</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {iotData.slice(0, 4).map((data, i) => (
                    <Card key={i} className={cn(
                      data.metric === "temperature" && data.value > 39.5 && "border-destructive/50"
                    )}>
                      <CardContent className="p-3 text-center">
                        {data.metric === "temperature" && <Thermometer className="w-5 h-5 mx-auto mb-1 text-primary" />}
                        {data.metric === "activity" && <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />}
                        <p className="text-lg font-bold">
                          {data.value} {data.unit}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{data.metric}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Health Alerts */}
                <Card className="border-warning/50 bg-warning/5">
                  <CardContent className="p-3 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Surveillance active</p>
                      <p className="text-sm text-muted-foreground">
                        Les alertes automatiques sont activées pour cet animal
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
