import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Edit,
  Heart,
  AlertTriangle,
  Calendar,
  Filter,
  Phone,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/common/EmptyState";

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
  next_appointment?: string;
}

interface VetPatientsListProps {
  patients: AnimalPatient[];
  onConsult: (patient: AnimalPatient) => void;
  onUpdate: (patient: AnimalPatient) => void;
  onViewDetails: (patient: AnimalPatient) => void;
}

const healthConfig: Record<string, { label: string; color: string; priority: number }> = {
  malade: { label: "Malade", color: "bg-destructive/10 text-destructive border-destructive/30", priority: 1 },
  traitement: { label: "Traitement", color: "bg-warning/10 text-warning border-warning/30", priority: 2 },
  quarantaine: { label: "Quarantaine", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", priority: 3 },
  sain: { label: "En santé", color: "bg-success/10 text-success border-success/30", priority: 4 },
  decede: { label: "Décédé", color: "bg-muted text-muted-foreground border-muted", priority: 5 },
};

const speciesEmoji: Record<string, string> = {
  bovin: "🐄", ovin: "🐑", caprin: "🐐", volaille: "🐔", porcin: "🐖", equin: "🐴", autre: "🐾",
};

const speciesLabels: Record<string, string> = {
  bovin: "Bovins", ovin: "Ovins", caprin: "Caprins", volaille: "Volailles", porcin: "Porcins", equin: "Équins", autre: "Autres",
};

export function VetPatientsList({ patients, onConsult, onUpdate, onViewDetails }: VetPatientsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  // Filter and sort patients
  const filteredPatients = patients
    .filter((p) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        p.identifier.toLowerCase().includes(searchLower) ||
        p.breed?.toLowerCase().includes(searchLower) ||
        p.owner_name?.toLowerCase().includes(searchLower);
      const matchesSpecies = speciesFilter === "all" || p.species === speciesFilter;
      const matchesHealth = healthFilter === "all" || p.health_status === healthFilter;
      return matchesSearch && matchesSpecies && matchesHealth;
    })
    .sort((a, b) => {
      // Sort by health priority (sick animals first)
      const priorityA = healthConfig[a.health_status]?.priority || 99;
      const priorityB = healthConfig[b.health_status]?.priority || 99;
      return priorityA - priorityB;
    });

  // Stats
  const sickCount = patients.filter((p) => p.health_status === "malade").length;
  const treatmentCount = patients.filter((p) => p.health_status === "traitement").length;
  const healthyCount = patients.filter((p) => p.health_status === "sain").length;

  // Get unique species
  const uniqueSpecies = [...new Set(patients.map((p) => p.species))];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-destructive" />
            <p className="text-lg font-bold text-destructive">{sickCount}</p>
            <p className="text-[10px] text-muted-foreground">Malades</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <Heart className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-lg font-bold text-warning">{treatmentCount}</p>
            <p className="text-[10px] text-muted-foreground">Traitement</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <Heart className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-lg font-bold text-success">{healthyCount}</p>
            <p className="text-[10px] text-muted-foreground">En santé</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un animal, propriétaire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Espèce" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les espèces</SelectItem>
              {uniqueSpecies.map((species) => (
                <SelectItem key={species} value={species}>
                  {speciesEmoji[species]} {speciesLabels[species] || species}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={setHealthFilter}>
            <SelectTrigger className="flex-1">
              <Heart className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Santé" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              {Object.entries(healthConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Patients List */}
      {filteredPatients.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-8 h-8" />}
          title="Aucun patient trouvé"
          description={searchTerm || speciesFilter !== "all" || healthFilter !== "all"
            ? "Modifiez vos filtres de recherche"
            : "Les animaux apparaîtront ici"
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredPatients.map((patient, i) => {
            const health = healthConfig[patient.health_status] || healthConfig.sain;
            const isCritical = patient.health_status === "malade" || patient.health_status === "traitement";

            return (
              <Card
                key={patient.id}
                className={cn(
                  "animate-fade-in transition-all",
                  `stagger-${(i % 5) + 1}`,
                  isCritical && "border-l-4 border-l-destructive"
                )}
                style={{ opacity: 0 }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => onViewDetails(patient)}
                    >
                      {speciesEmoji[patient.species] || "🐾"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-semibold cursor-pointer hover:text-primary transition-colors"
                          onClick={() => onViewDetails(patient)}
                        >
                          {patient.identifier}
                        </span>
                        <Badge className={health.color}>{health.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {patient.breed || patient.species}
                        {patient.weight_kg && ` • ${patient.weight_kg} kg`}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {patient.owner_name || "Propriétaire inconnu"}
                      </p>
                      {patient.last_visit && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Dernière visite: {format(new Date(patient.last_visit), "dd MMM yyyy", { locale: fr })}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button size="sm" onClick={() => onConsult(patient)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Consulter
                      </Button>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onViewDetails(patient)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onUpdate(patient)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {patient.owner_phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`tel:${patient.owner_phone}`)}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
