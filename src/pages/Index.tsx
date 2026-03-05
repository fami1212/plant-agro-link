import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sprout, MapPin, Wifi, ArrowRight, Check, TrendingUp, PawPrint, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Index() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const features = [
    { icon: MapPin, titleKey: "index.parcels", descKey: "index.parcelsDesc", color: "text-primary bg-primary/10" },
    { icon: PawPrint, titleKey: "index.livestock", descKey: "index.livestockDesc", color: "text-accent bg-accent/10" },
    { icon: Wifi, titleKey: "index.iot", descKey: "index.iotDesc", color: "text-success bg-success/10" },
    { icon: ShoppingBag, titleKey: "index.sales", descKey: "index.salesDesc", color: "text-warning bg-warning/10" },
  ];

  const benefits = [
    t("index.benefit1"), t("index.benefit2"), t("index.benefit3"), t("index.benefit4"),
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <section className="relative px-5 pt-14 pb-12 safe-top">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
        <div className="relative">
          <div className={cn("flex items-center justify-center mb-10 transition-all duration-700", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
            <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center shadow-glow">
              <Sprout className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <div className={cn("text-center mb-10 transition-all duration-700 delay-100", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">Plantéra</h1>
            <p className="text-lg text-primary font-medium mb-3">{t("index.tagline")}</p>
            <p className="text-muted-foreground max-w-xs mx-auto">{t("index.subtitle")}</p>
          </div>
          <div className={cn("space-y-3 mb-10 transition-all duration-700 delay-200", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
            <Button size="lg" className="w-full h-14 gradient-hero text-primary-foreground font-semibold text-base shadow-soft hover:shadow-glow transition-all group" onClick={() => navigate("/onboarding")}>
              {t("index.startFree")}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="w-full h-12 font-medium" onClick={() => navigate("/auth")}>
              {t("index.haveAccount")}
            </Button>
          </div>
        </div>
      </section>

      <section className={cn("px-5 pb-10 transition-all duration-700 delay-300", mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <Card key={feature.titleKey} className="border-0 shadow-soft bg-card/60 backdrop-blur-sm hover:shadow-elevated transition-shadow">
              <CardContent className="p-4">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", feature.color)}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-0.5">{t(feature.titleKey)}</h3>
                <p className="text-xs text-muted-foreground">{t(feature.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className={cn("px-5 py-10 bg-muted/40 transition-all duration-700 delay-400", mounted ? "opacity-100" : "opacity-0")}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("index.whyPlantera")}</h2>
        </div>
        <div className="space-y-2.5">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3 p-3.5 rounded-xl bg-background/80 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <p className="text-sm text-foreground font-medium">{benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-10">
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-5 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-primary" />
            </div>
            <blockquote className="text-base font-medium text-foreground mb-3">"{t("index.testimonial")}"</blockquote>
            <p className="text-sm text-muted-foreground">{t("index.testimonialAuthor")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="px-5 py-10 gradient-earth safe-bottom">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">{t("index.readyToStart")}</h3>
          <p className="text-sm text-muted-foreground mb-5">{t("index.joinFarmers")}</p>
          <Button size="lg" className="gradient-hero text-primary-foreground font-semibold shadow-soft hover:shadow-glow transition-all group" onClick={() => navigate("/onboarding")}>
            {t("index.startNow")}
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>
    </div>
  );
}