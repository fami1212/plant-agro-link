import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  MapPin, 
  Wheat, 
  PawPrint, 
  ShoppingBag, 
  Menu,
  User,
  LogOut,
  Settings,
  Activity,
  Stethoscope,
  TrendingUp,
  Shield,
  Tractor,
  Brain,
  Mic,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

// All possible navigation items
const allNavItems = [
  { icon: Home, label: "Accueil", path: "/dashboard", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { icon: Tractor, label: "Ferme", path: "/agriculteur", roles: ['agriculteur', 'admin'] },
  { icon: Wheat, label: "Cultures", path: "/cultures", roles: ['agriculteur', 'admin'] },
  { icon: PawPrint, label: "Bétail", path: "/betail", roles: ['agriculteur', 'admin'] },
  { icon: Stethoscope, label: "Cabinet", path: "/veterinaire", roles: ['veterinaire'] },
  { icon: TrendingUp, label: "Investir", path: "/investisseur", roles: ['investisseur', 'admin'] },
  { icon: ShoppingBag, label: "Achats", path: "/acheteur", roles: ['acheteur'] },
  { icon: ShoppingBag, label: "Marché", path: "/marketplace", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
];

// All possible menu items
const allMenuItems = [
  { icon: Mic, label: "Assistant Vocal", path: "/voice", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'], highlight: true },
  { icon: MapPin, label: "Parcelles", path: "/parcelles", roles: ['agriculteur', 'admin'] },
  { icon: TrendingUp, label: "Financements", path: "/farmer-investments", roles: ['agriculteur', 'admin'] },
  { icon: Activity, label: "Capteurs IoT", path: "/iot", roles: ['agriculteur', 'admin'] },
  { icon: Brain, label: "Intelligence IA", path: "/ia", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { icon: PawPrint, label: "Suivi animaux", path: "/betail", roles: ['veterinaire'] },
  { icon: Shield, label: "Administration", path: "/admin", roles: ['admin'] },
  { icon: Settings, label: "Paramètres", path: "/settings", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, roles, signOut } = useAuth();
  const { canAccessRoute } = useRoleAccess();
  const [menuOpen, setMenuOpen] = useState(false);

  // Filter nav items based on user roles
  const navItems = allNavItems.filter(item => 
    item.roles.some(role => roles.includes(role as any)) || roles.length === 0
  );

  // Filter menu items based on user roles (Settings is always visible for authenticated users)
  const menuItems = allMenuItems.filter(item =>
    item.roles.some(role => roles.includes(role as any)) || item.path === '/settings'
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      agriculteur: "Agriculteur",
      veterinaire: "Vétérinaire",
      acheteur: "Acheteur",
      investisseur: "Investisseur",
      admin: "Admin",
    };
    return labels[role] || role;
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-14 rounded-2xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
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
              )}>{item.label}</span>
            </button>
          );
        })}

        {/* Menu Button */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-14 rounded-2xl transition-all duration-200 text-muted-foreground hover:text-foreground">
              <div className="flex items-center justify-center w-10 h-8 rounded-xl">
                <Menu className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium mt-0.5">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl border-t border-border/50 px-4 pb-8">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
            
            {/* User Profile Section */}
            {user && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{profile?.full_name || "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {roles.map((role) => (
                        <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Menu Items */}
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
                    <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sign Out */}
            {user && (
              <Button 
                variant="ghost" 
                className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10 h-12 rounded-2xl"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
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
                Se connecter
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
