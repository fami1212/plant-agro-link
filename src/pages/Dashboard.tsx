import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { HarvestChart } from "@/components/dashboard/HarvestChart";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { InteractiveTutorial } from "@/components/onboarding/InteractiveTutorial";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Wheat, PawPrint, Plus, TrendingUp, Scale,
  ShoppingBag, Stethoscope, DollarSign, ArrowRight,
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

  return (
    <AppLayout>
      {showTutorial && <InteractiveTutorial onComplete={() => setShowTutorial(false)} />}
      <div className="min-h-screen bg-background">
        <PageHeader
          title={`${getGreeting()}, ${userName}`}
          subtitle={getRoleSubtitle()}
          action={<NotificationCenter />}
        />

        <div className="px-4 space-y-5 pb-28">
          <AIContextualTip context="dashboard" data={{ totalFields: stats?.totalFields, activeCrops: stats?.activeCrops, totalLivestock: stats?.totalLivestock }} />

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-24 rounded-2xl" />))}
            </div>
          ) : (
            <>
              {(isAgriculteur || isAdmin) && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<MapPin className="w-5 h-5" />} label={t("dashboard.stat.parcels")} value={stats?.totalFields || 0} subtitle={`${stats?.totalArea?.toFixed(1) || 0} ha`} iconBg="primary" />
                  <StatCard icon={<Wheat className="w-5 h-5" />} label={t("dashboard.stat.crops")} value={stats?.activeCrops || 0} subtitle={t("dashboard.stat.active")} iconBg="accent" />
                  <StatCard icon={<PawPrint className="w-5 h-5" />} label={t("dashboard.stat.livestock")} value={stats?.totalLivestock || 0} subtitle={stats?.healthAlerts ? `${stats.healthAlerts} ${t("dashboard.stat.alerts")}` : t("dashboard.stat.healthy")} iconBg="secondary" />
                  <StatCard icon={<Scale className="w-5 h-5" />} label={t("dashboard.stat.harvested")} value={`${((stats?.totalHarvested || 0) / 1000).toFixed(1)}t`} subtitle={t("dashboard.stat.season")} iconBg="success" />
                </div>
              )}
              {isVeterinaire && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Stethoscope className="w-5 h-5" />} label={t("dashboard.stat.consultations")} value={stats?.upcomingAppointments || 0} subtitle={t("dashboard.stat.upcoming")} iconBg="primary" />
                  <StatCard icon={<PawPrint className="w-5 h-5" />} label={t("dashboard.stat.patients")} value={stats?.totalLivestock || 0} subtitle={t("dashboard.stat.followed")} iconBg="secondary" />
                </div>
              )}
              {isAcheteur && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<ShoppingBag className="w-5 h-5" />} label={t("dashboard.stat.purchases")} value={stats?.totalPurchases || 0} subtitle={t("dashboard.stat.accepted")} iconBg="primary" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t("dashboard.stat.products")} value={stats?.availableProducts || 0} subtitle={t("dashboard.stat.available")} iconBg="accent" />
                </div>
              )}
              {isInvestisseur && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<DollarSign className="w-5 h-5" />} label={t("dashboard.stat.invested")} value={`${((stats?.totalInvested || 0) / 1000).toFixed(0)}k`} subtitle={`${stats?.activeInvestments || 0} ${t("dashboard.stat.activeInv")}`} iconBg="primary" />
                  <StatCard icon={<TrendingUp className="w-5 h-5" />} label={t("dashboard.stat.yield")} value={`${(stats?.averageReturn || 15).toFixed(0)}%`} subtitle={t("dashboard.stat.expected")} iconBg="success" />
                </div>
              )}
            </>
          )}

          {(isAgriculteur || isAdmin) && !isLoading && harvestTrend && (<HarvestChart data={harvestTrend} />)}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.quickActions")}</h2>
            
            {(isAgriculteur || isAdmin) && (
              <div className="grid grid-cols-2 gap-3">
                <QuickActionCard icon={<Plus className="w-4 h-4" />} title={t("dashboard.action.newParcel")} description={t("dashboard.action.create")} onClick={() => navigate("/parcelles")} variant="primary" />
                <QuickActionCard icon={<Wheat className="w-4 h-4" />} title={t("dashboard.action.recordHarvest")} description={t("dashboard.action.enter")} onClick={() => navigate("/cultures")} />
                <QuickActionCard icon={<PawPrint className="w-4 h-4" />} title={t("dashboard.action.healthTracking")} description={t("dashboard.action.livestock")} onClick={() => navigate("/betail")} />
                <QuickActionCard icon={<ShoppingBag className="w-4 h-4" />} title={t("dashboard.action.marketplace")} description={t("dashboard.action.sell")} onClick={() => navigate("/marketplace")} variant="accent" />
              </div>
            )}

            {isVeterinaire && !isAgriculteur && (
              <div className="grid grid-cols-2 gap-3">
                <QuickActionCard icon={<PawPrint className="w-4 h-4" />} title={t("dashboard.action.myPatients")} description={t("dashboard.action.consult")} onClick={() => navigate("/veterinaire")} variant="primary" />
                <QuickActionCard icon={<Stethoscope className="w-4 h-4" />} title={t("dashboard.action.consultation")} description={t("dashboard.action.register")} onClick={() => navigate("/veterinaire")} />
              </div>
            )}

            {isAcheteur && !isAgriculteur && (
              <QuickActionCard icon={<ShoppingBag className="w-4 h-4" />} title={t("dashboard.action.explore")} description={t("dashboard.action.availableProducts")} onClick={() => navigate("/marketplace")} variant="primary" />
            )}

            {isInvestisseur && !isAgriculteur && (
              <QuickActionCard icon={<TrendingUp className="w-4 h-4" />} title={t("dashboard.action.opportunities")} description={t("dashboard.action.discoverProjects")} onClick={() => navigate("/investisseur")} variant="primary" />
            )}
          </div>

          <Card className="overflow-hidden cursor-pointer border-0 shadow-soft hover:shadow-elevated transition-shadow" onClick={() => navigate("/marketplace")}>
            <CardContent className="p-0">
              <div className="gradient-accent p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="font-semibold">{t("dashboard.action.marketplace")}</p>
                    <p className="text-xs opacity-80">
                      {isAgriculteur ? t("dashboard.marketplace.sell") : t("dashboard.marketplace.buy")}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}