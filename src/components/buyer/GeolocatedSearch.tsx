import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface GeolocatedSearchProps {
  onFilterChange: (filters: GeoFilters) => void;
}

export interface GeoFilters {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  sortBy: "distance" | "price" | "recent";
  region: string;
}

const REGIONS = [
  "Toutes", "Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor",
  "Tambacounda", "Kolda", "Matam", "Fatick", "Louga", "Diourbel",
  "Kaffrine", "Kédougou", "Sédhiou",
];

export function GeolocatedSearch({ onFilterChange }: GeolocatedSearchProps) {
  const [locating, setLocating] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [sortBy, setSortBy] = useState<"distance" | "price" | "recent">("recent");
  const [region, setRegion] = useState("Toutes");
  const [expanded, setExpanded] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(coords);
        setLocating(false);
        toast.success("Position détectée");
        onFilterChange({
          latitude: coords.lat,
          longitude: coords.lng,
          radiusKm,
          sortBy: "distance",
          region,
        });
        setSortBy("distance");
      },
      () => {
        setLocating(false);
        toast.error("Impossible d'obtenir votre position");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    onFilterChange({
      latitude: position?.lat || null,
      longitude: position?.lng || null,
      radiusKm,
      sortBy,
      region,
    });
  }, [radiusKm, sortBy, region]);

  const clearLocation = () => {
    setPosition(null);
    setSortBy("recent");
    onFilterChange({ latitude: null, longitude: null, radiusKm, sortBy: "recent", region });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={position ? "default" : "outline"}
          size="sm"
          onClick={position ? clearLocation : requestLocation}
          disabled={locating}
          className="gap-1.5"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : position ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <Navigation className="w-3.5 h-3.5" />
          )}
          {position ? "Désactiver GPS" : "Ma position"}
        </Button>

        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-xs"
        >
          {expanded ? "Moins" : "Filtres"}
        </Button>
      </div>

      {expanded && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-3 animate-fade-in">
          {position && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Rayon de recherche</span>
                <span className="font-medium">{radiusKm} km</span>
              </div>
              <Slider
                value={[radiusKm]}
                onValueChange={([v]) => setRadiusKm(v)}
                min={5}
                max={200}
                step={5}
              />
            </div>
          )}

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Trier par</span>
            <div className="flex gap-1.5">
              {[
                { value: "recent" as const, label: "Récent" },
                { value: "price" as const, label: "Prix" },
                { value: "distance" as const, label: "Proximité", disabled: !position },
              ].map(({ value, label, disabled }) => (
                <Badge
                  key={value}
                  variant={sortBy === value ? "default" : "outline"}
                  className={`cursor-pointer text-xs ${disabled ? "opacity-40 pointer-events-none" : ""}`}
                  onClick={() => !disabled && setSortBy(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Haversine distance calculation
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
