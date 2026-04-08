import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Leaf, MapPin, BarChart3, ShoppingBag, ChevronRight, Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import planteraIcon from "@/assets/plantera-icon.png";

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const slides = [
    { icon: Sprout, titleKey: "onboarding.slide1.title", descKey: "onboarding.slide1.desc", color: "primary" },
    { icon: MapPin, titleKey: "onboarding.slide2.title", descKey: "onboarding.slide2.desc", color: "secondary" },
    { icon: BarChart3, titleKey: "onboarding.slide3.title", descKey: "onboarding.slide3.desc", color: "accent" },
    { icon: ShoppingBag, titleKey: "onboarding.slide4.title", descKey: "onboarding.slide4.desc", color: "success" },
  ];

  const iconColors = {
    primary: "bg-primary/15 text-primary",
    secondary: "bg-secondary/15 text-secondary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
    else navigate("/auth");
  };

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex justify-end p-4 safe-top">
        <Button variant="ghost-muted" onClick={() => navigate("/auth")}>{t("onboarding.skip")}</Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mb-8 animate-scale-in", iconColors[slide.color as keyof typeof iconColors])}>
          <slide.icon className="w-12 h-12" />
        </div>
        <div className="text-center max-w-xs animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-3">{t(slide.titleKey)}</h1>
          <p className="text-muted-foreground leading-relaxed">{t(slide.descKey)}</p>
        </div>
      </div>
      <div className="px-6 pb-8 safe-bottom space-y-6">
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button key={index} onClick={() => setCurrentSlide(index)} className={cn("w-2 h-2 rounded-full transition-all duration-300", index === currentSlide ? "w-8 bg-primary" : "bg-muted-foreground/30 hover:bg-muted-foreground/50")} />
          ))}
        </div>
        <Button variant="hero" size="xl" className="w-full" onClick={handleNext}>
          {isLast ? (<>{t("onboarding.start")} <Check className="w-5 h-5" /></>) : (<>{t("onboarding.continue")} <ChevronRight className="w-5 h-5" /></>)}
        </Button>
      </div>
    </div>
  );
}