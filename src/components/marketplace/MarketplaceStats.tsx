import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Eye, Package, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketplaceStatsProps {
  stats: {
    totalListings: number;
    activeListings: number;
    totalViews: number;
    totalOffers: number;
  };
}

export function MarketplaceStats({ stats }: MarketplaceStatsProps) {
  const items = [
    {
      label: "Annonces",
      value: stats.totalListings,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Actives",
      value: stats.activeListings,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Vues",
      value: stats.totalViews,
      icon: Eye,
      color: "text-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Offres",
      value: stats.totalOffers,
      icon: HandCoins,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.label}
            className={cn("animate-fade-in", `stagger-${index + 1}`)}
            style={{ opacity: 0 }}
          >
            <CardContent className="p-3 text-center">
              <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center", item.bg)}>
                <Icon className={cn("w-4 h-4", item.color)} />
              </div>
              <p className="font-bold text-lg">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
