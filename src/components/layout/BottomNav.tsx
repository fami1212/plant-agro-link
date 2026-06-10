import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, MapPin, Wheat, PawPrint, ShoppingBag, Menu,
  User, LogOut, Settings, Activity, Stethoscope,
  TrendingUp, Shield, Tractor, Brain, Users, GraduationCap, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import logoIcon from "@/assets/plantera-icon.png";

// Bottom nav: just 3 essentials per role (Home / Mon espace / Marché) + Menu "Plus".
const allNavItems = [
  { id: "home", icon: Home, labelKey: "nav.home", path: "/dashboard", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { id: "farm", icon: Tractor, labelKey: "nav.farm", path: "/agriculteur", roles: ['agriculteur'] },
  { id: "vet-cabinet", icon: Stethoscope, labelKey: "nav.cabinet", path: "/veterinaire", roles: ['veterinaire'] },
  { id: "buyer-space", icon: ShoppingBag, labelKey: "nav.catalog", path: "/acheteur", roles: ['acheteur'] },
  { id: "investor-space", icon: TrendingUp, labelKey: "nav.invest", path: "/investisseur", roles: ['investisseur'] },
  { id: "admin-space", icon: Shield, labelKey: "nav.admin", path: "/admin", roles: ['admin'] },
  { id: "market-farmer", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/farmer", roles: ['agriculteur'] },
  { id: "vet-market", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/buyer", roles: ['veterinaire'] },
  { id: "buyer-market", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/buyer", roles: ['acheteur'] },
  { id: "investor-market", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/investor", roles: ['investisseur'] },
  { id: "admin-market", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/farmer", roles: ['admin'] },
];

type MenuSection = {
  titleKey: string;
  items: { icon: any; labelKey: string; path: string; roles: string[]; highlight?: boolean }[];
};

const menuSections: MenuSection[] = [
  {
    titleKey: "menu.section.tools",
    items: [
      { icon: Brain, labelKey: "nav.ai", path: "/ia", roles: ['agriculteur', 'admin'], highlight: true },
      { icon: Wheat, labelKey: "nav.crops", path: "/cultures", roles: ['agriculteur', 'admin'] },
      { icon: PawPrint, labelKey: "nav.livestock", path: "/betail", roles: ['agriculteur', 'veterinaire', 'admin'] },
      { icon: MapPin, labelKey: "nav.parcels", path: "/parcelles", roles: ['agriculteur', 'admin'] },
      { icon: Activity, labelKey: "nav.iot", path: "/iot", roles: ['agriculteur', 'admin'] },
      { icon: Truck, labelKey: "nav.logistics", path: "/logistique", roles: ['agriculteur', 'acheteur', 'admin'] },
    ],
  },
  {
    titleKey: "menu.section.community",
    items: [
      { icon: Users, labelKey: "nav.community", path: "/communaute", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
      { icon: GraduationCap, labelKey: "nav.elearning", path: "/elearning", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
    ],
  },
  {
    titleKey: "menu.section.account",
    items: [
      { icon: Shield, labelKey: "nav.admin", path: "/admin", roles: ['admin'] },
      { icon: Settings, labelKey: "nav.settings", path: "/settings", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
    ],
  },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roles, signOut } = useAuth();
  const { canAccessRoute } = useRoleAccess();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  // Build a clean 3-item nav: Home + role space + Marché (deduped, max 3).
  const navItems = (() => {
    const filtered = allNavItems.filter(item =>
      item.roles.some(role => roles.includes(role as any)) || roles.length === 0
    );
    const seen = new Set<string>();
    const out: typeof filtered = [];
    for (const it of filtered) {
      if (seen.has(it.path)) continue;
      seen.add(it.path);
      out.push(it);
      if (out.length >= 3) break;
    }
    return out;
  })();

  const visibleSections = menuSections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (it) => it.roles.some((r) => roles.includes(r as any)) || it.path === "/settings"
      ),
    }))
    .filter((s) => s.items.length > 0);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(t("auth.logoutSuccess"));
      navigate("/");
    } catch (error) {
      toast.error(t("auth.logoutError"));
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Routes that live inside the "Plus" sheet — used to highlight Menu when active.
  const moreRoutes = visibleSections.flatMap((s) => s.items.map((i) => i.path));
  const isMoreActive = moreRoutes.includes(location.pathname);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-2xl border-t border-border/60 bottom-nav shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-2 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? "page" : undefined}
              aria-label={t(item.labelKey)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 min-w-0 rounded-2xl transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden />
              )}
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-200",
                  isActive && "bg-primary/12"
                )}
              >
                <Icon
                  className={cn("w-[22px] h-[22px]", isActive && "text-primary")}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight mt-0.5 transition-all truncate max-w-full px-1",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              aria-label={t("nav.more")}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 min-w-0 rounded-2xl transition-all duration-200 active:scale-95",
                isMoreActive || menuOpen
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {(isMoreActive || menuOpen) && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden />
              )}
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-200",
                  (isMoreActive || menuOpen) && "bg-primary/12"
                )}
              >
                <Menu
                  className="w-[22px] h-[22px]"
                  strokeWidth={isMoreActive || menuOpen ? 2.4 : 1.9}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] leading-tight mt-0.5",
                  isMoreActive || menuOpen ? "font-semibold" : "font-medium"
                )}
              >
                {t("nav.more")}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[92vh] max-h-[92vh] rounded-t-3xl border-t border-border/50 px-4 pb-8 flex flex-col">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />

            <div className="flex items-center justify-center gap-2 mb-3">
              <img src={logoIcon} alt="Plantera" className="w-7 h-7 rounded-lg" />
              <span className="font-bold text-base text-foreground">Plantera</span>
            </div>

            {user && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{profile?.full_name || t("common.user")}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {roles.map((role) => (
                        <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {t(`role.${role}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 mb-4 flex-1 overflow-y-auto -mx-1 px-1">
              {visibleSections.map((section) => (
                <div key={section.titleKey}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {t(section.titleKey)}
                  </p>
                  <div className="rounded-2xl bg-muted/30 divide-y divide-border/50 overflow-hidden">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMenuOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/60 text-foreground"
                          )}
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                              isActive
                                ? "bg-primary/15 text-primary"
                                : item.highlight
                                ? "bg-primary/10 text-primary"
                                : "bg-background text-muted-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4" strokeWidth={2} />
                          </div>
                          <span className="text-sm font-medium flex-1">
                            {t(item.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {user && (
              <Button 
                variant="ghost" 
                className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10 h-12 rounded-2xl"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logout")}
              </Button>
            )}

            {!user && (
              <Button 
                className="w-full h-12 rounded-2xl"
                onClick={() => {
                  navigate("/auth");
                  setMenuOpen(false);
                }}
              >
                <User className="w-4 h-4 mr-2" />
                {t("auth.login")}
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
