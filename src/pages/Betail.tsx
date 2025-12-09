import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, PawPrint, Heart, Syringe, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const animals = [
  {
    id: "BV-001",
    type: "Bovin",
    race: "Ndama",
    age: "3 ans",
    poids: "320 kg",
    status: "healthy",
    nextVaccin: "15 Jan 2025",
    alert: false,
  },
  {
    id: "BV-002",
    type: "Bovin",
    race: "Gobra",
    age: "2 ans",
    poids: "280 kg",
    status: "healthy",
    nextVaccin: "20 Déc 2024",
    alert: true,
  },
  {
    id: "OV-001",
    type: "Ovin",
    race: "Touabire",
    age: "1 an",
    poids: "45 kg",
    status: "healthy",
    nextVaccin: "5 Jan 2025",
    alert: false,
  },
  {
    id: "CP-001",
    type: "Caprin",
    race: "Djallonké",
    age: "8 mois",
    poids: "25 kg",
    status: "treatment",
    nextVaccin: "-",
    alert: true,
  },
];

const typeIcons = {
  Bovin: "🐄",
  Ovin: "🐑",
  Caprin: "🐐",
};

export default function Betail() {
  return (
    <AppLayout>
      <PageHeader
        title="Mon Bétail"
        subtitle="45 têtes • 3 espèces"
        action={
          <Button variant="hero" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="px-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">Bovins</p>
            <p className="text-lg font-bold text-foreground">28</p>
          </div>
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-xs text-muted-foreground">Ovins</p>
            <p className="text-lg font-bold text-foreground">12</p>
          </div>
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-secondary/10 border border-secondary/20">
            <p className="text-xs text-muted-foreground">Caprins</p>
            <p className="text-lg font-bold text-foreground">5</p>
          </div>
          <div className="flex-shrink-0 px-4 py-3 rounded-xl bg-warning/10 border border-warning/20">
            <p className="text-xs text-muted-foreground">Alertes</p>
            <p className="text-lg font-bold text-warning">2</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-6">
        {animals.map((animal, index) => (
          <Card
            key={animal.id}
            variant="interactive"
            className={cn("animate-fade-in", `stagger-${index + 1}`)}
            style={{ opacity: 0 }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
                  {typeIcons[animal.type as keyof typeof typeIcons]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{animal.id}</h3>
                    {animal.alert && (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {animal.race} • {animal.age} • {animal.poids}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    animal.status === "healthy"
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  )}
                >
                  {animal.status === "healthy" ? "En santé" : "Traitement"}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span>Bonne santé</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Syringe
                    className={cn(
                      "w-4 h-4",
                      animal.alert ? "text-warning" : "text-muted-foreground"
                    )}
                  />
                  <span className={animal.alert ? "text-warning font-medium" : "text-muted-foreground"}>
                    {animal.nextVaccin}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
