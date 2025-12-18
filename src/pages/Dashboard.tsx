import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { HarvestChart } from "@/components/dashboard/HarvestChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { IoTDashboard } from "@/components/iot/IoTDashboard";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
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
            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell className="w-5 h-5" />
              {(alerts?.length || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              )}
            </Button>
          }
        />

        <div className="px-4 space-y-5 pb-28">
          {/* AI Contextual Tip */}
          <AIContextualTip 
            context="dashboard" 
            data={{ 
              totalFields: stats?.totalFields, 
              activeCrops: stats?.activeCrops,
              totalLivestock: stats?.totalLivestock 
            }} 
          />

          {/* Weather Card - Agriculteurs */}
          {(isAgriculteur || isAdmin) && (
            <Card variant="feature" className="overflow-hidden">
              <div className="gradient-primary p-5 relative">
                <div className="flex items-center justify-between text-primary-foreground relative">
                  <div>
                    <p className="text-xs opacity-80 font-medium">Météo • Thiès</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-4xl font-bold">28°</span>
                      <span className="text-base opacity-60">/ 21°</span>
                    </div>
                    <p className="text-xs mt-2 opacity-80">Ensoleillé avec nuages</p>
                  </div>
                  <div className="text-right">
                    <CloudSun className="w-16 h-16 opacity-80" />
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="flex items-center gap-1 opacity-80">
                        <Droplets className="w-3.5 h-3.5" />
                        45%
                      </span>
                      <span className="flex items-center gap-1 opacity-80">
                        <Wind className="w-3.5 h-3.5" />
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
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {/* Agriculteur Stats */}
              {(isAgriculteur || isAdmin) && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<MapPin className="w-5 h-5" />}
                    label="Parcelles"
                    value={stats?.totalFields || 0}
                    subtitle={`${stats?.totalArea?.toFixed(1) || 0} hectares`}
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<Wheat className="w-5 h-5" />}
                    label="Cultures"
                    value={stats?.activeCrops || 0}
                    subtitle="actives"
                    iconBg="accent"
                  />
                  <StatCard
                    icon={<PawPrint className="w-5 h-5" />}
                    label="Bétail"
                    value={stats?.totalLivestock || 0}
                    subtitle={stats?.healthAlerts ? `${stats.healthAlerts} alertes` : "en santé"}
                    iconBg="secondary"
                  />
                  <StatCard
                    icon={<Scale className="w-5 h-5" />}
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
                    icon={<Stethoscope className="w-5 h-5" />}
                    label="Consultations"
                    value={stats?.upcomingAppointments || 0}
                    subtitle="à venir"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<PawPrint className="w-5 h-5" />}
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
                    icon={<ShoppingBag className="w-5 h-5" />}
                    label="Mes achats"
                    value={stats?.totalPurchases || 0}
                    subtitle="acceptés"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
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
                    icon={<DollarSign className="w-5 h-5" />}
                    label="Investis"
                    value={`${((stats?.totalInvested || 0) / 1000).toFixed(0)}k`}
                    subtitle={`${stats?.activeInvestments || 0} projets actifs`}
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-5 h-5" />}
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
            <h2 className="text-sm font-semibold text-foreground">Actions rapides</h2>
            
            {(isAgriculteur || isAdmin) && (
              <div className="grid grid-cols-2 gap-3">
                <QuickActionCard
                  icon={<Plus className="w-4 h-4" />}
                  title="Nouvelle parcelle"
                  description="Créer"
                  onClick={() => navigate("/parcelles")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Wheat className="w-4 h-4" />}
                  title="Enregistrer récolte"
                  description="Saisir"
                  onClick={() => navigate("/cultures")}
                />
                <QuickActionCard
                  icon={<PawPrint className="w-4 h-4" />}
                  title="Suivi santé"
                  description="Bétail"
                  onClick={() => navigate("/betail")}
                />
                <QuickActionCard
                  icon={<DollarSign className="w-4 h-4" />}
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
                  icon={<PawPrint className="w-4 h-4" />}
                  title="Mes patients"
                  description="Consulter"
                  onClick={() => navigate("/veterinaire")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Stethoscope className="w-4 h-4" />}
                  title="Consultation"
                  description="Enregistrer"
                  onClick={() => navigate("/veterinaire")}
                />
              </div>
            )}

            {isAcheteur && !isAgriculteur && (
              <QuickActionCard
                icon={<ShoppingBag className="w-4 h-4" />}
                title="Explorer le marketplace"
                description="Produits disponibles"
                onClick={() => navigate("/marketplace")}
                variant="primary"
              />
            )}

            {isInvestisseur && !isAgriculteur && (
              <QuickActionCard
                icon={<TrendingUp className="w-4 h-4" />}
                title="Opportunités"
                description="Découvrir les projets"
                onClick={() => navigate("/investisseur")}
                variant="primary"
              />
            )}
          </div>

          {/* Marketplace CTA */}
          <Card 
            variant="interactive"
            className="overflow-hidden"
            onClick={() => navigate("/marketplace")}
          >
            <CardContent className="p-0">
              <div className="gradient-accent p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-white">
                    <p className="font-semibold">Marketplace</p>
                    <p className="text-xs opacity-80">
                      {isAgriculteur ? "Vendre vos produits" : "Acheter des produits frais"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
