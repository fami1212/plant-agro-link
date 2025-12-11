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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// All possible navigation items
const allNavItems = [
  { icon: Home, label: "Accueil", path: "/dashboard", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
  { icon: MapPin, label: "Parcelles", path: "/parcelles", roles: ['agriculteur', 'admin'] },
  { icon: Wheat, label: "Cultures", path: "/cultures", roles: ['agriculteur', 'admin'] },
  { icon: PawPrint, label: "Bétail", path: "/betail", roles: ['agriculteur', 'veterinaire', 'admin'] },
  { icon: TrendingUp, label: "Investir", path: "/investisseur", roles: ['investisseur', 'admin'] },
  { icon: ShoppingBag, label: "Marché", path: "/marketplace", roles: ['agriculteur', 'veterinaire', 'acheteur', 'investisseur', 'admin'] },
];

// All possible menu items
const allMenuItems = [
  { icon: Activity, label: "Capteurs IoT", path: "/iot", roles: ['agriculteur', 'admin'] },
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
      admin: "Administrateur",
    };
    return labels[role] || role;
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all",
                isActive && "bg-primary/10"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </button>
          );
        })}
        {/* Menu Button */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground">
              <div className="p-1.5 rounded-lg">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium mt-0.5">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            {/* User Profile Section */}
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{profile?.full_name || "Utilisateur"}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  {roles.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {roles.map((role) => (
                        <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator className="my-2" />

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <Separator className="my-2" />

            {/* Sign Out */}
            {user && (
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Déconnexion
              </Button>
            )}

            {!user && (
              <Button 
                className="w-full"
                onClick={() => {
                  navigate("/auth");
                  setMenuOpen(false);
                }}
              >
                <User className="w-5 h-5 mr-2" />
                Se connecter
              </Button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}