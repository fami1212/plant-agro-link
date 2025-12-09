import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, Droplets, Thermometer, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const parcelles = [
  {
    id: 1,
    name: "Mil Nord",
    surface: "2.5 ha",
    culture: "Mil",
    status: "active",
    humidity: 38,
    temperature: 32,
    alert: true,
  },
  {
    id: 2,
    name: "Arachide Sud",
    surface: "1.8 ha",
    culture: "Arachide",
    status: "active",
    humidity: 52,
    temperature: 29,
    alert: false,
  },
  {
    id: 3,
    name: "Maraîchage Est",
    surface: "0.5 ha",
    culture: "Légumes",
    status: "active",
    humidity: 65,
    temperature: 27,
    alert: false,
  },
  {
    id: 4,
    name: "Maïs Ouest",
    surface: "3.2 ha",
    culture: "Maïs",
    status: "fallow",
    humidity: 45,
    temperature: 30,
    alert: false,
  },
];

export default function Parcelles() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mes Parcelles"
        subtitle={`${parcelles.length} parcelles • 8 ha total`}
        action={
          <Button variant="hero" size="icon" onClick={() => navigate("/parcelles/new")}>
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-3 pb-6">
        {parcelles.map((parcelle, index) => (
          <Card
            key={parcelle.id}
            variant="interactive"
            className={cn("animate-fade-in", `stagger-${index + 1}`)}
            style={{ opacity: 0 }}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      parcelle.alert
                        ? "bg-warning/15 text-warning"
                        : "bg-primary/15 text-primary"
                    )}
                  >
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {parcelle.name}
                      </h3>
                      {parcelle.alert && (
                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse-soft" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {parcelle.culture} • {parcelle.surface}
                    </p>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-4 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Droplets
                    className={cn(
                      "w-4 h-4",
                      parcelle.humidity < 40
                        ? "text-warning"
                        : "text-primary"
                    )}
                  />
                  <span className="text-sm text-foreground">
                    {parcelle.humidity}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">
                    {parcelle.temperature}°C
                  </span>
                </div>
                <div className="flex-1" />
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    parcelle.status === "active"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {parcelle.status === "active" ? "Actif" : "Jachère"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
