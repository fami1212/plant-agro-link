import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { InteractiveTutorial } from "@/components/onboarding/InteractiveTutorial";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Wheat, PawPrint, Plus, TrendingUp,
  ShoppingBag, Stethoscope, DollarSign,
  Tractor,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLanguage } from "@/i18n/LanguageContext";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();
  const { stats, harvestTrend, alerts, isLoading } = useDashboardData();
  const { t } = useLanguage();
  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem("plantera-tutorial-completed");
  });

  const userName = profile?.full_name?.split(" ")[0] || t("common.user");
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 18) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  };

  const getRoleSubtitle = () => {
    if (isVeterinaire) return t("dashboard.role.vet");
    if (isAcheteur) return t("dashboard.role.buyer");
    if (isInvestisseur) return t("dashboard.role.investor");
    if (isAdmin) return t("dashboard.role.admin");
    return t("dashboard.role.farmer");
  };

  // 2-3 KPIs per role
  const kpis = (() => {
    if (isVeterinaire && !isAgriculteur) return [
      { icon: <Stethoscope className="w-5 h-5" />, label: t("dashboard.stat.consultations"), value: stats?.upcomingAppointments || 0, subtitle: t("dashboard.stat.upcoming"), iconBg: "primary" as const },
      { icon: <PawPrint className="w-5 h-5" />, label: t("dashboard.stat.patients"), value: stats?.totalLivestock || 0, subtitle: t("dashboard.stat.followed"), iconBg: "secondary" as const },
    ];
    if (isAcheteur && !isAgriculteur) return [
      { icon: <ShoppingBag className="w-5 h-5" />, label: t("dashboard.stat.purchases"), value: stats?.totalPurchases || 0, subtitle: t("dashboard.stat.accepted"), iconBg: "primary" as const },
      { icon: <TrendingUp className="w-5 h-5" />, label: t("dashboard.stat.products"), value: stats?.availableProducts || 0, subtitle: t("dashboard.stat.available"), iconBg: "accent" as const },
    ];
    if (isInvestisseur && !isAgriculteur) return [
      { icon: <DollarSign className="w-5 h-5" />, label: t("dashboard.stat.invested"), value: `${((stats?.totalInvested || 0) / 1000).toFixed(0)}k`, subtitle: `${stats?.activeInvestments || 0} ${t("dashboard.stat.activeInv")}`, iconBg: "primary" as const },
      { icon: <TrendingUp className="w-5 h-5" />, label: t("dashboard.stat.yield"), value: `${(stats?.averageReturn || 15).toFixed(0)}%`, subtitle: t("dashboard.stat.expected"), iconBg: "success" as const },
    ];
    return [
      { icon: <MapPin className="w-5 h-5" />, label: t("dashboard.stat.parcels"), value: stats?.totalFields || 0, subtitle: `${stats?.totalArea?.toFixed(1) || 0} ha`, iconBg: "primary" as const },
      { icon: <Wheat className="w-5 h-5" />, label: t("dashboard.stat.crops"), value: stats?.activeCrops || 0, subtitle: t("dashboard.stat.active"), iconBg: "accent" as const },
      { icon: <PawPrint className="w-5 h-5" />, label: t("dashboard.stat.livestock"), value: stats?.totalLivestock || 0, subtitle: stats?.healthAlerts ? `${stats.healthAlerts} ${t("dashboard.stat.alerts")}` : t("dashboard.stat.healthy"), iconBg: "secondary" as const },
    ];
  })();

  // Top alert (single, most important)
  const topAlert = alerts && alerts.length > 0 ? alerts[0] : null;

  // 3 quick actions
  const quickActions = (() => {
    if (isVeterinaire && !isAgriculteur) return [
      { icon: <Stethoscope className="w-4 h-4" />, title: t("dashboard.action.consultation"), description: t("dashboard.action.register"), onClick: () => navigate("/veterinaire"), variant: "primary" as const },
      { icon: <PawPrint className="w-4 h-4" />, title: t("dashboard.action.myPatients"), description: t("dashboard.action.consult"), onClick: () => navigate("/veterinaire") },
      { icon: <ShoppingBag className="w-4 h-4" />, title: t("dashboard.action.marketplace"), description: t("dashboard.marketplace.buy"), onClick: () => navigate("/marketplace"), variant: "accent" as const },
    ];
    if (isAcheteur && !isAgriculteur) return [
      { icon: <ShoppingBag className="w-4 h-4" />, title: t("dashboard.action.explore"), description: t("dashboard.action.availableProducts"), onClick: () => navigate("/marketplace"), variant: "primary" as const },
      { icon: <Wheat className="w-4 h-4" />, title: t("dashboard.action.recordHarvest"), description: t("buyer.orders"), onClick: () => navigate("/acheteur") },
    ];
    if (isInvestisseur && !isAgriculteur) return [
      { icon: <TrendingUp className="w-4 h-4" />, title: t("dashboard.action.opportunities"), description: t("dashboard.action.discoverProjects"), onClick: () => navigate("/investisseur"), variant: "primary" as const },
      { icon: <DollarSign className="w-4 h-4" />, title: t("investor.portfolio"), description: t("investor.portfolioTab"), onClick: () => navigate("/investisseur") },
    ];
    return [
      { icon: <Tractor className="w-4 h-4" />, title: t("nav.farm"), description: t("farmer.subtitle"), onClick: () => navigate("/agriculteur"), variant: "primary" as const },
      { icon: <Plus className="w-4 h-4" />, title: t("dashboard.action.newParcel"), description: t("dashboard.action.create"), onClick: () => navigate("/parcelles") },
      { icon: <ShoppingBag className="w-4 h-4" />, title: t("dashboard.action.marketplace"), description: t("dashboard.action.sell"), onClick: () => navigate("/marketplace"), variant: "accent" as const },
    ];
  })();

  return (
    <AppLayout>
      {showTutorial && <InteractiveTutorial onComplete={() => setShowTutorial(false)} />}
      <div className="min-h-screen bg-background">
        <PageHeader showLogo
          title={`${getGreeting()}, ${userName}`}
          subtitle={getRoleSubtitle()}
          action={<NotificationCenter />}
        />

        <div className="px-4 space-y-4 pb-28">
          {topAlert && (
            <AlertBanner
              title={topAlert.title}
              message={topAlert.message}
              type={topAlert.type as any}
            />
          )}

          <AIContextualTip context="dashboard" data={{ totalFields: stats?.totalFields, activeCrops: stats?.activeCrops, totalLivestock: stats?.totalLivestock }} />

          {isLoading ? (
            <div className={`grid grid-cols-${kpis.length} gap-3`}>
              {kpis.map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className={cn("grid gap-3", kpis.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {kpis.map((k, i) => (
                <StatCard key={i} compact icon={k.icon} label={k.label} value={k.value} iconBg={k.iconBg} />
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {t("dashboard.quickActions")}
            </h2>
            <div className="space-y-2">
              {quickActions.map((a, i) => (
                <QuickActionCard key={i} icon={a.icon} title={a.title} description={a.description} onClick={a.onClick} variant={a.variant} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}