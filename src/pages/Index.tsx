import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  MapPin,
  BarChart3,
  Wifi,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: MapPin,
    title: "Gestion des parcelles",
    description: "Suivez vos terres, cultures et récoltes en temps réel",
  },
  {
    icon: Wifi,
    title: "Capteurs IoT",
    description: "Données en direct sur l'humidité, température et pH du sol",
  },
  {
    icon: BarChart3,
    title: "IA & Prédictions",
    description: "Optimisez vos rendements avec l'intelligence artificielle",
  },
  {
    icon: Shield,
    title: "Traçabilité",
    description: "Prouvez l'origine et la qualité de vos produits",
  },
];

const stats = [
  { value: "5000+", label: "Agriculteurs" },
  { value: "12K", label: "Hectares gérés" },
  { value: "98%", label: "Satisfaction" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 safe-top">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center shadow-glow animate-scale-in">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Plantéra
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
              L'agriculture intelligente
            </p>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
              Gérez votre exploitation agricole avec la puissance de l'IoT et de l'IA
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-6 mb-10 animate-fade-in stagger-2" style={{ opacity: 0 }}>
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3 mb-12 animate-slide-up stagger-3" style={{ opacity: 0 }}>
            <Button
              variant="hero"
              size="xl"
              className="w-full"
              onClick={() => navigate("/onboarding")}
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              J'ai déjà un compte
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-12 bg-muted/30">
        <h2 className="text-lg font-bold text-foreground mb-6 text-center">
          Tout ce dont vous avez besoin
        </h2>
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-soft animate-fade-in",
                `stagger-${index + 1}`
              )}
              style={{ opacity: 0 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <feature.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-12">
        <h2 className="text-lg font-bold text-foreground mb-6 text-center">
          Pourquoi Plantéra ?
        </h2>
        <div className="space-y-3">
          {[
            "Fonctionne même hors connexion",
            "Accessible via SMS et USSD",
            "Marketplace intégré pour vendre vos produits",
            "Support en Wolof, Français et Anglais",
            "Équipe de support locale au Sénégal",
          ].map((benefit, index) => (
            <div
              key={benefit}
              className={cn(
                "flex items-center gap-3 p-3 animate-fade-in",
                `stagger-${index + 1}`
              )}
              style={{ opacity: 0 }}
            >
              <div className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-foreground">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-4 py-8 gradient-earth safe-bottom">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Rejoignez des milliers d'agriculteurs
          </p>
          <Button
            variant="hero"
            size="lg"
            onClick={() => navigate("/onboarding")}
          >
            Démarrer maintenant
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
