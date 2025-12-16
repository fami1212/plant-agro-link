import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Layers, Maximize2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Field {
  id: string;
  name: string;
  area_hectares: number;
  soil_type: string;
  status: string;
  location_gps: unknown;
}

export function ParcelMap() {
  const { data: fields, isLoading } = useQuery({
    queryKey: ['fields-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*');
      
      if (error) throw error;
      return data as Field[];
    },
  });

  const getSoilColor = (soilType: string) => {
    const colors: Record<string, string> = {
      'argileux': 'bg-amber-600',
      'sableux': 'bg-yellow-400',
      'limoneux': 'bg-amber-800',
      'calcaire': 'bg-gray-300',
      'humifere': 'bg-emerald-900',
      'mixte': 'bg-amber-500',
    };
    return colors[soilType] || 'bg-gray-400';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'border-green-500';
      case 'en_jachère': return 'border-yellow-500';
      case 'en_préparation': return 'border-blue-500';
      case 'inactive': return 'border-gray-500';
      default: return 'border-gray-300';
    }
  };

  const totalArea = fields?.reduce((sum, f) => sum + (f.area_hectares || 0), 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Carte des parcelles
          </span>
          <Badge variant="secondary">{fields?.length || 0} parcelles</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Map placeholder - will be replaced with Mapbox when token is provided */}
        <div className="relative bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-lg overflow-hidden aspect-video mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Layers className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                Carte interactive
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Ajoutez un token Mapbox pour activer
              </p>
            </div>
          </div>

          {/* Visual representation of fields */}
          <div className="absolute bottom-2 left-2 right-2 flex gap-1 flex-wrap">
            {fields?.slice(0, 6).map((field, index) => (
              <div
                key={field.id}
                className={`${getSoilColor(field.soil_type)} border-2 ${getStatusColor(field.status)} rounded px-2 py-1 text-xs text-white font-medium shadow-sm`}
                style={{
                  width: `${Math.min(Math.max(field.area_hectares * 15, 40), 100)}px`,
                }}
              >
                {field.name?.substring(0, 8)}
              </div>
            ))}
            {fields && fields.length > 6 && (
              <div className="bg-black/50 rounded px-2 py-1 text-xs text-white">
                +{fields.length - 6}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold text-primary">{totalArea.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">hectares total</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold text-green-600">
              {fields?.filter(f => f.status === 'active').length || 0}
            </p>
            <p className="text-xs text-muted-foreground">actives</p>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <p className="text-lg font-bold text-yellow-600">
              {fields?.filter(f => f.status === 'en_jachère').length || 0}
            </p>
            <p className="text-xs text-muted-foreground">jachère</p>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Types de sol</p>
          <div className="flex flex-wrap gap-2">
            {['argileux', 'sableux', 'limoneux', 'humifere', 'mixte'].map(soil => (
              <div key={soil} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${getSoilColor(soil)}`} />
                <span className="text-xs capitalize">{soil}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Parcels list */}
        {fields && fields.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Vos parcelles</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {fields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getSoilColor(field.soil_type)}`} />
                    <span>{field.name}</span>
                  </div>
                  <span className="text-muted-foreground">{field.area_hectares} ha</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" className="w-full mt-4" disabled>
          <Maximize2 className="w-4 h-4 mr-2" />
          Voir en plein écran
        </Button>
      </CardContent>
    </Card>
  );
}
