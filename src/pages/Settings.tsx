import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { Moon, Sun, User, Bell, Shield, Globe, Sunrise } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { profile, roles } = useAuth();
  const [outdoorMode, setOutdoorMode] = useState(false);

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Appliquer le mode outdoor
  useEffect(() => {
    const root = document.documentElement;
    if (outdoorMode && isDark) {
      root.classList.add("outdoor");
    } else {
      root.classList.remove("outdoor");
    }
  }, [outdoorMode, isDark]);

  // Charger la préférence depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem("plantera-outdoor-mode");
    if (saved === "true") {
      setOutdoorMode(true);
    }
  }, []);

  const handleOutdoorModeChange = (enabled: boolean) => {
    setOutdoorMode(enabled);
    localStorage.setItem("plantera-outdoor-mode", String(enabled));
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      agriculteur: "Agriculteur",
      veterinaire: "Vétérinaire",
      acheteur: "Acheteur",
      investisseur: "Investisseur",
      admin: "Administrateur",
    };
    return labels[role] || role;
  };

  return (
    <AppLayout>
      <div className="p-4 pb-24 space-y-6">
        <PageHeader
          title="Paramètres"
          subtitle="Gérez vos préférences"
        />

        {/* Profile Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Profil</h3>
              <p className="text-sm text-muted-foreground">Informations du compte</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nom</span>
              <span className="font-medium">{profile?.full_name || "Non défini"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{profile?.email || "Non défini"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Téléphone</span>
              <span className="font-medium">{profile?.phone || "Non défini"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rôles</span>
              <div className="flex gap-1">
                {roles.map((role) => (
                  <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {getRoleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Appearance Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              {isDark ? <Moon className="w-5 h-5 text-accent" /> : <Sun className="w-5 h-5 text-accent" />}
            </div>
            <div>
              <h3 className="font-semibold">Apparence</h3>
              <p className="text-sm text-muted-foreground">Personnalisez l'affichage</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Mode sombre</Label>
                <p className="text-sm text-muted-foreground">
                  Activez le thème sombre pour réduire la fatigue visuelle
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            
            {isDark && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4 text-warning" />
                    <Label htmlFor="outdoor-mode">Mode terrain</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Contraste élevé pour utilisation en plein soleil
                  </p>
                </div>
                <Switch
                  id="outdoor-mode"
                  checked={outdoorMode}
                  onCheckedChange={handleOutdoorModeChange}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">Gérez vos alertes</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertes IoT</Label>
                <p className="text-sm text-muted-foreground">Seuils de capteurs dépassés</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Offres marketplace</Label>
                <p className="text-sm text-muted-foreground">Nouvelles offres reçues</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Language Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Langue</h3>
              <p className="text-sm text-muted-foreground">Français (par défaut)</p>
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">Sécurité</h3>
              <p className="text-sm text-muted-foreground">Options de sécurité</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Authentification à deux facteurs</Label>
              <p className="text-sm text-muted-foreground">Bientôt disponible</p>
            </div>
            <Switch disabled />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
