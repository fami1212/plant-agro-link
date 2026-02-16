import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Clock,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SmartTaskSuggestions } from "@/components/farmer/SmartTaskSuggestions";

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  category?: string;
  ai_generated?: boolean;
}

const priorityConfig = {
  high: { label: "Haute", color: "bg-destructive/20 text-destructive" },
  medium: { label: "Moyenne", color: "bg-warning/20 text-warning" },
  low: { label: "Basse", color: "bg-muted text-muted-foreground" },
};

export function FarmCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("farm_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setTasks((data || []).map(t => ({
        ...t,
        priority: t.priority as Task["priority"],
        status: t.status as Task["status"],
        ai_generated: t.category === "ai_generated",
      })));
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("farm_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "farm_tasks", filter: `user_id=eq.${user.id}` }, () => {
        fetchTasks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchTasks]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !user) {
      toast.error("Titre requis");
      return;
    }

    try {
      const { error } = await supabase.from("farm_tasks").insert({
        user_id: user.id,
        title: newTaskTitle,
        due_date: format(selectedDate, "yyyy-MM-dd"),
        priority: newTaskPriority,
        status: "todo",
      });
      if (error) throw error;
      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setShowAddTask(false);
      toast.success("Tâche ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleAddAITask = async (task: { title: string; description: string; dueDate: string; priority: string }) => {
    if (!user) return;
    const priorityMap: Record<string, string> = { haute: "high", moyenne: "medium", basse: "low" };
    await supabase.from("farm_tasks").insert({
      user_id: user.id,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      priority: priorityMap[task.priority] || "medium",
      status: "todo",
      category: "ai_generated",
    });
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    await supabase.from("farm_tasks").update({ status: newStatus }).eq("id", taskId);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("farm_tasks").delete().eq("id", taskId);
    toast.success("Supprimée");
  };

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const tasksForDate = tasks.filter((t) => t.due_date === selectedDateStr);
  const pendingTasks = tasks.filter((t) => t.status !== "done");
  const daysWithTasks = tasks.map((t) => new Date(t.due_date));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={fr}
            className="rounded-lg pointer-events-auto"
            modifiers={{ hasEvent: daysWithTasks }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary) / 0.1)",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {format(selectedDate, "EEEE d MMM", { locale: fr })}
            </h3>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Nouvelle tâche</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Arroser les tomates"
                    autoFocus
                  />
                  <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">🔴 Haute</SelectItem>
                      <SelectItem value="medium">🟡 Moyenne</SelectItem>
                      <SelectItem value="low">🟢 Basse</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddTask} className="w-full">
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {tasksForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune tâche ce jour
            </p>
          ) : (
            <div className="space-y-2">
              {tasksForDate.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border",
                    task.status === "done" && "opacity-50"
                  )}
                >
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className={cn(
                      "text-sm",
                      task.status === "done" && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                    {task.ai_generated && <Sparkles className="w-3 h-3 text-primary" />}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", priorityConfig[task.priority]?.color)}>
                    {priorityConfig[task.priority]?.label || task.priority}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingTasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">À faire ({pendingTasks.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <span className="text-sm">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {format(new Date(task.due_date), "dd/MM")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SmartTaskSuggestions onAddTask={handleAddAITask} />
    </div>
  );
}
