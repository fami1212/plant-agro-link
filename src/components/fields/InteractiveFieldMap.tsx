import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ZoomIn, ZoomOut, Maximize2, Layers, Eye, Droplets, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

interface Field {
  id: string;
  name: string;
  area_hectares: number;
  soil_type: string;
  irrigation_system: string | null;
  status: string | null;
  location_gps?: { x: number; y: number } | null;
  crops_count?: number;
}

interface InteractiveFieldMapProps {
  fields: Field[];
  onFieldClick?: (field: Field) => void;
  selectedFieldId?: string;
  compact?: boolean;
}

const statusColors: Record<string, string> = {
  active: "fill-success/30 stroke-success",
  en_jachère: "fill-warning/30 stroke-warning",
  en_préparation: "fill-primary/30 stroke-primary",
  inactive: "fill-muted stroke-muted-foreground",
};

const soilTypeColors: Record<string, string> = {
  argileux: "#8B4513",
  sableux: "#F4D03F",
  limoneux: "#7B7D7D",
  calcaire: "#D5D8DC",
  humifere: "#2C3E50",
  mixte: "#95A5A6",
};

export function InteractiveFieldMap({ 
  fields, 
  onFieldClick, 
  selectedFieldId,
  compact = false 
}: InteractiveFieldMapProps) {
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [mapView, setMapView] = useState<"status" | "soil" | "irrigation">("status");

  // Calculate positions for fields (simulated layout based on area)
  const getFieldPosition = (field: Field, index: number) => {
    // If GPS coordinates exist, use them
    if (field.location_gps && field.location_gps.x && field.location_gps.y) {
      return { x: field.location_gps.x % 100, y: field.location_gps.y % 100 };
    }
    
    // Otherwise create a grid layout
    const cols = Math.ceil(Math.sqrt(fields.length));
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { 
      x: 10 + (col * 80 / cols),
      y: 10 + (row * 80 / cols)
    };
  };

  const getFieldSize = (field: Field) => {
    // Size based on area, min 15, max 40
    const baseSize = Math.min(40, Math.max(15, Math.sqrt(field.area_hectares) * 10));
    return baseSize * zoom;
  };

  const getFieldColor = (field: Field) => {
    if (mapView === "status") {
      return statusColors[field.status || "active"];
    }
    if (mapView === "soil") {
      return `fill-[${soilTypeColors[field.soil_type]}]/30 stroke-[${soilTypeColors[field.soil_type]}]`;
    }
    if (mapView === "irrigation") {
      return field.irrigation_system && field.irrigation_system !== "Aucun"
        ? "fill-primary/30 stroke-primary"
        : "fill-muted stroke-muted-foreground";
    }
    return statusColors[field.status || "active"];
  };

  if (fields.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Ajoutez des parcelles pour voir la carte
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", compact && "border-0 shadow-none bg-transparent")}>
      <CardContent className={cn("p-0", compact && "p-0")}>
        {/* Map Controls */}
        {!compact && (
          <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowLabels(!showLabels)}
              >
                <Eye className={cn("w-4 h-4", !showLabels && "opacity-50")} />
              </Button>
            </div>
            
            <div className="flex gap-1">
              <Button
                variant={mapView === "status" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMapView("status")}
              >
                <Layers className="w-3 h-3 mr-1" />
                Statut
              </Button>
              <Button
                variant={mapView === "soil" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMapView("soil")}
              >
                Sol
              </Button>
              <Button
                variant={mapView === "irrigation" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setMapView("irrigation")}
              >
                <Droplets className="w-3 h-3 mr-1" />
                Irrigation
              </Button>
            </div>
          </div>
        )}

        {/* Map Area */}
        <div 
          className={cn(
            "relative bg-gradient-to-br from-success/5 to-success/10 overflow-hidden",
            compact ? "h-40" : "h-64"
          )}
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
            `
          }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Field Polygons */}
          <svg className="absolute inset-0 w-full h-full">
            {fields.map((field, index) => {
              const pos = getFieldPosition(field, index);
              const size = getFieldSize(field);
              const isSelected = selectedFieldId === field.id;
              
              return (
                <g 
                  key={field.id} 
                  className="cursor-pointer transition-all duration-200 hover:opacity-80"
                  onClick={() => onFieldClick?.(field)}
                >
                  {/* Field shape - irregular polygon */}
                  <polygon
                    points={`
                      ${pos.x}%,${pos.y + size * 0.1}%
                      ${pos.x + size * 0.3}%,${pos.y}%
                      ${pos.x + size * 0.7}%,${pos.y + size * 0.15}%
                      ${pos.x + size * 0.9}%,${pos.y + size * 0.5}%
                      ${pos.x + size * 0.8}%,${pos.y + size * 0.85}%
                      ${pos.x + size * 0.4}%,${pos.y + size}%
                      ${pos.x + size * 0.1}%,${pos.y + size * 0.7}%
                    `}
                    className={cn(
                      "transition-all duration-200",
                      mapView === "status" && (field.status === "active" ? "fill-success/30 stroke-success" : 
                        field.status === "en_jachère" ? "fill-warning/30 stroke-warning" :
                        field.status === "en_préparation" ? "fill-primary/30 stroke-primary" :
                        "fill-muted stroke-muted-foreground"),
                      mapView === "irrigation" && (field.irrigation_system && field.irrigation_system !== "Aucun"
                        ? "fill-primary/40 stroke-primary"
                        : "fill-amber-500/20 stroke-amber-500"),
                      mapView === "soil" && "fill-amber-700/20 stroke-amber-700",
                      isSelected && "stroke-2 stroke-primary fill-primary/40"
                    )}
                    strokeWidth={isSelected ? 3 : 1.5}
                  />
                  
                  {/* Field label */}
                  {showLabels && (
                    <text
                      x={`${pos.x + size * 0.45}%`}
                      y={`${pos.y + size * 0.5}%`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground text-[10px] font-medium pointer-events-none"
                    >
                      {field.name.substring(0, 8)}
                    </text>
                  )}
                  
                  {/* Irrigation indicator */}
                  {field.irrigation_system && field.irrigation_system !== "Aucun" && (
                    <circle
                      cx={`${pos.x + size * 0.8}%`}
                      cy={`${pos.y + size * 0.2}%`}
                      r="4"
                      className="fill-primary stroke-white"
                      strokeWidth="1"
                    />
                  )}
                  
                  {/* Crops indicator */}
                  {(field.crops_count || 0) > 0 && (
                    <circle
                      cx={`${pos.x + size * 0.2}%`}
                      cy={`${pos.y + size * 0.2}%`}
                      r="4"
                      className="fill-accent stroke-white"
                      strokeWidth="1"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          {!compact && (
            <div className="absolute bottom-2 left-2 flex gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs">
                <div className="w-3 h-3 rounded-full bg-success/50 border border-success" />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs">
                <div className="w-3 h-3 rounded-full bg-primary/50 border border-primary" />
                <span>Irrigué</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs">
                <div className="w-3 h-3 rounded-full bg-accent/50 border border-accent" />
                <span>Cultivé</span>
              </div>
            </div>
          )}

          {/* Total area indicator */}
          <div className="absolute top-2 right-2 px-2 py-1 rounded bg-background/80 backdrop-blur text-xs font-medium">
            {fields.reduce((sum, f) => sum + f.area_hectares, 0).toFixed(1)} ha total
          </div>
        </div>

        {/* Field List (compact view) */}
        {compact && fields.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2 -mx-2 px-2">
            {fields.slice(0, 4).map((field) => (
              <button
                key={field.id}
                onClick={() => onFieldClick?.(field)}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-lg border text-left transition-colors",
                  selectedFieldId === field.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <p className="text-xs font-medium truncate max-w-[80px]">{field.name}</p>
                <p className="text-[10px] text-muted-foreground">{field.area_hectares} ha</p>
              </button>
            ))}
            {fields.length > 4 && (
              <div className="flex-shrink-0 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">+{fields.length - 4}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
