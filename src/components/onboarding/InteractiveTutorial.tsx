import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, MapPin, Wheat, PawPrint, ShoppingBag, Bot, BarChart3, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface TutorialStep {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  targetSelector?: string;
  position: "center" | "top" | "bottom";
}

interface InteractiveTutorialProps {
  onComplete: () => void;
}

export function InteractiveTutorial({ onComplete }: InteractiveTutorialProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const steps: TutorialStep[] = [
    {
      icon: <Sparkles className="w-8 h-8 text-primary" />,
      titleKey: "tutorial.welcome.title",
      descKey: "tutorial.welcome.desc",
      position: "center",
    },
    {
      icon: <MapPin className="w-8 h-8 text-primary" />,
      titleKey: "tutorial.parcels.title",
      descKey: "tutorial.parcels.desc",
      position: "center",
    },
    {
      icon: <Wheat className="w-8 h-8 text-accent" />,
      titleKey: "tutorial.crops.title",
      descKey: "tutorial.crops.desc",
      position: "center",
    },
    {
      icon: <PawPrint className="w-8 h-8 text-secondary" />,
      titleKey: "tutorial.livestock.title",
      descKey: "tutorial.livestock.desc",
      position: "center",
    },
    {
      icon: <ShoppingBag className="w-8 h-8 text-accent" />,
      titleKey: "tutorial.marketplace.title",
      descKey: "tutorial.marketplace.desc",
      position: "center",
    },
    {
      icon: <Bot className="w-8 h-8 text-primary" />,
      titleKey: "tutorial.ai.title",
      descKey: "tutorial.ai.desc",
      position: "center",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-success" />,
      titleKey: "tutorial.ready.title",
      descKey: "tutorial.ready.desc",
      position: "center",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleComplete = () => {
    setVisible(false);
    localStorage.setItem("plantera-tutorial-completed", "true");
    onComplete();
  };

  if (!visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleComplete} />
      
      {/* Tutorial Card */}
      <Card className="relative z-10 mx-4 max-w-sm w-full shadow-2xl border-primary/20 animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 h-8 w-8"
          onClick={handleComplete}
        >
          <X className="w-4 h-4" />
        </Button>

        <CardContent className="p-6 pt-8">
          {/* Step indicator */}
          <div className="flex justify-center mb-1">
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} / {steps.length}
            </Badge>
          </div>

          {/* Icon */}
          <div className="flex justify-center my-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-foreground mb-2">
              {t(step.titleKey)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(step.descKey)}
            </p>
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  i === currentStep ? "w-6 bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" className="flex-1" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t("tutorial.prev")}
              </Button>
            )}
            <Button 
              variant="hero" 
              className={cn("flex-1", currentStep === 0 && "w-full")} 
              onClick={handleNext}
            >
              {isLast ? t("tutorial.start") : t("tutorial.next")}
              {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>

          {/* Skip */}
          {!isLast && (
            <Button variant="ghost" size="sm" className="w-full mt-2 text-muted-foreground" onClick={handleComplete}>
              {t("tutorial.skip")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
