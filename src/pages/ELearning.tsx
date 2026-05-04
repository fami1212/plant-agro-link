import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { CourseCard } from "@/components/elearning/CourseCard";
import { CourseDetail } from "@/components/elearning/CourseDetail";
import { LearningPathProgress } from "@/components/elearning/LearningPathProgress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { EmptyState } from "@/components/common/EmptyState";

export default function ELearning() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [courses, setCourses] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<string>>(new Set());
  const [totalModulesCount, setTotalModulesCount] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
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

  const categories = ["all", "culture", "elevage", "business", "tech"];
  const filtered = categoryFilter === "all" ? courses : courses.filter(c => c.category === categoryFilter);
  const completedCourses = Object.values(progress).filter(p => p >= 100).length;

  if (selectedCourse) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-background">
          <PageHeader showLogo title={selectedCourse.title} subtitle={selectedCourse.instructor_name || ""} />
          <div className="px-4 pb-24">
            <CourseDetail
              course={selectedCourse}
              progress={progress[selectedCourse.id] || 0}
              completedModuleIds={completedModuleIds}
              onBack={() => setSelectedCourse(null)}
              onProgressUpdate={fetchProgress}
            />
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
                <CourseCard key={c.id} course={c} progress={progress[c.id] || 0} onClick={() => setSelectedCourse(c)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
