import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { HarvestChart } from "@/components/dashboard/HarvestChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { IoTDashboard } from "@/components/iot/IoTDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Wheat,
  PawPrint,
  Plus,
  CloudSun,
  TrendingUp,
  Bell,
  Droplets,
  Wind,
  Scale,
  ShoppingBag,
  Stethoscope,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();
  const { stats, harvestTrend, alerts, isLoading } = useDashboardData();

  const userName = profile?.full_name?.split(" ")[0] || "Utilisateur";
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  const getRoleSubtitle = () => {
    if (isVeterinaire) return "Consultez vos rendez-vous";
    if (isAcheteur) return "Découvrez les produits frais";
    if (isInvestisseur) return "Suivez vos investissements";
    if (isAdmin) return "Tableau de bord admin";
    return "Votre exploitation agricole";
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <PageHeader
          title={`${getGreeting()}, ${userName}`}
          subtitle={getRoleSubtitle()}
          action={
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {(alerts?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
          }
        />

        <div className="px-4 space-y-6 pb-28">
          {/* Weather Card - Agriculteurs */}
          {(isAgriculteur || isAdmin) && (
            <Card className="overflow-hidden border-0 shadow-elevated">
              <div className="gradient-hero p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
                <div className="flex items-center justify-between text-primary-foreground relative">
                  <div>
                    <p className="text-sm opacity-90 font-medium">Météo • Thiès</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-5xl font-bold">28°</span>
                      <span className="text-lg opacity-70">/ 21°</span>
                    </div>
                    <p className="text-sm mt-2 opacity-90">Ensoleillé avec nuages</p>
                  </div>
                  <div className="text-right">
                    <CloudSun className="w-20 h-20 opacity-90 animate-float" />
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-4 h-4" />
                        45%
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-4 h-4" />
                        12km/h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Agriculteur Stats */}
              {(isAgriculteur || isAdmin) && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MapPin className="w-6 h-6" />}
                    label="Parcelles"
                    value={stats?.totalFields || 0}
                    subtitle={`${stats?.totalArea?.toFixed(1) || 0} hectares`}
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<Wheat className="w-6 h-6" />}
                    label="Cultures"
                    value={stats?.activeCrops || 0}
                    subtitle="actives"
                    iconBg="accent"
                  />
                  <StatCard
                    icon={<PawPrint className="w-6 h-6" />}
                    label="Bétail"
                    value={stats?.totalLivestock || 0}
                    subtitle={stats?.healthAlerts ? `${stats.healthAlerts} alertes` : "en santé"}
                    iconBg="secondary"
                  />
                  <StatCard
                    icon={<Scale className="w-6 h-6" />}
                    label="Récolté"
                    value={`${((stats?.totalHarvested || 0) / 1000).toFixed(1)}t`}
                    subtitle="cette saison"
                    iconBg="success"
                  />
                </div>
              )}

              {/* Veterinaire Stats */}
              {isVeterinaire && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<Stethoscope className="w-6 h-6" />}
                    label="Consultations"
                    value={stats?.upcomingAppointments || 0}
                    subtitle="à venir"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<PawPrint className="w-6 h-6" />}
                    label="Patients"
                    value={stats?.totalLivestock || 0}
                    subtitle="animaux suivis"
                    iconBg="secondary"
                  />
                </div>
              )}

              {/* Acheteur Stats */}
              {isAcheteur && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<ShoppingBag className="w-6 h-6" />}
                    label="Mes achats"
                    value={stats?.totalPurchases || 0}
                    subtitle="acceptés"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Produits"
                    value={stats?.availableProducts || 0}
                    subtitle="disponibles"
                    iconBg="accent"
                  />
                </div>
              )}

              {/* Investisseur Stats */}
              {isInvestisseur && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<DollarSign className="w-6 h-6" />}
                    label="Investis"
                    value={`${((stats?.totalInvested || 0) / 1000).toFixed(0)}k`}
                    subtitle={`${stats?.activeInvestments || 0} projets actifs`}
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Rendement"
                    value={`${(stats?.averageReturn || 15).toFixed(0)}%`}
                    subtitle="moyen attendu"
                    iconBg="success"
                  />
                </div>
              )}
            </>
          )}

          {/* IoT Compact - Agriculteurs */}
          {(isAgriculteur || isAdmin) && <IoTDashboard compact />}

          {/* Chart - Agriculteurs */}
          {(isAgriculteur || isAdmin) && !isLoading && harvestTrend && (
            <HarvestChart data={harvestTrend} />
          )}

          {/* Alerts */}
          {alerts && alerts.length > 0 && <AlertsList alerts={alerts} />}

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Actions rapides</h2>
            
            {(isAgriculteur || isAdmin) && (
              <div className="grid grid-cols-2 gap-3">
                <QuickActionCard
                  icon={<Plus className="w-5 h-5" />}
                  title="Nouvelle parcelle"
                  description="Créer"
                  onClick={() => navigate("/parcelles")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Wheat className="w-5 h-5" />}
                  title="Enregistrer récolte"
                  description="Saisir"
                  onClick={() => navigate("/cultures")}
                />
                <QuickActionCard
                  icon={<PawPrint className="w-5 h-5" />}
                  title="Suivi santé"
                  description="Bétail"
                  onClick={() => navigate("/betail")}
                />
                <QuickActionCard
                  icon={<DollarSign className="w-5 h-5" />}
                  title="Investisseur"
                  description="Chercher"
                  onClick={() => navigate("/cultures")}
                  variant="accent"
                />
              </div>
            )}

            {isVeterinaire && !isAgriculteur && (
              <div className="grid grid-cols-2 gap-3">
                <QuickActionCard
                  icon={<PawPrint className="w-5 h-5" />}
                  title="Mes patients"
                  description="Consulter"
                  onClick={() => navigate("/veterinaire")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Stethoscope className="w-5 h-5" />}
                  title="Nouvelle consultation"
                  description="Enregistrer"
                  onClick={() => navigate("/veterinaire")}
                />
              </div>
            )}

            {isAcheteur && !isAgriculteur && (
              <QuickActionCard
                icon={<ShoppingBag className="w-5 h-5" />}
                title="Explorer le marketplace"
                description="Produits disponibles"
                onClick={() => navigate("/marketplace")}
                variant="primary"
              />
            )}

            {isInvestisseur && !isAgriculteur && (
              <QuickActionCard
                icon={<TrendingUp className="w-5 h-5" />}
                title="Opportunités d'investissement"
                description="Découvrir les projets"
                onClick={() => navigate("/investisseur")}
                variant="primary"
              />
            )}
          </div>

          {/* Marketplace CTA */}
          <Card 
            className="overflow-hidden border-0 shadow-soft cursor-pointer card-hover"
            onClick={() => navigate("/marketplace")}
          >
            <CardContent className="p-0">
              <div className="gradient-accent p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="font-bold text-lg">Marketplace</p>
                    <p className="text-sm opacity-90">
                      {isAgriculteur ? "Vendre vos produits" : "Acheter des produits frais"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}