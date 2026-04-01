import { Clock, BookOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/i18n/LanguageContext";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    difficulty: string;
    duration_minutes: number;
    thumbnail_url?: string | null;
    instructor_name?: string | null;
  };
  progress?: number;
  onClick?: () => void;
}

const difficultyColors: Record<string, string> = {
  debutant: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  intermediaire: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  avance: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export function CourseCard({ course, progress = 0, onClick }: CourseCardProps) {
  const { t } = useLanguage();

  return (
    <button onClick={onClick} className="bg-card rounded-2xl border border-border/30 overflow-hidden text-left w-full transition-all hover:shadow-soft active:scale-[0.98]">
      <div className="relative h-32 bg-muted flex items-center justify-center">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${difficultyColors[course.difficulty] || difficultyColors.debutant}`}>
            {t(`elearning.difficulty.${course.difficulty}`)}
          </span>
          <div className="flex items-center gap-1 text-white text-[10px]">
            <Clock className="w-3 h-3" /> {course.duration_minutes}min
          </div>
        </div>
        {progress === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2">
        <Badge variant="outline" className="text-[10px]">{t(`elearning.category.${course.category}`)}</Badge>
        <p className="font-semibold text-sm line-clamp-2">{course.title}</p>
        {course.instructor_name && <p className="text-xs text-muted-foreground">{course.instructor_name}</p>}
        {progress > 0 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{progress}% {t("elearning.completed")}</p>
          </div>
        )}
      </div>
    </button>
  );
}
