import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Sparkles,
  Droplets,
  Bug,
  Wheat,
  Heart,
  Wrench,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface SuggestedTask {
  id: string;
  title: string;
  description: string;
  priority: "haute" | "moyenne" | "basse";
  category: "irrigation" | "traitement" | "recolte" | "semis" | "betail" | "entretien";
  dueDate: string;
  relatedTo: string;
  weatherDependent: boolean;
  estimatedDuration: string;
}

interface Reminder {
  type: string;
  message: string;
  daysUntil: number;
}

interface PlannerData {
  suggestedTasks: SuggestedTask[];
  weeklyPlan?: {
    summary: string;
    criticalDays: string[];
    bestDaysForFieldWork: string[];
  };
  reminders: Reminder[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  irrigation: <Droplets className="w-4 h-4" />,
  traitement: <Bug className="w-4 h-4" />,
  recolte: <Wheat className="w-4 h-4" />,
  semis: <Wheat className="w-4 h-4" />,
  betail: <Heart className="w-4 h-4" />,
  entretien: <Wrench className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  irrigation: "bg-blue-500/10 text-blue-500",
  traitement: "bg-orange-500/10 text-orange-500",
  recolte: "bg-success/10 text-success",
  semis: "bg-primary/10 text-primary",
  betail: "bg-pink-500/10 text-pink-500",
  entretien: "bg-muted text-muted-foreground",
};

const priorityColors: Record<string, string> = {
  haute: "bg-destructive text-destructive-foreground",
  moyenne: "bg-warning text-warning-foreground",
  basse: "bg-muted text-muted-foreground",
};

interface SmartTaskSuggestionsProps {
  onAddTask?: (task: { title: string; description: string; dueDate: string; priority: string }) => void;
}

export function SmartTaskSuggestions({ onAddTask }: SmartTaskSuggestionsProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch user's data
      const [cropsRes, livestockRes] = await Promise.all([
        supabase.from("crops").select("*").eq("user_id", user.id),
        supabase.from("livestock").select("*").eq("user_id", user.id),
      ]);

      // Get existing tasks from localStorage
      const storedTasks = localStorage.getItem(`farm_tasks_${user.id}`);
      const existingTasks = storedTasks ? JSON.parse(storedTasks) : [];

      // Fetch weather forecast
      let weatherForecast = null;
      try {
        const weatherRes = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=14.69&longitude=-17.44&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Africa%2FDakar&forecast_days=7"
        );
        if (weatherRes.ok) {
          weatherForecast = await weatherRes.json();
        }
      } catch (e) {
        console.log("Weather fetch failed");
      }

      const { data: result, error } = await supabase.functions.invoke("smart-planner", {
        body: {
          crops: cropsRes.data || [],
          livestock: livestockRes.data || [],
          existingTasks,
          weatherForecast,
        },
      });

      if (error) throw error;

      if (result.success) {
        setData({
          suggestedTasks: result.suggestedTasks || [],
          weeklyPlan: result.weeklyPlan,
          reminders: result.reminders || [],
        });
        toast.success("Suggestions générées par l'IA");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Impossible de générer les suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = (task: SuggestedTask) => {
    if (onAddTask) {
      onAddTask({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
      });
      setAddedTasks(prev => new Set([...prev, task.id]));
      toast.success(`Tâche "${task.title}" ajoutée`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-accent/10 via-primary/5 to-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Planificateur intelligent</h3>
                <p className="text-xs text-muted-foreground">Suggestions basées sur vos cultures</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSuggestions}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Générer
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {!data && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Obtenez des suggestions de tâches personnalisées basées sur vos cultures, votre bétail et la météo
            </p>
            <Button onClick={fetchSuggestions}>
              <Sparkles className="w-4 h-4 mr-2" />
              Générer des suggestions
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Analyse IA en cours...</span>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          {/* Weekly Summary */}
          {data.weeklyPlan && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-1">Résumé de la semaine</p>
                <p className="text-sm text-muted-foreground">{data.weeklyPlan.summary}</p>
                {data.weeklyPlan.bestDaysForFieldWork && data.weeklyPlan.bestDaysForFieldWork.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Meilleurs jours:</span>
                    {data.weeklyPlan.bestDaysForFieldWork.slice(0, 3).map((day, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {format(new Date(day), "EEE d", { locale: fr })}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reminders */}
          {data.reminders && data.reminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  Rappels à venir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.reminders.slice(0, 3).map((reminder, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-warning/10">
                    <Badge variant="outline" className="text-xs">
                      J-{reminder.daysUntil}
                    </Badge>
                    <p className="text-sm">{reminder.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggested Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tâches suggérées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.suggestedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune suggestion pour le moment
                </p>
              ) : (
                data.suggestedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      addedTasks.has(task.id) ? "bg-success/5 border-success/30" : "bg-card"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                        categoryColors[task.category]
                      )}>
                        {categoryIcons[task.category] || <Wrench className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{task.title}</p>
                          <Badge className={cn("text-[10px]", priorityColors[task.priority])}>
                            {task.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.dueDate), "d MMM", { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedDuration}
                          </span>
                          {task.relatedTo && (
                            <span>{task.relatedTo}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={addedTasks.has(task.id) ? "secondary" : "default"}
                        onClick={() => handleAddTask(task)}
                        disabled={addedTasks.has(task.id)}
                        className="shrink-0"
                      >
                        {addedTasks.has(task.id) ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
