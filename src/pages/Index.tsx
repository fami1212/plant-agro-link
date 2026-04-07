import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sprout, MapPin, Wifi, ArrowRight, Check, TrendingUp, PawPrint, ShoppingBag, Star, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Index() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const features = [
    { icon: MapPin, titleKey: "index.parcels", descKey: "index.parcelsDesc", gradient: "from-emerald-500/10 to-teal-500/10", iconColor: "text-primary" },
    { icon: PawPrint, titleKey: "index.livestock", descKey: "index.livestockDesc", gradient: "from-orange-500/10 to-amber-500/10", iconColor: "text-accent" },
    { icon: Wifi, titleKey: "index.iot", descKey: "index.iotDesc", gradient: "from-blue-500/10 to-cyan-500/10", iconColor: "text-primary" },
    { icon: ShoppingBag, titleKey: "index.sales", descKey: "index.salesDesc", gradient: "from-purple-500/10 to-pink-500/10", iconColor: "text-accent" },
  ];

  const benefits = [
    { text: t("index.benefit1"), icon: Zap },
    { text: t("index.benefit2"), icon: Shield },
    { text: t("index.benefit3"), icon: Star },
    { text: t("index.benefit4"), icon: TrendingUp },
  ];

  const stats = [
    { value: "5K+", label: t("index.statFarmers") || "Agriculteurs" },
    { value: "98%", label: t("index.statSatisfaction") || "Satisfaction" },
    { value: "24/7", label: t("index.statSupport") || "Support IA" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-5 pt-16 pb-14 safe-top">
        {/* Animated background orbs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/6 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/4 animate-pulse-soft" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/6 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 animate-pulse-soft" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-primary/4 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2" />

        <div className="relative">
          {/* Logo */}
          <div className={cn(
            "flex items-center justify-center mb-8 transition-all duration-700",
            mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-90"
          )}>
            <div className="relative">
              <div className="w-[88px] h-[88px] rounded-[28px] gradient-hero flex items-center justify-center shadow-glow">
                <Sprout className="w-11 h-11 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center shadow-soft">
                <Check className="w-3.5 h-3.5 text-success-foreground" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className={cn(
            "text-center mb-8 transition-all duration-700 delay-100",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            <h1 className="text-[42px] font-bold text-foreground mb-1 tracking-tight leading-none">
              Plantéra
            </h1>
            <p className="text-base font-semibold text-gradient mb-3">
              {t("index.tagline")}
            </p>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
              {t("index.subtitle")}
            </p>
          </div>

          {/* Stats pills */}
          <div className={cn(
            "flex items-center justify-center gap-2 mb-8 transition-all duration-700 delay-150",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}>
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/40"
              >
                <span className="text-sm font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className={cn(
            "space-y-3 transition-all duration-700 delay-200",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
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
              variant="ghost"
              size="lg"
              className="w-full h-12 font-medium text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/auth")}
            >
              {t("index.haveAccount")}
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={cn(
        "px-5 pb-10 transition-all duration-700 delay-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <div
              key={feature.titleKey}
              className={cn(
                "group relative p-4 rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm",
                "hover:border-primary/20 hover:shadow-soft transition-all duration-300",
                "hover:-translate-y-0.5"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
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

      {/* Benefits Section */}
      <section className={cn(
        "px-5 py-10 transition-all duration-700 delay-400",
        mounted ? "opacity-100" : "opacity-0"
      )}>
        <div className="relative rounded-3xl bg-muted/30 border border-border/30 p-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] translate-x-1/3 -translate-y-1/3" />
          
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("index.whyPlantera")}
          </h2>
          
          <div className="space-y-2.5 relative">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border/20 shadow-xs hover:shadow-soft transition-all duration-200"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-foreground font-medium">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="px-5 py-6">
        <div className="relative rounded-3xl overflow-hidden gradient-hero p-6 shadow-glow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-x-1/3 translate-y-1/3" />
          
          <div className="relative text-center">
            <div className="flex items-center justify-center gap-1 mb-3">
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
      <section className="px-5 py-10 pb-12 safe-bottom">
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
