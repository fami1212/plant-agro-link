import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Store, Briefcase, TrendingUp, HandCoins, Eye } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ReactNode } from "react";

interface MarketplaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

interface TabConfig {
  value: string;
  label: string;
  icon: typeof ShoppingBag;
}

export function MarketplaceTabs({ activeTab, onTabChange, children }: MarketplaceTabsProps) {
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();

  // Define tabs based on user role
  const getTabs = (): TabConfig[] => {
    if (isInvestisseur && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Produits", icon: ShoppingBag },
        { value: "investir", label: "Opportunités", icon: TrendingUp },
        { value: "offres", label: "Mes Offres", icon: HandCoins },
      ];
    }
    
    if (isAcheteur && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Acheter", icon: ShoppingBag },
        { value: "services", label: "Services", icon: Briefcase },
        { value: "offres", label: "Mes Offres", icon: HandCoins },
      ];
    }
    
    if (isVeterinaire && !isAgriculteur && !isAdmin) {
      return [
        { value: "acheter", label: "Produits", icon: ShoppingBag },
        { value: "mes-services", label: "Mes Services", icon: Briefcase },
        { value: "reservations", label: "Réservations", icon: Eye },
      ];
    }
    
    // Farmers and Admins see all tabs
    return [
      { value: "acheter", label: "Acheter", icon: ShoppingBag },
      { value: "vendre", label: "Vendre", icon: Store },
      { value: "services", label: "Services", icon: Briefcase },
      { value: "offres", label: "Mes Offres", icon: TrendingUp },
    ];
  };

  const tabs = getTabs();
  const gridCols = tabs.length === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className={`grid w-full ${gridCols} h-auto p-1`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className="flex flex-col gap-1 py-2 text-xs"
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {children}
    </Tabs>
  );
}

export function useMarketplaceTabs() {
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();
  
  const canSell = isAgriculteur || isAdmin;
  const canInvest = isInvestisseur || isAdmin;
  const canProvideServices = isVeterinaire || isAdmin;
  const canBrowseProducts = true; // Everyone can browse
  
  return { canSell, canInvest, canProvideServices, canBrowseProducts };
}
