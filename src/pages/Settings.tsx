import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, languageLabels, type Language } from "@/i18n/LanguageContext";
import { Moon, Sun, User, Bell, Shield, Globe, Sunrise, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { profile, roles } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [outdoorMode, setOutdoorMode] = useState(false);
  const { permission, supported, requestPermission } = usePushNotifications();

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const root = document.documentElement;
    if (outdoorMode && isDark) {
      root.classList.add("outdoor");
    } else {
      root.classList.remove("outdoor");
    }
  }, [outdoorMode, isDark]);

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

  const languages: Language[] = ["fr", "en", "wo"];

  return (
    <AppLayout>
      <div className="p-4 pb-24 space-y-6">
        <PageHeader
          title={t("settings.title")}
          subtitle={t("settings.subtitle")}
        />

        {/* Profile Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{t("settings.profile")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.profileDesc")}</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("settings.name")}</span>
              <span className="font-medium">{profile?.full_name || t("settings.notSet")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("settings.email")}</span>
              <span className="font-medium">{profile?.email || t("settings.notSet")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("settings.phone")}</span>
              <span className="font-medium">{profile?.phone || t("settings.notSet")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("settings.roles")}</span>
              <div className="flex gap-1">
                {roles.map((role) => (
                  <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t(`role.${role}`)}
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
              <h3 className="font-semibold">{t("settings.appearance")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.appearanceDesc")}</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">{t("settings.darkMode")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.darkModeDesc")}</p>
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
                    <Label htmlFor="outdoor-mode">{t("settings.outdoorMode")}</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("settings.outdoorModeDesc")}</p>
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
              <h3 className="font-semibold">{t("settings.notifications")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.notificationsDesc")}</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="space-y-4">
            {supported && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications push</Label>
                  <p className="text-sm text-muted-foreground">
                    {permission === "granted" ? "Activées ✓" : "Recevez des alertes même en arrière-plan"}
                  </p>
                </div>
                <Switch
                  checked={permission === "granted"}
                  onCheckedChange={async (checked) => {
                    if (checked) await requestPermission();
                  }}
                  disabled={permission === "denied"}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.iotAlerts")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.iotAlertsDesc")}</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("settings.marketOffers")}</Label>
                <p className="text-sm text-muted-foreground">{t("settings.marketOffersDesc")}</p>
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
              <h3 className="font-semibold">{t("settings.language")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="flex gap-2">
            {languages.map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1 gap-1.5",
                  language === lang && "pointer-events-none"
                )}
                onClick={() => setLanguage(lang)}
              >
                {language === lang && <Check className="w-3.5 h-3.5" />}
                {languageLabels[lang]}
              </Button>
            ))}
          </div>
        </Card>

        {/* Security Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">{t("settings.security")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.securityDesc")}</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("settings.2fa")}</Label>
              <p className="text-sm text-muted-foreground">{t("settings.2faDesc")}</p>
            </div>
            <Switch disabled />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
