import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { HarvestChart } from "@/components/dashboard/HarvestChart";
import { LivestockChart } from "@/components/dashboard/LivestockChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { stats, harvestTrend, livestockEvolution, alerts, isLoading } = useDashboardData();

  const userName = profile?.full_name?.split(" ")[0] || "Agriculteur";

  return (
    <AppLayout>
      <div className="gradient-earth min-h-screen">
        {/* Header */}
        <PageHeader
          title={`Bonjour, ${userName} 👋`}
          subtitle="Votre exploitation est en bonne santé"
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
          {/* Weather Card */}
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

          {/* Stats Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
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

          {/* Charts */}
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

          {/* Alerts */}
          <AlertsList alerts={alerts || []} />

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground px-1">
              Actions rapides
            </h2>
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
          </div>

          {/* Marketplace Preview */}
          <Card variant="interactive" onClick={() => navigate("/marketplace")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-sunset text-accent-foreground">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Marketplace</p>
                  <p className="text-sm text-muted-foreground">
                    Vendez vos produits agricoles
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
