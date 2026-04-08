import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Wifi, ArrowRight, Check, TrendingUp, PawPrint, ShoppingBag, Star, Shield, Zap, ChevronRight, Users, BarChart3, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";
import planteraIcon from "@/assets/plantera-icon.png";

export default function Index() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const features = [
    { icon: MapPin, titleKey: "index.parcels", descKey: "index.parcelsDesc", gradient: "from-primary/15 to-primary/5", iconColor: "text-primary" },
    { icon: PawPrint, titleKey: "index.livestock", descKey: "index.livestockDesc", gradient: "from-accent/15 to-accent/5", iconColor: "text-accent" },
    { icon: Wifi, titleKey: "index.iot", descKey: "index.iotDesc", gradient: "from-primary/15 to-primary/5", iconColor: "text-primary" },
    { icon: ShoppingBag, titleKey: "index.sales", descKey: "index.salesDesc", gradient: "from-accent/15 to-accent/5", iconColor: "text-accent" },
  ];

  const benefits = [
    { text: t("index.benefit1"), icon: Zap },
    { text: t("index.benefit2"), icon: Shield },
    { text: t("index.benefit3"), icon: Star },
    { text: t("index.benefit4"), icon: TrendingUp },
  ];

  const stats = [
    { value: "5K+", label: t("index.statFarmers") || "Agriculteurs", icon: Users },
    { value: "98%", label: t("index.statSatisfaction") || "Satisfaction", icon: BarChart3 },
    { value: "24/7", label: t("index.statSupport") || "Support IA", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-5 pt-12 pb-10 safe-top overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-lg mx-auto">
          {/* Logo */}
          <div className={cn(
            "flex items-center justify-center mb-6 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-90"
          )}>
            <div className="w-[88px] h-[88px] rounded-[28px] gradient-hero flex items-center justify-center shadow-glow p-3">
              <img
                src={planteraIcon}
                alt="Plantéra Logo"
                width={56}
                height={56}
                className="drop-shadow-md"
            />
          </div>

          {/* Title & Subtitle */}
          <div className={cn(
            "text-center mb-6 transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2 tracking-tight leading-none">
              Plantéra
            </h1>
            <p className="text-base font-semibold text-primary mb-2">
              {t("index.tagline")}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              {t("index.subtitle")}
            </p>
          </div>

          {/* Stats row */}
          <div className={cn(
            "flex items-stretch justify-center gap-3 mb-8 transition-all duration-700 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-2xl bg-card border border-border/50 shadow-sm"
              >
                <stat.icon className="w-4 h-4 text-primary mb-0.5" />
                <span className="text-lg font-bold text-foreground leading-none">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className={cn(
            "space-y-3 transition-all duration-700 delay-300",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}>
            <Button
              size="lg"
              className="w-full h-14 gradient-hero text-primary-foreground font-semibold text-base shadow-glow hover:shadow-elevated transition-all duration-300 group rounded-2xl"
              onClick={() => navigate("/onboarding")}
            >
              {t("index.startFree")}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 font-medium rounded-2xl border-border/60"
              onClick={() => navigate("/auth")}
            >
              {t("index.haveAccount")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={cn(
        "px-5 pb-8 max-w-lg mx-auto transition-all duration-700 delay-[400ms]",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
          {t("index.whyPlantera")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <div
              key={feature.titleKey}
              className={cn(
                "group relative p-4 rounded-2xl border border-border/40 bg-card",
                "hover:border-primary/30 hover:shadow-soft transition-all duration-300",
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                "bg-gradient-to-br", feature.gradient
              )}>
                <feature.icon className={cn("w-5 h-5", feature.iconColor)} />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-0.5">{t(feature.titleKey)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className={cn(
        "px-5 py-8 max-w-lg mx-auto transition-all duration-700 delay-500",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        <div className="space-y-2">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/30 shadow-xs"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <benefit.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium flex-1">{benefit.text}</p>
              <Check className="w-4 h-4 text-primary shrink-0" />
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-5 py-6 max-w-lg mx-auto">
        <div className="relative rounded-3xl overflow-hidden gradient-hero p-6 shadow-glow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className="w-4 h-4 fill-primary-foreground/90 text-primary-foreground/90" />
              ))}
            </div>
            <blockquote className="text-base font-medium text-primary-foreground mb-3 leading-relaxed">
              "{t("index.testimonial")}"
            </blockquote>
            <p className="text-sm text-primary-foreground/70 font-medium">
              {t("index.testimonialAuthor")}
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-10 pb-12 safe-bottom max-w-lg mx-auto">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">{t("index.readyToStart")}</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[260px] mx-auto">{t("index.joinFarmers")}</p>
          <Button
            size="lg"
            className="gradient-hero text-primary-foreground font-semibold shadow-glow hover:shadow-elevated transition-all duration-300 group rounded-2xl px-8"
            onClick={() => navigate("/onboarding")}
          >
            {t("index.startNow")}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-300" />
          </Button>
        </div>
      </section>
    </div>
  );
}
