import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "./VideoPlayer";
import { QuizModule } from "./QuizModule";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, Play, BookOpen, CheckCircle2, Award, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

interface CourseDetailProps {
  course: any;
  progress: number;
  completedModuleIds: Set<string>;
  onBack: () => void;
  onProgressUpdate: () => void;
}

export function CourseDetail({ course, progress, completedModuleIds, onBack, onProgressUpdate }: CourseDetailProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [modules, setModules] = useState<any[]>([]);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      const { data } = await supabase
        .from("elearning_modules")
        .select("*")
        .eq("course_id", course.id)
        .order("order_index");
      setModules(data || []);
    };
    fetchModules();
  }, [course.id]);

  const openModule = async (mod: any) => {
    setActiveModule(mod);
    if (mod.content_type === "quiz") {
      const { data } = await supabase.from("elearning_quiz_questions").select("*").eq("module_id", mod.id);
      setQuizQuestions((data || []).map(q => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
    }
    if (user) {
      await supabase.from("elearning_progress").upsert({
        user_id: user.id,
        course_id: course.id,
        module_id: mod.id,
        completed: mod.content_type !== "quiz",
      }, { onConflict: "user_id,course_id,module_id" as any });
      onProgressUpdate();
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (user && activeModule) {
      await supabase.from("elearning_progress").upsert({
        user_id: user.id,
        course_id: course.id,
        module_id: activeModule.id,
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id,module_id" as any });
      toast.success(`${t("elearning.quizComplete")} - ${score}%`);
      onProgressUpdate();
    }
  };

  const totalDuration = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
  const completedCount = modules.filter(m => completedModuleIds.has(m.id)).length;

  // Active module view
  if (activeModule) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setActiveModule(null)}>
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </Button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold">{activeModule.title}</h2>
          <p className="text-xs text-muted-foreground capitalize">{activeModule.content_type} · {activeModule.duration_minutes}min</p>
        </div>

        {activeModule.content_type === "video" && activeModule.video_url && (
          <VideoPlayer videoUrl={activeModule.video_url} title={activeModule.title} />
        )}

        {activeModule.content_type === "texte" && activeModule.text_content && (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-card rounded-2xl p-4 border border-border/30"
            dangerouslySetInnerHTML={{ __html: activeModule.text_content }} />
        )}

        {activeModule.content_type === "quiz" && quizQuestions.length > 0 && (
          <QuizModule questions={quizQuestions} onComplete={handleQuizComplete} />
        )}

        {/* Next module button */}
        {activeModule.content_type !== "quiz" && (() => {
          const currentIdx = modules.findIndex(m => m.id === activeModule.id);
          const nextMod = modules[currentIdx + 1];
          return nextMod ? (
            <Button className="w-full rounded-xl gap-2" onClick={() => openModule(nextMod)}>
              <Play className="w-4 h-4" /> {t("elearning.nextModule")}: {nextMod.title}
            </Button>
          ) : null;
        })()}
      </div>
    );
  }

  // Course overview
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" /> {t("common.back")}
      </Button>

      {/* Course header */}
      {course.thumbnail_url && (
        <div className="relative h-40 rounded-2xl overflow-hidden">
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-white font-bold text-lg">{course.title}</h2>
          </div>
        </div>
      )}

      {/* Course meta */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 text-xs">
          <BookOpen className="w-3 h-3" /> {modules.length} {t("elearning.modules")}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs">
          <Clock className="w-3 h-3" /> {totalDuration}min
        </Badge>
        {course.instructor_name && (
          <Badge variant="secondary" className="text-xs">{course.instructor_name}</Badge>
        )}
      </div>

      {course.description && (
        <p className="text-sm text-muted-foreground">{course.description}</p>
      )}

      {/* Progress */}
      <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("elearning.courseProgress")}</span>
          <span className="text-sm font-bold text-primary">{completedCount}/{modules.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
        {progress >= 100 && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Award className="w-4 h-4" />
            {t("elearning.courseComplete")}
          </div>
        )}
      </div>

      {/* Module list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("elearning.modules")}</h3>
        {modules.map((mod, i) => {
          const isCompleted = completedModuleIds.has(mod.id);
          const icon = mod.content_type === "quiz" ? FileText : mod.content_type === "video" ? Play : BookOpen;
          const Icon = icon;
          return (
            <button key={mod.id} onClick={() => openModule(mod)}
              className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border/30 text-left hover:bg-muted/30 transition-all">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}>
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{mod.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{mod.content_type} · {mod.duration_minutes}min</p>
              </div>
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
