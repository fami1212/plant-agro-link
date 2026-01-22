import { useState, useEffect } from "react";
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
  Check,
  Clock,
  Trash2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SmartTaskSuggestions } from "@/components/farmer/SmartTaskSuggestions";

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: "haute" | "moyenne" | "basse";
  status: "a_faire" | "terminee";
  ai_generated?: boolean;
}

const priorityConfig = {
  haute: { label: "Haute", color: "bg-destructive/20 text-destructive" },
  moyenne: { label: "Moyenne", color: "bg-warning/20 text-warning" },
  basse: { label: "Basse", color: "bg-muted text-muted-foreground" },
};

export function FarmCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"haute" | "moyenne" | "basse">("moyenne");

  useEffect(() => {
    if (user) {
      const storedTasks = localStorage.getItem(`farm_tasks_${user.id}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    }
  }, [user]);

  const saveTasks = (updatedTasks: Task[]) => {
    if (user) {
      localStorage.setItem(`farm_tasks_${user.id}`, JSON.stringify(updatedTasks));
      setTasks(updatedTasks);
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast.error("Titre requis");
      return;
    }

    const task: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle,
      due_date: format(selectedDate, "yyyy-MM-dd"),
      priority: newTaskPriority,
      status: "a_faire",
    };

    saveTasks([...tasks, task]);
    setNewTaskTitle("");
    setNewTaskPriority("moyenne");
    setShowAddTask(false);
    toast.success("Tâche ajoutée");
  };

  const handleAddAITask = (task: { title: string; description: string; dueDate: string; priority: string }) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: task.title,
      due_date: task.dueDate,
      priority: (task.priority as "haute" | "moyenne" | "basse") || "moyenne",
      status: "a_faire",
      ai_generated: true,
    };
    saveTasks([...tasks, newTask]);
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map((t): Task => 
      t.id === taskId 
        ? { ...t, status: t.status === "terminee" ? "a_faire" : "terminee" }
        : t
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (taskId: string) => {
    saveTasks(tasks.filter((t) => t.id !== taskId));
    toast.success("Supprimée");
  };

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const tasksForDate = tasks.filter((t) => t.due_date === selectedDateStr);
  const pendingTasks = tasks.filter((t) => t.status !== "terminee");
  const daysWithTasks = tasks.map((t) => new Date(t.due_date));

  return (
    <div className="space-y-4">
      {/* Calendar */}
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

      {/* Selected Date Tasks */}
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
                      <SelectItem value="haute">🔴 Haute</SelectItem>
                      <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                      <SelectItem value="basse">🟢 Basse</SelectItem>
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
                    task.status === "terminee" && "opacity-50"
                  )}
                >
                  <Checkbox
                    checked={task.status === "terminee"}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <span className={cn(
                      "text-sm",
                      task.status === "terminee" && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </span>
                    {task.ai_generated && <Sparkles className="w-3 h-3 text-primary" />}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", priorityConfig[task.priority].color)}>
                    {priorityConfig[task.priority].label}
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

      {/* Pending Tasks */}
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

      {/* AI Task Suggestions */}
      <SmartTaskSuggestions onAddTask={handleAddAITask} />
    </div>
  );
}
