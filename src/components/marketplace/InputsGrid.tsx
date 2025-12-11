import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ShoppingCart, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Input {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  supplier: string;
  location: string;
  available: boolean;
  image: string;
}

interface InputsGridProps {
  inputs: Input[];
  onContact: (input: Input) => void;
  onOrder: (input: Input) => void;
}

const categoryLabels: Record<string, string> = {
  engrais: "Engrais",
  semences: "Semences",
  materiel: "Matériel",
  irrigation: "Irrigation",
  phytosanitaire: "Phytosanitaire",
};

export function InputsGrid({ inputs, onContact, onOrder }: InputsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {inputs.map((input, index) => (
        <Card
          key={input.id}
          className={cn("animate-fade-in overflow-hidden", `stagger-${(index % 5) + 1}`)}
          style={{ opacity: 0 }}
        >
          <CardContent className="p-0">
            <div className="aspect-square bg-muted flex items-center justify-center text-4xl relative">
              {input.image}
              <Badge 
                className={cn(
                  "absolute top-2 left-2 text-[10px]",
                  input.available ? "bg-primary" : "bg-muted-foreground"
                )}
              >
                {input.available ? "Disponible" : "Indisponible"}
              </Badge>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-foreground text-sm line-clamp-1 mb-1">
                {input.name}
              </h3>
              <Badge variant="secondary" className="text-[10px] mb-2">
                {categoryLabels[input.category] || input.category}
              </Badge>
              
              <p className="text-xs text-muted-foreground mb-1">{input.supplier}</p>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <MapPin className="w-3 h-3" />
                <span>{input.location}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-primary text-sm">
                  {input.price.toLocaleString()} FCFA
                </span>
                <span className="text-xs text-muted-foreground">/{input.unit}</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 text-xs"
                  onClick={() => onContact(input)}
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Contact
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 text-xs"
                  onClick={() => onOrder(input)}
                  disabled={!input.available}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Commander
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
