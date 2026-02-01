import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sprout,
  MapPin,
  Wifi,
  ArrowRight,
  Check,
  TrendingUp,
  Wheat,
  PawPrint,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: MapPin,
    title: "Parcelles",
    description: "Gérez vos terres et cultures",
    color: "text-primary bg-primary/10",
  },
  {
    icon: PawPrint,
    title: "Bétail",
    description: "Suivi santé du cheptel",
    color: "text-accent bg-accent/10",
  },
  {
    icon: Wifi,
    title: "IoT",
    description: "Capteurs en temps réel",
    color: "text-success bg-success/10",
  },
  {
    icon: ShoppingBag,
    title: "Ventes",
    description: "Marketplace intégré",
    color: "text-warning bg-warning/10",
  },
];

const benefits = [
  "Mode hors-ligne disponible",
  "Marketplace pour vendre vos produits",
  "IA pour optimiser vos cultures",
  "Support local en Wolof et Français",
];

export default function Index() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-5 pt-14 pb-12 safe-top">
        {/* Subtle background gradients */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative">
          {/* Logo */}
          <div className={cn(
            "flex items-center justify-center mb-10 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center shadow-glow">
              <Sprout className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <div className={cn(
            "text-center mb-10 transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
              Plantéra
            </h1>
            <p className="text-lg text-primary font-medium mb-3">
              Agriculture intelligente
            </p>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Gérez votre exploitation avec l'IoT et l'IA
            </p>
          </div>

          {/* CTA Buttons */}
          <div className={cn(
            "space-y-3 mb-10 transition-all duration-700 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <Button
              size="lg"
              className="w-full h-14 gradient-hero text-primary-foreground font-semibold text-base shadow-soft hover:shadow-glow transition-all group"
              onClick={() => navigate("/onboarding")}
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 font-medium"
              onClick={() => navigate("/auth")}
            >
              J'ai déjà un compte
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={cn(
        "px-5 pb-10 transition-all duration-700 delay-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-elevated transition-shadow"
            >
              <CardContent className="p-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", feature.color)}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className={cn(
        "px-5 py-10 bg-muted/40 transition-all duration-700 delay-400",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Pourquoi Plantéra ?</h2>
        </div>
        <div className="space-y-2.5">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-background/80 shadow-xs"
            >
              <div className="w-7 h-7 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-sm text-foreground font-medium">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-5 py-10">
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <blockquote className="text-base font-medium text-foreground mb-3">
              "J'ai augmenté mes rendements de 40% en une saison"
            </blockquote>
            <p className="text-sm text-muted-foreground">
              — Amadou D., Agriculteur à Thiès
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer CTA */}
      <section className="px-5 py-10 gradient-earth safe-bottom">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Prêt à commencer ?
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            Rejoignez des milliers d'agriculteurs
          </p>
          <Button
            size="lg"
            className="gradient-hero text-primary-foreground font-semibold shadow-soft hover:shadow-glow transition-all group"
            onClick={() => navigate("/onboarding")}
          >
            Démarrer maintenant
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>
    </div>
  );
}
