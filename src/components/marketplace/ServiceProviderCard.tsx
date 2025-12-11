import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Phone, MessageCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceProviderCardProps {
  provider: {
    id: string;
    business_name: string;
    service_category: string;
    description?: string;
    location?: string;
    hourly_rate?: number;
    rating?: number;
    reviews_count?: number;
    is_verified?: boolean;
    phone?: string;
    whatsapp?: string;
    specializations?: string[];
  };
  onBook: () => void;
  onContact: (type: "call" | "whatsapp") => void;
  index?: number;
}

const categoryLabels: Record<string, string> = {
  veterinaire: "Vétérinaire",
  technicien_iot: "Technicien IoT",
  transporteur: "Transporteur",
  conseiller: "Conseiller agricole",
  cooperative: "Coopérative",
  autre: "Autre",
};

const categoryIcons: Record<string, string> = {
  veterinaire: "🩺",
  technicien_iot: "📡",
  transporteur: "🚛",
  conseiller: "👨‍🌾",
  cooperative: "🤝",
  autre: "💼",
};

export function ServiceProviderCard({ provider, onBook, onContact, index = 0 }: ServiceProviderCardProps) {
  const icon = categoryIcons[provider.service_category] || "💼";
  const label = categoryLabels[provider.service_category] || provider.service_category;

  return (
    <Card
      variant="interactive"
      className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
      style={{ opacity: 0 }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1">
                  {provider.business_name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                  {provider.is_verified && (
                    <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
              {provider.rating !== undefined && provider.rating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-warning fill-warning" />
                  <span className="font-medium">{provider.rating.toFixed(1)}</span>
                  {provider.reviews_count !== undefined && provider.reviews_count > 0 && (
                    <span className="text-muted-foreground text-xs">({provider.reviews_count})</span>
                  )}
                </div>
              )}
            </div>

            {provider.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {provider.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {provider.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{provider.location}</span>
                </div>
              )}
              {provider.hourly_rate && (
                <span className="font-medium text-primary">
                  {provider.hourly_rate.toLocaleString()} FCFA/h
                </span>
              )}
            </div>

            {provider.specializations && provider.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {provider.specializations.slice(0, 3).map((spec, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {spec}
                  </Badge>
                ))}
                {provider.specializations.length > 3 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{provider.specializations.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" onClick={onBook} className="flex-1">
                <Calendar className="w-4 h-4 mr-1" />
                Réserver
              </Button>
              {provider.phone && (
                <Button size="sm" variant="outline" onClick={() => onContact("call")}>
                  <Phone className="w-4 h-4" />
                </Button>
              )}
              {provider.whatsapp && (
                <Button size="sm" variant="outline" onClick={() => onContact("whatsapp")}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
