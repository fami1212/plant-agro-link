import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string | null;
}

interface QuizModuleProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}

export function QuizModule({ questions, onComplete }: QuizModuleProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIndex];
  if (!current && !finished) return null;

  const handleAnswer = (option: string) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === current.correct_answer) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = Math.round(((score + (selected === current.correct_answer ? 0 : 0)) / questions.length) * 100);
      setFinished(true);
      onComplete?.(finalScore);
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold">{t("elearning.quizComplete")}</h3>
          <p className="text-3xl font-bold text-primary">{pct}%</p>
          <p className="text-sm text-muted-foreground">{score}/{questions.length} {t("elearning.correctAnswers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-soft">
      <CardHeader className="pb-2">
        <p className="text-xs text-muted-foreground">{t("elearning.question")} {currentIndex + 1}/{questions.length}</p>
        <CardTitle className="text-sm">{current.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(current.options as string[]).map((option, i) => {
          const isCorrect = option === current.correct_answer;
          const isSelected = option === selected;
          return (
            <button
              key={i}
              onClick={() => handleAnswer(option)}
              className={cn(
                "w-full text-left p-3 rounded-xl border text-sm transition-all",
                !answered && "hover:bg-muted/50 border-border/30",
                answered && isCorrect && "bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20",
                answered && isSelected && !isCorrect && "bg-red-50 border-red-300 dark:bg-red-900/20",
                answered && !isCorrect && !isSelected && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2">
                {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                {option}
              </div>
            </button>
          );
        })}
        {answered && current.explanation && (
          <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl mt-2">{current.explanation}</p>
        )}
        {answered && (
          <Button className="w-full rounded-xl mt-2" onClick={handleNext}>
            {currentIndex + 1 >= questions.length ? t("elearning.finish") : t("elearning.next")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
