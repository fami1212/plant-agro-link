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

const allNavItems = [
  { id: "home", icon: Home, labelKey: "nav.home", path: "/dashboard", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { id: "farm", icon: Tractor, labelKey: "nav.farm", path: "/agriculteur", roles: ['agriculteur'] },
  { id: "market-farmer", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/farmer", roles: ['agriculteur'] },
  { id: "vet-cabinet", icon: Stethoscope, labelKey: "nav.cabinet", path: "/veterinaire", roles: ['veterinaire'] },
  { id: "vet-market", icon: ShoppingBag, labelKey: "nav.catalog", path: "/marketplace/buyer", roles: ['veterinaire'] },
  { id: "buyer-catalog", icon: ShoppingBag, labelKey: "nav.catalog", path: "/marketplace/buyer", roles: ['acheteur'] },
  { id: "investor-market", icon: TrendingUp, labelKey: "nav.invest", path: "/marketplace/investor", roles: ['investisseur'] },
  { id: "admin-market", icon: ShoppingBag, labelKey: "nav.market", path: "/marketplace/farmer", roles: ['admin'] },
];

const allMenuItems = [
  { icon: Brain, labelKey: "nav.ai", path: "/ia", roles: ['agriculteur', 'admin'], highlight: true },
  { icon: Wheat, labelKey: "nav.crops", path: "/cultures", roles: ['agriculteur', 'admin'] },
  { icon: PawPrint, labelKey: "nav.livestock", path: "/betail", roles: ['agriculteur', 'admin'] },
  { icon: MapPin, labelKey: "nav.parcels", path: "/parcelles", roles: ['agriculteur', 'admin'] },
  { icon: Activity, labelKey: "nav.iot", path: "/iot", roles: ['agriculteur', 'admin'] },
  { icon: Users, labelKey: "nav.community", path: "/communaute", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { icon: GraduationCap, labelKey: "nav.elearning", path: "/elearning", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { icon: Truck, labelKey: "nav.logistics", path: "/logistique", roles: ['agriculteur', 'acheteur', 'admin'] },
  { icon: PawPrint, labelKey: "nav.animals", path: "/betail", roles: ['veterinaire'] },
  { icon: Shield, labelKey: "nav.admin", path: "/admin", roles: ['admin'] },
  { icon: Settings, labelKey: "nav.settings", path: "/settings", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roles, signOut } = useAuth();
  const { canAccessRoute } = useRoleAccess();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = allNavItems.filter(item => 
    item.roles.some(role => roles.includes(role as any)) || roles.length === 0
  );

  const menuItems = allMenuItems.filter(item =>
    item.roles.some(role => roles.includes(role as any)) || item.path === '/settings'
  );

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 bottom-nav" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-14 rounded-2xl transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "text-primary")} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 transition-all",
                isActive ? "font-semibold" : "font-medium"
              )}>{t(item.labelKey)}</span>
            </button>
          );
        })}

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-14 rounded-2xl transition-all duration-200 text-muted-foreground hover:text-foreground">
              <div className="flex items-center justify-center w-10 h-8 rounded-xl">
                <Menu className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium mt-0.5">{t("nav.more")}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl border-t border-border/50 px-4 pb-8">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
            
            {user && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 mb-4">
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

            <div className="grid grid-cols-4 gap-2 mb-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isHighlight = (item as any).highlight;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
                      isHighlight && !isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium text-center leading-tight">{t(item.labelKey)}</span>
                  </button>
                );
              })}
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
