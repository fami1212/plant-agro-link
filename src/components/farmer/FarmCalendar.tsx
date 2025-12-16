import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Calendar as CalendarIcon,
  Check,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: "haute" | "moyenne" | "basse";
  status: "a_faire" | "en_cours" | "terminee";
  crop_id?: string;
  field_id?: string;
  created_at: string;
}

interface Crop {
  id: string;
  name: string;
  sowing_date?: string;
  expected_harvest_date?: string;
}

const priorityConfig = {
  haute: { label: "Haute", color: "bg-destructive text-destructive-foreground" },
  moyenne: { label: "Moyenne", color: "bg-warning text-warning-foreground" },
  basse: { label: "Basse", color: "bg-muted text-muted-foreground" },
};

const statusConfig = {
  a_faire: { label: "À faire", color: "text-foreground" },
  en_cours: { label: "En cours", color: "text-primary" },
  terminee: { label: "Terminée", color: "text-muted-foreground line-through" },
};

export function FarmCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
    priority: "moyenne" as "haute" | "moyenne" | "basse",
    crop_id: "",
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch crops for calendar events
      const { data: cropsData } = await supabase
        .from("crops")
        .select("id, name, sowing_date, expected_harvest_date")
        .eq("user_id", user.id);

      setCrops(cropsData || []);

      // For tasks, we'll use metadata on crops or a simple local state approach
      // Since we don't have a tasks table, we'll simulate with local storage
      const storedTasks = localStorage.getItem(`farm_tasks_${user.id}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = (updatedTasks: Task[]) => {
    if (user) {
      localStorage.setItem(`farm_tasks_${user.id}`, JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setSaving(true);
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description || undefined,
      due_date: newTask.due_date,
      priority: newTask.priority,
      status: "a_faire",
      crop_id: newTask.crop_id || undefined,
      created_at: new Date().toISOString(),
    };

    saveTasks([...tasks, task]);
    setNewTask({
      title: "",
      description: "",
      due_date: format(new Date(), "yyyy-MM-dd"),
      priority: "moyenne",
      crop_id: "",
    });
    setShowAddTask(false);
    setSaving(false);
    toast.success("Tâche ajoutée");
  };

  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map((t): Task => {
      if (t.id === taskId) {
        const newStatus: Task["status"] = t.status === "terminee" ? "a_faire" : "terminee";
        return { ...t, status: newStatus };
      }
      return t;
    });
    saveTasks(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    saveTasks(tasks.filter((t) => t.id !== taskId));
    toast.success("Tâche supprimée");
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dateTasks = tasks.filter((t) => t.due_date === dateStr);
    const sowingEvents = crops.filter((c) => c.sowing_date === dateStr);
    const harvestEvents = crops.filter((c) => c.expected_harvest_date === dateStr);
    return { tasks: dateTasks, sowingEvents, harvestEvents };
  };

  // Get days with events for calendar highlighting
  const getDaysWithEvents = () => {
    const days: Date[] = [];
    tasks.forEach((t) => days.push(new Date(t.due_date)));
    crops.forEach((c) => {
      if (c.sowing_date) days.push(new Date(c.sowing_date));
      if (c.expected_harvest_date) days.push(new Date(c.expected_harvest_date));
    });
    return days;
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const pendingTasks = tasks.filter((t) => t.status !== "terminee");
  const daysWithEvents = getDaysWithEvents();

  return (
    <div className="space-y-4">
      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            locale={fr}
            className="rounded-lg pointer-events-auto"
            modifiers={{
              hasEvent: daysWithEvents,
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: "bold",
                backgroundColor: "hsl(var(--primary) / 0.1)",
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {format(selectedDate, "EEEE d MMMM", { locale: fr })}
            </CardTitle>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Tâche
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle tâche</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Titre *</Label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Ex: Arroser les tomates"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priorité</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="haute">🔴 Haute</SelectItem>
                        <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                        <SelectItem value="basse">🟢 Basse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {crops.length > 0 && (
                    <div>
                      <Label>Culture associée</Label>
                      <Select
                        value={newTask.crop_id || "none"}
                        onValueChange={(v) => setNewTask({ ...newTask, crop_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optionnel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {crops.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Détails..."
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleAddTask} disabled={saving} className="w-full">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Sowing events */}
          {selectedDateEvents.sowingEvents.map((crop) => (
            <div key={`sow-${crop.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
              <span className="text-lg">🌱</span>
              <span className="text-sm font-medium">Semis: {crop.name}</span>
            </div>
          ))}

          {/* Harvest events */}
          {selectedDateEvents.harvestEvents.map((crop) => (
            <div key={`harvest-${crop.id}`} className="flex items-center gap-2 p-2 rounded-lg bg-accent/20">
              <span className="text-lg">🌾</span>
              <span className="text-sm font-medium">Récolte: {crop.name}</span>
            </div>
          ))}

          {/* Tasks */}
          {selectedDateEvents.tasks.length === 0 &&
            selectedDateEvents.sowingEvents.length === 0 &&
            selectedDateEvents.harvestEvents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun événement ce jour
              </p>
            )}

          {selectedDateEvents.tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all",
                task.status === "terminee" ? "bg-muted/50" : "bg-card"
              )}
            >
              <Checkbox
                checked={task.status === "terminee"}
                onCheckedChange={() => toggleTaskStatus(task.id)}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-sm", statusConfig[task.status].color)}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                )}
                <Badge variant="outline" className={cn("text-[10px] mt-1", priorityConfig[task.priority].color)}>
                  {priorityConfig[task.priority].label}
                </Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Tasks Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Tâches en attente ({pendingTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Toutes les tâches sont terminées ! 🎉
            </p>
          ) : (
            pendingTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={task.status === "terminee"}
                    onCheckedChange={() => toggleTaskStatus(task.id)}
                  />
                  <span className="text-sm">{task.title}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {format(new Date(task.due_date), "dd/MM")}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
