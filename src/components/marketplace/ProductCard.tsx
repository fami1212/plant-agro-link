import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Eye, Heart, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProductCardProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    price?: number;
    price_negotiable?: boolean;
    quantity?: string;
    location?: string;
    category?: string;
    status: string;
    views_count?: number;
    is_verified?: boolean;
    created_at: string;
    listing_type: string;
    crop_id?: string;
    harvest_record_id?: string;
  };
  onClick: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  index?: number;
}

const categoryEmojis: Record<string, string> = {
  "Céréales": "🌾",
  "Légumes": "🥬",
  "Fruits": "🍎",
  "Légumineuses": "🫘",
  "Bétail": "🐄",
  "Volaille": "🐔",
  "Lait": "🥛",
  "Oeufs": "🥚",
  "default": "📦"
};

export function ProductCard({ listing, onClick, onFavorite, isFavorite, index = 0 }: ProductCardProps) {
  const emoji = categoryEmojis[listing.category || ""] || categoryEmojis.default;
  
  const statusColors: Record<string, string> = {
    publie: "bg-primary/10 text-primary",
    consulte: "bg-blue-500/10 text-blue-600",
    negociation: "bg-warning/10 text-warning",
    reserve: "bg-orange-500/10 text-orange-600",
    vendu: "bg-muted text-muted-foreground",
  };

  const statusLabels: Record<string, string> = {
    publie: "Disponible",
    consulte: "Consulté",
    negociation: "En négociation",
    reserve: "Réservé",
    vendu: "Vendu",
  };

  return (
    <Card
      variant="interactive"
      className={cn("animate-fade-in overflow-hidden", `stagger-${(index % 5) + 1}`)}
      style={{ opacity: 0 }}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="aspect-square bg-muted flex items-center justify-center text-5xl relative">
          {emoji}
          {listing.is_verified && (
            <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          {onFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onFavorite(); }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <Heart className={cn("w-4 h-4", isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground")} />
            </button>
          )}
          {listing.harvest_record_id && (
            <Badge className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground text-[10px]">
              Traçabilité
            </Badge>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-semibold text-foreground text-sm line-clamp-1">
              {listing.title}
            </h3>
            <Badge className={cn("text-[10px] shrink-0", statusColors[listing.status])}>
              {statusLabels[listing.status] || listing.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {listing.location && (
              <>
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{listing.location}</span>
              </>
            )}
            {listing.views_count !== undefined && listing.views_count > 0 && (
              <>
                <span className="mx-1">•</span>
                <Eye className="w-3 h-3" />
                <span>{listing.views_count}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              {listing.price ? (
                <span className="font-bold text-primary text-sm">
                  {listing.price.toLocaleString()} FCFA
                  {listing.price_negotiable && <span className="text-xs text-muted-foreground ml-1">(nég.)</span>}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Prix sur demande</span>
              )}
            </div>
            {listing.quantity && (
              <Badge variant="secondary" className="text-xs">
                {listing.quantity}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
