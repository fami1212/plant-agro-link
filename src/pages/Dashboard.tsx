import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { HarvestChart } from "@/components/dashboard/HarvestChart";
import { LivestockChart } from "@/components/dashboard/LivestockChart";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin, primaryRole } = useRoleAccess();
  const { stats, harvestTrend, livestockEvolution, alerts, isLoading } = useDashboardData();

  const userName = profile?.full_name?.split(" ")[0] || "Utilisateur";
  
  // Get role-specific greeting
  const getRoleGreeting = () => {
    if (isAdmin) return "Bienvenue, Admin";
    if (isVeterinaire) return `Dr. ${userName}`;
    if (isAcheteur) return `Bienvenue, ${userName}`;
    if (isInvestisseur) return `Bonjour, ${userName}`;
    return `Bonjour, ${userName} 👋`;
  };

  const getRoleSubtitle = () => {
    if (isVeterinaire) return "Consultez les animaux nécessitant votre attention";
    if (isAcheteur) return "Découvrez les produits disponibles sur le marketplace";
    if (isInvestisseur) return "Suivez vos investissements agricoles";
    if (isAdmin) return "Tableau de bord administrateur";
    return "Votre exploitation est en bonne santé";
  };

  return (
    <AppLayout>
      <div className="gradient-earth min-h-screen">
        {/* Header */}
        <PageHeader
          title={getRoleGreeting()}
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

        <div className="px-4 space-y-5 pb-6">
          {/* Weather Card - Only for Agriculteurs */}
          {(isAgriculteur || isAdmin) && (
            <Card variant="feature" className="overflow-hidden">
              <div className="gradient-hero p-5">
                <div className="flex items-center justify-between text-primary-foreground">
                  <div>
                    <p className="text-sm opacity-90">Météo à Thiès</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-4xl font-bold">28°</span>
                      <span className="text-lg opacity-80">/ 21°</span>
                    </div>
                    <p className="text-sm mt-1 opacity-90">Partiellement nuageux</p>
                  </div>
                  <div className="text-right">
                    <CloudSun className="w-16 h-16 opacity-90 animate-float" />
                    <div className="flex items-center gap-3 mt-2 text-sm">
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

          {/* Stats Grid - Role-based */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
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
                    subtitle={`${stats?.totalArea?.toFixed(1) || 0} ha`}
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<Wheat className="w-6 h-6" />}
                    label="Cultures actives"
                    value={stats?.activeCrops || 0}
                    iconBg="accent"
                  />
                  <StatCard
                    icon={<PawPrint className="w-6 h-6" />}
                    label="Têtes de bétail"
                    value={stats?.totalLivestock || 0}
                    subtitle={stats?.healthAlerts ? `${stats.healthAlerts} alertes` : undefined}
                    iconBg="secondary"
                  />
                  <StatCard
                    icon={<Scale className="w-6 h-6" />}
                    label="Total récolté"
                    value={`${((stats?.totalHarvested || 0) / 1000).toFixed(1)}t`}
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
                    label="Animaux suivis"
                    value={stats?.totalLivestock || 0}
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
                    value={0}
                    subtitle="ce mois"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Produits disponibles"
                    value={0}
                    iconBg="accent"
                  />
                </div>
              )}

              {/* Investisseur Stats */}
              {isInvestisseur && !isAgriculteur && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<DollarSign className="w-6 h-6" />}
                    label="Investissements"
                    value={0}
                    subtitle="actifs"
                    iconBg="primary"
                  />
                  <StatCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    label="Rendement moyen"
                    value="0%"
                    iconBg="success"
                  />
                </div>
              )}
            </>
          )}

          {/* IoT Sensors Compact - Only for Agriculteurs */}
          {(isAgriculteur || isAdmin) && <IoTDashboard compact />}

          {/* Charts - Only for Agriculteurs */}
          {(isAgriculteur || isAdmin) && (
            <>
              {isLoading ? (
                <>
                  <Skeleton className="h-[250px] rounded-xl" />
                  <Skeleton className="h-[250px] rounded-xl" />
                </>
              ) : (
                <>
                  <HarvestChart data={harvestTrend || []} />
                  <LivestockChart data={livestockEvolution || []} />
                </>
              )}
            </>
          )}

          {/* Alerts */}
          <AlertsList alerts={alerts || []} />

          {/* Quick Actions - Role-based */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground px-1">
              Actions rapides
            </h2>
            
            {/* Agriculteur Actions */}
            {(isAgriculteur || isAdmin) && (
              <>
                <QuickActionCard
                  icon={<Plus className="w-6 h-6" />}
                  title="Ajouter une parcelle"
                  description="Créer une nouvelle parcelle"
                  onClick={() => navigate("/parcelles")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Wheat className="w-6 h-6" />}
                  title="Enregistrer une récolte"
                  description="Saisir les données de récolte"
                  onClick={() => navigate("/cultures")}
                />
                <QuickActionCard
                  icon={<PawPrint className="w-6 h-6" />}
                  title="Suivi santé animal"
                  description="Journal des soins vétérinaires"
                  onClick={() => navigate("/betail")}
                />
                <QuickActionCard
                  icon={<DollarSign className="w-6 h-6" />}
                  title="Chercher un investisseur"
                  description="Créer une opportunité d'investissement"
                  onClick={() => navigate("/cultures")}
                  variant="accent"
                />
              </>
            )}

            {/* Veterinaire Actions */}
            {isVeterinaire && !isAgriculteur && (
              <>
                <QuickActionCard
                  icon={<PawPrint className="w-6 h-6" />}
                  title="Voir les animaux"
                  description="Consulter le registre du bétail"
                  onClick={() => navigate("/betail")}
                  variant="primary"
                />
                <QuickActionCard
                  icon={<Stethoscope className="w-6 h-6" />}
                  title="Ajouter un soin"
                  description="Enregistrer une consultation"
                  onClick={() => navigate("/betail")}
                />
              </>
            )}

            {/* Acheteur Actions */}
            {isAcheteur && !isAgriculteur && (
              <QuickActionCard
                icon={<ShoppingBag className="w-6 h-6" />}
                title="Explorer le marketplace"
                description="Découvrir les produits disponibles"
                onClick={() => navigate("/marketplace")}
                variant="primary"
              />
            )}

            {/* Investisseur Actions */}
            {isInvestisseur && !isAgriculteur && (
              <QuickActionCard
                icon={<TrendingUp className="w-6 h-6" />}
                title="Opportunités d'investissement"
                description="Découvrir les projets agricoles"
                onClick={() => navigate("/marketplace")}
                variant="primary"
              />
            )}
          </div>

          {/* Marketplace Preview - For all roles */}
          <Card variant="interactive" onClick={() => navigate("/marketplace")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-sunset text-accent-foreground">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Marketplace</p>
                  <p className="text-sm text-muted-foreground">
                    {isAgriculteur ? "Vendez vos produits agricoles" : 
                     isAcheteur ? "Achetez des produits frais" :
                     isInvestisseur ? "Investissez dans l'agriculture" :
                     "Explorez les offres du marketplace"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
