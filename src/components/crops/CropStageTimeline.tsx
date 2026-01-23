import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type CropStatus = Database["public"]["Enums"]["crop_status"];

interface CropStageTimelineProps {
  currentStatus: CropStatus;
  sowingDate?: string | null;
  expectedHarvestDate?: string | null;
  actualHarvestDate?: string | null;
  onAdvanceStage?: () => void;
  compact?: boolean;
}

interface Stage {
  status: CropStatus;
  label: string;
  description: string;
  icon: string;
  duration?: string;
}

const stages: Stage[] = [
  { 
    status: "planifie", 
    label: "Planifié", 
    description: "Préparation du sol et planification",
    icon: "📋",
    duration: "1-2 sem"
  },
  { 
    status: "seme", 
    label: "Semé", 
    description: "Graines en terre, attente germination",
    icon: "🌱",
    duration: "1-2 sem"
  },
  { 
    status: "en_croissance", 
    label: "Croissance", 
    description: "Développement végétatif actif",
    icon: "🌿",
    duration: "4-8 sem"
  },
  { 
    status: "floraison", 
    label: "Floraison", 
    description: "Période de floraison et pollinisation",
    icon: "🌸",
    duration: "2-4 sem"
  },
  { 
    status: "maturation", 
    label: "Maturation", 
    description: "Fruits/grains en développement",
    icon: "🌾",
    duration: "3-6 sem"
  },
  { 
    status: "recolte", 
    label: "Récolte", 
    description: "Prêt à être récolté",
    icon: "🧺",
    duration: "1-2 sem"
  },
  { 
    status: "termine", 
    label: "Terminé", 
    description: "Cycle complet",
    icon: "✅"
  },
];

const statusOrder: CropStatus[] = ['planifie', 'seme', 'en_croissance', 'floraison', 'maturation', 'recolte', 'termine'];

export function CropStageTimeline({ 
  currentStatus, 
  sowingDate, 
  expectedHarvestDate,
  actualHarvestDate,
  onAdvanceStage,
  compact = false
}: CropStageTimelineProps) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  const isComplete = currentStatus === "termine";
  const canAdvance = currentIndex < statusOrder.length - 1;

  // Calculate estimated dates for each stage
  const getEstimatedDate = (stageIndex: number) => {
    if (!sowingDate || !expectedHarvestDate) return null;
    
    const start = new Date(sowingDate);
    const end = new Date(expectedHarvestDate);
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    // Distribute stages roughly
    const stageDistribution = [0.05, 0.15, 0.4, 0.6, 0.8, 0.95, 1];
    const stageDate = new Date(start.getTime() + totalDays * stageDistribution[stageIndex] * (1000 * 60 * 60 * 24));
    
    return stageDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getStageState = (index: number) => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const state = getStageState(index);
          return (
            <div
              key={stage.status}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                state === "completed" && "bg-success",
                state === "current" && "bg-primary ring-2 ring-primary/30",
                state === "upcoming" && "bg-muted"
              )}
              title={stage.label}
            />
          );
        })}
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Cycle de culture
          </h4>
          {canAdvance && onAdvanceStage && (
            <Button size="sm" variant="outline" onClick={onAdvanceStage}>
              Étape suivante
            </Button>
          )}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-5 left-4 right-4 h-1 bg-muted rounded-full" />
          
          {/* Progress bar fill */}
          <div 
            className="absolute top-5 left-4 h-1 bg-success rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (currentIndex / (stages.length - 1)) * 100)}%` }}
          />

          {/* Stage markers */}
          <div className="relative flex justify-between">
            {stages.map((stage, index) => {
              const state = getStageState(index);
              const estimatedDate = getEstimatedDate(index);
              
              return (
                <div key={stage.status} className="flex flex-col items-center" style={{ width: `${100 / stages.length}%` }}>
                  {/* Stage icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all z-10",
                      state === "completed" && "bg-success text-success-foreground",
                      state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      state === "upcoming" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>{stage.icon}</span>
                    )}
                  </div>
                  
                  {/* Stage label */}
                  <span 
                    className={cn(
                      "text-[10px] mt-2 font-medium text-center",
                      state === "current" && "text-primary",
                      state === "completed" && "text-success",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {stage.label}
                  </span>
                  
                  {/* Estimated date */}
                  {estimatedDate && state !== "completed" && (
                    <span className="text-[9px] text-muted-foreground">
                      {estimatedDate}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current stage details */}
        <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{stages[currentIndex]?.icon}</span>
            <div>
              <h5 className="font-medium text-foreground">
                {stages[currentIndex]?.label}
              </h5>
              <p className="text-sm text-muted-foreground">
                {stages[currentIndex]?.description}
              </p>
              {stages[currentIndex]?.duration && !isComplete && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Durée typique: {stages[currentIndex]?.duration}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Key dates */}
        <div className="flex gap-4 mt-4 text-sm">
          {sowingDate && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Semis:</span>
              <span className="font-medium">
                {new Date(sowingDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </div>
          )}
          {(actualHarvestDate || expectedHarvestDate) && (
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                actualHarvestDate ? "bg-success" : "bg-muted-foreground"
              )} />
              <span className="text-muted-foreground">
                {actualHarvestDate ? "Récolté:" : "Récolte prévue:"}
              </span>
              <span className="font-medium">
                {new Date(actualHarvestDate || expectedHarvestDate!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
