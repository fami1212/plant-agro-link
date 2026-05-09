import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import {
  ScrollableTabs,
  ScrollableTabsList,
  ScrollableTabsTrigger,
} from "@/components/ui/scrollable-tabs";
import { cn } from "@/lib/utils";

export interface HubTabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface HubTabsProps {
  items: HubTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Unified tab pattern used across role hubs (Vétérinaire, Acheteur, Investisseur, Agriculteur).
 * Wrap with <TabsContent value="..."> children.
 */
export function HubTabs({ items, value, onValueChange, children, className }: HubTabsProps) {
  return (
    <ScrollableTabs value={value} onValueChange={onValueChange} className={className}>
      <ScrollableTabsList className="mb-4 bg-muted/40 p-1 rounded-xl">
        {items.map(({ value: v, label, icon: Icon }) => (
          <ScrollableTabsTrigger
            key={v}
            value={v}
            className={cn(
              "flex items-center gap-2 rounded-lg",
              "data-[state=active]:bg-background"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </ScrollableTabsTrigger>
        ))}
      </ScrollableTabsList>
      {children}
    </ScrollableTabs>
  );
}