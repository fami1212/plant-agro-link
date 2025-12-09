import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldForm } from "@/components/fields/FieldForm";
import { Plus, MapPin, Droplets, Thermometer, Leaf, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SoilType = 'argileux' | 'sableux' | 'limoneux' | 'calcaire' | 'humifere' | 'mixte';
type FieldStatus = 'active' | 'en_jachère' | 'en_préparation' | 'inactive';

interface Field {
  id: string;
  name: string;
  description: string | null;
  area_hectares: number;
  soil_type: SoilType;
  irrigation_system: string | null;
  status: FieldStatus;
  location_gps: string | null;
  created_at: string;
}

const soilTypeLabels: Record<SoilType, string> = {
  argileux: 'Argileux',
  sableux: 'Sableux',
  limoneux: 'Limoneux',
  calcaire: 'Calcaire',
  humifere: 'Humifère',
  mixte: 'Mixte',
};

const statusColors: Record<FieldStatus, string> = {
  active: 'bg-success/15 text-success',
  'en_jachère': 'bg-warning/15 text-warning',
  'en_préparation': 'bg-primary/15 text-primary',
  inactive: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<FieldStatus, string> = {
  active: 'Active',
  'en_jachère': 'En jachère',
  'en_préparation': 'En préparation',
  inactive: 'Inactive',
};

export default function Parcelles() {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchFields = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFields((data || []) as Field[]);
    } catch (error: any) {
      console.error('Error fetching fields:', error);
      toast.error("Erreur lors du chargement des parcelles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [user]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchFields();
  };

  const totalArea = fields.reduce((sum, f) => sum + Number(f.area_hectares), 0);

  return (
    <AppLayout>
      <PageHeader
        title="Mes Parcelles"
        subtitle={`${fields.length} parcelle${fields.length !== 1 ? 's' : ''} • ${totalArea.toFixed(1)} ha total`}
        action={
          !showForm && (
            <Button variant="hero" size="icon" onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5" />
            </Button>
          )
        }
      />

      <div className="px-4 space-y-3 pb-24">
        {/* Form */}
        {showForm && (
          <FieldForm
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Fields List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} variant="elevated" className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-24 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : fields.length === 0 && !showForm ? (
          <EmptyState
            icon={<MapPin className="w-12 h-12" />}
            title="Aucune parcelle"
            description="Commencez par ajouter votre première parcelle pour suivre vos cultures et capteurs IoT."
            action={{
              label: "Ajouter une parcelle",
              onClick: () => setShowForm(true)
            }}
          />
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <Card
                key={field.id}
                variant="interactive"
                className={cn("animate-fade-in cursor-pointer", `stagger-${index + 1}`)}
                style={{ opacity: 0 }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{field.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {soilTypeLabels[field.soil_type]} • {field.area_hectares} ha
                        </p>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {field.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {field.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">--</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-accent" />
                      <span className="text-sm text-muted-foreground">--</span>
                    </div>
                    {field.irrigation_system && (
                      <div className="flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-success" />
                        <span className="text-xs text-muted-foreground">{field.irrigation_system}</span>
                      </div>
                    )}
                    <div className="flex-1" />
                    <Badge className={statusColors[field.status]}>
                      {statusLabels[field.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
