import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, CheckCircle2, XCircle, Eye, UserCheck, UserX, Star, MapPin, Phone,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import type { Database } from "@/integrations/supabase/types";

type ServiceProvider = Database["public"]["Tables"]["service_providers"]["Row"];

const categoryLabels: Record<string, string> = {
  veterinaire: "Vétérinaire",
  transport: "Transport",
  labour: "Labour",
  semences: "Semences",
  phytosanitaire: "Phytosanitaire",
  conseil: "Conseil agricole",
  location_materiel: "Location matériel",
  transformation: "Transformation",
  assurance: "Assurance",
};

export function AdminServiceProviders() {
  const [providers, setProviders] = useState<(ServiceProvider & { owner_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(ServiceProvider & { owner_name?: string }) | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_providers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      setProviders((data || []).map(p => ({ ...p, owner_name: map.get(p.user_id) || "Inconnu" })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerify = async (id: string, verify: boolean) => {
    const { error } = await supabase
      .from("service_providers")
      .update({ is_verified: verify })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(verify ? "Prestataire vérifié" : "Vérification retirée");
    fetchProviders();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, is_verified: verify } : null);
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("service_providers")
      .update({ is_active: active })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(active ? "Prestataire activé" : "Prestataire désactivé");
    fetchProviders();
  };

  const filtered = providers.filter(p =>
    p.business_name.toLowerCase().includes(search.toLowerCase()) ||
    p.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.service_category.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un prestataire..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Card className="p-2"><p className="text-lg font-bold">{providers.length}</p><p className="text-muted-foreground">Total</p></Card>
        <Card className="p-2"><p className="text-lg font-bold text-success">{providers.filter(p => p.is_verified).length}</p><p className="text-muted-foreground">Vérifiés</p></Card>
        <Card className="p-2"><p className="text-lg font-bold text-warning">{providers.filter(p => !p.is_verified).length}</p><p className="text-muted-foreground">En attente</p></Card>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<UserCheck className="w-8 h-8" />} title="Aucun prestataire" description="Aucun prestataire trouvé" />
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{p.business_name}</p>
                      {p.is_verified ? (
                        <Badge className="bg-success/10 text-success text-[10px]">Vérifié</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Non vérifié</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.owner_name} • {categoryLabels[p.service_category] || p.service_category}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {p.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.location}</span>}
                      {p.rating && <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-warning" />{p.rating}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(p)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleVerify(p.id, !p.is_verified)}>
                      {p.is_verified ? <XCircle className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du prestataire</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold text-lg">{selected.business_name}</p>
                <p className="text-sm text-muted-foreground">{categoryLabels[selected.service_category] || selected.service_category}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={selected.is_verified ? "bg-success" : "bg-warning"}>{selected.is_verified ? "Vérifié" : "Non vérifié"}</Badge>
                  <Badge variant={selected.is_active ? "default" : "secondary"}>{selected.is_active ? "Actif" : "Inactif"}</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Propriétaire:</span> {selected.owner_name}</p>
                {selected.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{selected.phone}</p>}
                {selected.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{selected.location}</p>}
                {selected.hourly_rate && <p><span className="text-muted-foreground">Tarif:</span> {selected.hourly_rate.toLocaleString()} F/h</p>}
                {selected.description && <p className="text-muted-foreground">{selected.description}</p>}
                {selected.specializations && selected.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.specializations.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant={selected.is_verified ? "destructive" : "default"} onClick={() => toggleVerify(selected.id, !selected.is_verified)}>
                  {selected.is_verified ? <><XCircle className="w-4 h-4 mr-1" />Retirer vérification</> : <><CheckCircle2 className="w-4 h-4 mr-1" />Vérifier</>}
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => toggleActive(selected.id, !selected.is_active)}>
                  {selected.is_active ? "Désactiver" : "Activer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
