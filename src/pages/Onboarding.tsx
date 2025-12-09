import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sprout,
  MapPin,
  BarChart3,
  ShoppingBag,
  ChevronRight,
  Check,
} from "lucide-react";

const slides = [
  {
    icon: Sprout,
    title: "Gérez votre exploitation",
    description:
      "Suivez vos parcelles, cultures et bétail en un seul endroit. Simple, rapide, efficace.",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "Capteurs IoT connectés",
    description:
      "Recevez des données en temps réel sur l'humidité, la température et la santé de vos sols.",
    color: "secondary",
  },
  {
    icon: BarChart3,
    title: "IA & Prédictions",
    description:
      "Optimisez vos rendements grâce à l'intelligence artificielle et aux recommandations personnalisées.",
    color: "accent",
  },
  {
    icon: ShoppingBag,
    title: "Vendez vos produits",
    description:
      "Accédez à notre marketplace pour vendre directement aux acheteurs de votre région.",
    color: "success",
  },
];

const iconColors = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
};

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4 safe-top">
        <Button variant="ghost-muted" onClick={handleSkip}>
          Passer
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Icon */}
        <div
          className={cn(
            "w-24 h-24 rounded-3xl flex items-center justify-center mb-8 animate-scale-in",
            iconColors[slide.color as keyof typeof iconColors]
          )}
        >
          <slide.icon className="w-12 h-12" />
        </div>

        {/* Text */}
        <div className="text-center max-w-xs animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {slide.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom section */}
      <div className="px-6 pb-8 safe-bottom space-y-6">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          variant="hero"
          size="xl"
          className="w-full"
          onClick={handleNext}
        >
          {isLast ? (
            <>
              Commencer <Check className="w-5 h-5" />
            </>
          ) : (
            <>
              Continuer <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
