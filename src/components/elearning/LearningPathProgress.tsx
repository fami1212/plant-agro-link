import { Award, BookOpen, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";

interface LearningPathProgressProps {
  totalCourses: number;
  completedCourses: number;
  totalModules: number;
  completedModules: number;
}

export function LearningPathProgress({ totalCourses, completedCourses, totalModules, completedModules }: LearningPathProgressProps) {
  const { t } = useLanguage();
  const overallPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("elearning.myProgress")}</p>
          <p className="text-xs text-muted-foreground">{overallPct}% {t("elearning.completed")}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{completedCourses}</p>
          <p className="text-[10px] text-muted-foreground">/{totalCourses} {t("elearning.coursesCompleted")}</p>
        </div>
      </div>
      <Progress value={overallPct} className="h-2" />
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" />
          {completedModules}/{totalModules} {t("elearning.modulesCompleted")}
        </div>
        {overallPct >= 100 && (
          <div className="flex items-center gap-1 text-amber-600">
            <Award className="w-3.5 h-3.5" />
            {t("elearning.allComplete")}
          </div>
        )}
      </div>
    </div>
  );
}
