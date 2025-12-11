import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Store, Briefcase, TrendingUp } from "lucide-react";

interface MarketplaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function MarketplaceTabs({ activeTab, onTabChange, children }: MarketplaceTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-auto p-1">
        <TabsTrigger value="acheter" className="flex flex-col gap-1 py-2 text-xs">
          <ShoppingBag className="w-4 h-4" />
          <span>Acheter</span>
        </TabsTrigger>
        <TabsTrigger value="vendre" className="flex flex-col gap-1 py-2 text-xs">
          <Store className="w-4 h-4" />
          <span>Vendre</span>
        </TabsTrigger>
        <TabsTrigger value="services" className="flex flex-col gap-1 py-2 text-xs">
          <Briefcase className="w-4 h-4" />
          <span>Services</span>
        </TabsTrigger>
        <TabsTrigger value="offres" className="flex flex-col gap-1 py-2 text-xs">
          <TrendingUp className="w-4 h-4" />
          <span>Mes Offres</span>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
