import { cn } from "@/lib/utils";
import { Tractor, Stethoscope, ShoppingCart, TrendingUp } from "lucide-react";

type AppRole = 'agriculteur' | 'veterinaire' | 'acheteur' | 'investisseur' | 'admin';

interface RoleSelectorProps {
  value: AppRole;
  onChange: (role: AppRole) => void;
}

const roles: { value: AppRole; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'agriculteur', label: 'Agriculteur', icon: Tractor, description: 'Gérer parcelles et cultures' },
  { value: 'veterinaire', label: 'Vétérinaire', icon: Stethoscope, description: 'Soins animaux' },
  { value: 'acheteur', label: 'Acheteur', icon: ShoppingCart, description: 'Acheter des produits' },
  { value: 'investisseur', label: 'Investisseur', icon: TrendingUp, description: 'Financer des cultures' },
];

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map((role) => {
        const Icon = role.icon;
        const isSelected = value === role.value;
        
        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center",
              isSelected
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className={cn(
                "font-semibold text-sm",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {role.label}
              </p>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}