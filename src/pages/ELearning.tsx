import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CourseCard } from "@/components/elearning/CourseCard";
import { QuizModule } from "@/components/elearning/QuizModule";
import { LearningPathProgress } from "@/components/elearning/LearningPathProgress";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { EmptyState } from "@/components/common/EmptyState";
import { ArrowLeft, Play, BookOpen, CheckCircle2, Award } from "lucide-react";
import { toast } from "sonner";

export default function ELearning() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<string>>(new Set());
  const [totalModulesCount, setTotalModulesCount] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [activeModule, setActiveModule] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchCourses = async () => {
    const { data } = await supabase.from("elearning_courses").select("*").order("created_at", { ascending: false });
    setCourses(data || []);
  };

  const fetchProgress = async () => {
    if (!user) return;
    const { data } = await supabase.from("elearning_progress").select("course_id, module_id, completed").eq("user_id", user.id);
    if (data) {
      const map: Record<string, { total: number; done: number }> = {};
      const completedIds = new Set<string>();
      data.forEach(p => {
        if (!map[p.course_id]) map[p.course_id] = { total: 0, done: 0 };
        map[p.course_id].total++;
        if (p.completed) {
          map[p.course_id].done++;
          if (p.module_id) completedIds.add(p.module_id);
        }
      });
      const pctMap: Record<string, number> = {};
      Object.entries(map).forEach(([id, v]) => { pctMap[id] = Math.round((v.done / Math.max(v.total, 1)) * 100); });
      setProgress(pctMap);
      setCompletedModuleIds(completedIds);
    }
  };

  const fetchTotalModules = async () => {
    const { count } = await supabase.from("elearning_modules").select("*", { count: "exact", head: true });
    setTotalModulesCount(count || 0);
  };

  useEffect(() => { fetchCourses(); fetchProgress(); fetchTotalModules(); }, [user]);

  const openCourse = async (course: any) => {
    setSelectedCourse(course);
    const { data } = await supabase.from("elearning_modules").select("*").eq("course_id", course.id).order("order_index");
    setModules(data || []);
    setActiveModule(null);
    setQuizQuestions([]);
  };

  const openModule = async (mod: any) => {
    setActiveModule(mod);
    if (mod.content_type === "quiz") {
      const { data } = await supabase.from("elearning_quiz_questions").select("*").eq("module_id", mod.id);
      setQuizQuestions((data || []).map(q => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
    }
    if (user) {
      await supabase.from("elearning_progress").upsert({
        user_id: user.id,
        course_id: selectedCourse.id,
        module_id: mod.id,
        completed: mod.content_type !== "quiz",
      }, { onConflict: "user_id,course_id,module_id" as any });
      fetchProgress();
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (user && activeModule) {
      await supabase.from("elearning_progress").upsert({
        user_id: user.id,
        course_id: selectedCourse.id,
        module_id: activeModule.id,
        completed: true,
        score,
        completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,course_id,module_id" as any });
      toast.success(`${t("elearning.quizComplete")} - ${score}%`);
      fetchProgress();
    }
  };

  const categories = ["all", "culture", "elevage", "business", "tech"];
  const filtered = categoryFilter === "all" ? courses : courses.filter(c => c.category === categoryFilter);

  const completedCourses = Object.values(progress).filter(p => p >= 100).length;

  // Module detail view
  if (selectedCourse && activeModule) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <PageHeader title={activeModule.title} subtitle={selectedCourse.title} />
          <div className="px-4 pb-24">
            <Button variant="ghost" size="sm" className="mb-3 gap-1" onClick={() => setActiveModule(null)}>
              <ArrowLeft className="w-4 h-4" /> {t("common.back")}
            </Button>
            {activeModule.content_type === "video" && activeModule.video_url && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-4 bg-black">
                <iframe src={activeModule.video_url.replace("watch?v=", "embed/")} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            )}
            {activeModule.content_type === "texte" && activeModule.text_content && (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-card rounded-2xl p-4 border border-border/30"
                dangerouslySetInnerHTML={{ __html: activeModule.text_content }} />
            )}
            {activeModule.content_type === "quiz" && quizQuestions.length > 0 && (
              <QuizModule questions={quizQuestions} onComplete={handleQuizComplete} />
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Course detail view
  if (selectedCourse) {
    const courseProgress = progress[selectedCourse.id] || 0;
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <PageHeader title={selectedCourse.title} subtitle={selectedCourse.instructor_name || ""} />
          <div className="px-4 pb-24 space-y-4">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setSelectedCourse(null)}>
              <ArrowLeft className="w-4 h-4" /> {t("common.back")}
            </Button>
            {selectedCourse.description && (
              <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
            )}

            {/* Course progress */}
            <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("elearning.courseProgress")}</span>
                <span className="text-sm font-bold text-primary">{courseProgress}%</span>
              </div>
              <Progress value={courseProgress} className="h-2" />
              {courseProgress >= 100 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Award className="w-4 h-4" />
                  {t("elearning.courseComplete")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("elearning.modules")}</h3>
              {modules.map((mod, i) => {
                const isCompleted = completedModuleIds.has(mod.id);
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
                    {mod.content_type === "quiz" ? <BookOpen className="w-4 h-4 text-muted-foreground" /> : <Play className="w-4 h-4 text-muted-foreground" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHeader title={t("elearning.title")} subtitle={t("elearning.subtitle")} />
        <div className="px-4 pb-24 space-y-4">
          {/* Learning path progress */}
          <LearningPathProgress
            totalCourses={courses.length}
            completedCourses={completedCourses}
            totalModules={totalModulesCount}
            completedModules={completedModuleIds.size}
          />

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <Button key={cat} size="sm" variant={categoryFilter === cat ? "default" : "outline"} className="rounded-full text-xs shrink-0"
                onClick={() => setCategoryFilter(cat)}>
                {cat === "all" ? t("common.all") : t(`elearning.category.${cat}`)}
              </Button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <EmptyState title={t("elearning.noCourses")} description={t("elearning.noCoursesDesc")} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(c => (
                <CourseCard key={c.id} course={c} progress={progress[c.id] || 0} onClick={() => openCourse(c)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
