import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VetProvider {
  id: string;
  user_id: string;
  business_name: string;
  description: string | null;
  service_category: string;
  specializations: string[] | null;
  location: string | null;
  hourly_rate: number | null;
  rating: number | null;
  reviews_count: number | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  phone: string | null;
  whatsapp: string | null;
}

interface VetServiceCardProps {
  provider: VetProvider;
  onBook: () => void;
  onContact: (type: "call" | "whatsapp") => void;
  index?: number;
}

const speciesEmojis: Record<string, string> = {
  "Bovins": "🐄",
  "Ovins": "🐑",
  "Caprins": "🐐",
  "Volailles": "🐔",
  "Équins": "🐴",
  "Chirurgie": "🏥",
  "Vaccinations": "💉",
};

export function VetServiceCard({ provider, onBook, onContact, index = 0 }: VetServiceCardProps) {
  return (
    <Card
      className={cn(
        "animate-fade-in overflow-hidden",
        `stagger-${(index % 5) + 1}`
      )}
      style={{ opacity: 0 }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{provider.business_name}</h3>
              {provider.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {provider.location}
                </p>
              )}
            </div>
          </div>
          {provider.is_verified && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Vérifié
            </Badge>
          )}
        </div>

        {/* Description */}
        {provider.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {provider.description}
          </p>
        )}

        {/* Specializations */}
        {provider.specializations && provider.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {provider.specializations.slice(0, 5).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {speciesEmojis[spec] || "🏥"} {spec}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4">
          {provider.rating !== null && provider.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="font-medium">{provider.rating.toFixed(1)}</span>
              {provider.reviews_count !== null && provider.reviews_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({provider.reviews_count})
                </span>
              )}
            </div>
          )}
          {provider.hourly_rate && (
            <div className="text-sm">
              <span className="font-semibold text-primary">
                {provider.hourly_rate.toLocaleString()} FCFA
              </span>
              <span className="text-muted-foreground">/consultation</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onBook}>
            <Calendar className="w-4 h-4 mr-2" />
            Réserver
          </Button>
          {provider.phone && (
            <>
              <Button variant="outline" size="icon" onClick={() => onContact("call")}>
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => onContact("whatsapp")}>
                <MessageCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
