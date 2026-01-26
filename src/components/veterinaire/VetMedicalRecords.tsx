import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Calendar,
  Syringe,
  Pill,
  Stethoscope,
  ChevronRight,
  AlertTriangle,
  Phone,
  MessageCircle,
  ClipboardList,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface VetMedicalRecordsProps {
  records: MedicalRecord[];
  onViewAnimal?: (livestockId: string) => void;
}

const recordTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  vaccination: { icon: <Syringe className="w-4 h-4" />, color: "bg-primary/10 text-primary", label: "Vaccination" },
  consultation: { icon: <Stethoscope className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-600", label: "Consultation" },
  traitement: { icon: <Pill className="w-4 h-4" />, color: "bg-warning/10 text-warning", label: "Traitement" },
  chirurgie: { icon: <ClipboardList className="w-4 h-4" />, color: "bg-destructive/10 text-destructive", label: "Chirurgie" },
  suivi: { icon: <FileText className="w-4 h-4" />, color: "bg-muted text-muted-foreground", label: "Suivi" },
  urgence: { icon: <AlertTriangle className="w-4 h-4" />, color: "bg-destructive/10 text-destructive", label: "Urgence" },
  vermifuge: { icon: <Pill className="w-4 h-4" />, color: "bg-green-500/10 text-green-600", label: "Vermifuge" },
  insemination: { icon: <Stethoscope className="w-4 h-4" />, color: "bg-purple-500/10 text-purple-600", label: "Insémination" },
};

const speciesEmoji: Record<string, string> = {
  bovin: "🐄", ovin: "🐑", caprin: "🐐", volaille: "🐔", porcin: "🐖", equin: "🐴", autre: "🐾",
};

export function VetMedicalRecords({ records, onViewAnimal }: VetMedicalRecordsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const filteredRecords = records.filter((r) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.animal_identifier?.toLowerCase().includes(searchLower) ||
      r.record_type.toLowerCase().includes(searchLower) ||
      r.description?.toLowerCase().includes(searchLower) ||
      r.treatment?.toLowerCase().includes(searchLower) ||
      r.owner_name?.toLowerCase().includes(searchLower)
    );
  });

  // Group records by date
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const date = format(new Date(record.recorded_at), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, MedicalRecord[]>);

  const openDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par animal, type, traitement..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: records.length, color: "primary" },
          { label: "Vaccins", value: records.filter(r => r.record_type === "vaccination").length, color: "success" },
          { label: "Traitements", value: records.filter(r => r.record_type === "traitement").length, color: "warning" },
          { label: "Urgences", value: records.filter(r => r.record_type === "urgence").length, color: "destructive" },
        ].map(({ label, value, color }) => (
          <Card key={label} className={cn(`bg-${color}/5 border-${color}/20`)}>
            <CardContent className="p-2 text-center">
              <p className={cn("text-lg font-bold", `text-${color}`)}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Records List */}
      {Object.keys(groupedRecords).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun dossier médical</p>
          <p className="text-sm">Les consultations enregistrées apparaîtront ici</p>
        </div>
      ) : (
        Object.entries(groupedRecords)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, dayRecords]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {format(new Date(date), "EEEE d MMMM yyyy", { locale: fr })}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {dayRecords.length} intervention{dayRecords.length > 1 ? "s" : ""}
                </Badge>
              </div>

              {dayRecords.map((record, i) => {
                const config = recordTypeConfig[record.record_type] || recordTypeConfig.consultation;
                return (
                  <Card
                    key={record.id}
                    className={cn(
                      "cursor-pointer hover:shadow-md transition-all animate-fade-in",
                      `stagger-${(i % 5) + 1}`
                    )}
                    style={{ opacity: 0 }}
                    onClick={() => openDetails(record)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", config.color)}>
                          {config.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{speciesEmoji[record.animal_species || "autre"]}</span>
                            <span className="font-semibold">{record.animal_identifier || "Animal"}</span>
                            <Badge className={config.color}>{config.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {record.description || "Pas de description"}
                          </p>
                          {record.owner_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Propriétaire: {record.owner_name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
      )}

      {/* Record Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">
                {speciesEmoji[selectedRecord?.animal_species || "autre"]}
              </span>
              <div>
                <p>{selectedRecord?.animal_identifier || "Animal"}</p>
                <p className="text-sm font-normal text-muted-foreground">
                  {format(
                    new Date(selectedRecord?.recorded_at || new Date()),
                    "dd MMMM yyyy 'à' HH:mm",
                    { locale: fr }
                  )}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 mt-2">
              {/* Type Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type d'intervention</span>
                <Badge className={recordTypeConfig[selectedRecord.record_type]?.color || ""}>
                  {recordTypeConfig[selectedRecord.record_type]?.label || selectedRecord.record_type}
                </Badge>
              </div>

              {/* Description */}
              {selectedRecord.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description / Diagnostic
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecord.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Treatment */}
              {selectedRecord.treatment && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary">
                      <Pill className="w-4 h-4" />
                      Traitement prescrit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm whitespace-pre-wrap">{selectedRecord.treatment}</p>
                  </CardContent>
                </Card>
              )}

              {/* Cost & Next Appointment */}
              <div className="grid grid-cols-2 gap-3">
                {selectedRecord.cost && (
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-primary">
                        {selectedRecord.cost.toLocaleString()} FCFA
                      </p>
                      <p className="text-xs text-muted-foreground">Coût</p>
                    </CardContent>
                  </Card>
                )}
                {selectedRecord.next_appointment && (
                  <Card className="border-warning/30 bg-warning/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-sm font-bold text-warning">
                        {format(new Date(selectedRecord.next_appointment), "dd MMM yyyy", { locale: fr })}
                      </p>
                      <p className="text-xs text-muted-foreground">Prochain RDV</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Owner Contact */}
              {selectedRecord.owner_phone && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`tel:${selectedRecord.owner_phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(`https://wa.me/${selectedRecord.owner_phone?.replace(/\s/g, "")}`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {onViewAnimal && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDetailsOpen(false);
                      onViewAnimal(selectedRecord.livestock_id);
                    }}
                  >
                    Voir le patient
                  </Button>
                )}
                <Button variant="ghost" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
