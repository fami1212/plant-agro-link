import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MapPin,
  Wheat,
  PawPrint,
  Droplets,
  Plus,
  CloudSun,
  TrendingUp,
  Bell,
  Thermometer,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="gradient-earth min-h-screen">
        {/* Header */}
        <PageHeader
          title="Bonjour, Amadou 👋"
          subtitle="Votre exploitation est en bonne santé"
          action={
            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
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

          {/* Alert */}
          <AlertBanner
            title="Alerte irrigation"
            message="La parcelle 'Mil Nord' nécessite une irrigation dans les 24h"
            type="warning"
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<MapPin className="w-6 h-6" />}
              label="Parcelles"
              value={12}
              iconBg="primary"
            />
            <StatCard
              icon={<Wheat className="w-6 h-6" />}
              label="Cultures actives"
              value={8}
              iconBg="accent"
            />
            <StatCard
              icon={<PawPrint className="w-6 h-6" />}
              label="Têtes de bétail"
              value={45}
              iconBg="secondary"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Rendement"
              value="+15%"
              trend={{ value: 15, positive: true }}
              iconBg="success"
            />
          </div>

          {/* IoT Sensors Quick View */}
          <Card variant="default">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-primary" />
                Capteurs en temps réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Sol</p>
                  <p className="text-lg font-bold text-foreground">38%</p>
                  <p className="text-xs text-warning">Bas</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">Temp.</p>
                  <p className="text-lg font-bold text-foreground">32°C</p>
                  <p className="text-xs text-success">Normal</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-muted/50">
                  <p className="text-xs text-muted-foreground">pH</p>
                  <p className="text-lg font-bold text-foreground">6.8</p>
                  <p className="text-xs text-success">Optimal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground px-1">
              Actions rapides
            </h2>
            <QuickActionCard
              icon={<Plus className="w-6 h-6" />}
              title="Ajouter une parcelle"
              description="Créer une nouvelle parcelle"
              onClick={() => navigate("/parcelles/new")}
              variant="primary"
            />
            <QuickActionCard
              icon={<Wheat className="w-6 h-6" />}
              title="Enregistrer une récolte"
              description="Saisir les données de récolte"
              onClick={() => navigate("/cultures/harvest")}
            />
            <QuickActionCard
              icon={<PawPrint className="w-6 h-6" />}
              title="Suivi santé animal"
              description="Journal des soins vétérinaires"
              onClick={() => navigate("/betail/health")}
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
                    3 nouvelles demandes pour vos produits
                  </p>
                </div>
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-accent-foreground text-sm font-bold">
                  3
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
