import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Wheat, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const cultures = [
  {
    id: 1,
    name: "Mil",
    parcelle: "Mil Nord",
    dateSemis: "15 Juin 2024",
    recolte: "30 Oct 2024",
    progress: 65,
    status: "croissance",
    rendementPrevu: "2.8 t/ha",
  },
  {
    id: 2,
    name: "Arachide",
    parcelle: "Arachide Sud",
    dateSemis: "1 Juillet 2024",
    recolte: "15 Nov 2024",
    progress: 45,
    status: "floraison",
    rendementPrevu: "1.5 t/ha",
  },
  {
    id: 3,
    name: "Tomates",
    parcelle: "Maraîchage Est",
    dateSemis: "20 Août 2024",
    recolte: "15 Déc 2024",
    progress: 30,
    status: "croissance",
    rendementPrevu: "25 t/ha",
  },
  {
    id: 4,
    name: "Oignons",
    parcelle: "Maraîchage Est",
    dateSemis: "1 Sep 2024",
    recolte: "1 Jan 2025",
    progress: 20,
    status: "germination",
    rendementPrevu: "20 t/ha",
  },
];

const statusColors = {
  germination: "bg-blue-500",
  croissance: "bg-primary",
  floraison: "bg-accent",
  maturite: "bg-success",
};

export default function Cultures() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Cultures"
        subtitle="8 cultures actives"
        action={
          <Button variant="hero" size="icon">
            <Plus className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 space-y-3 pb-6">
        {cultures.map((culture, index) => (
          <Card
            key={culture.id}
            variant="interactive"
            className={cn("animate-fade-in", `stagger-${index + 1}`)}
            style={{ opacity: 0 }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                  <Wheat className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{culture.name}</h3>
                  <p className="text-sm text-muted-foreground">{culture.parcelle}</p>
                </div>
                <span
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium capitalize text-primary-foreground",
                    statusColors[culture.status as keyof typeof statusColors]
                  )}
                >
                  {culture.status}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium text-foreground">{culture.progress}%</span>
                  </div>
                  <Progress value={culture.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Récolte: {culture.recolte}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-success font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>{culture.rendementPrevu}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
