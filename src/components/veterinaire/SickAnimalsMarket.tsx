import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Stethoscope,
  AlertCircle,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";

interface SickAnimal {
  id: string;
  identifier: string;
  species: string;
  breed: string | null;
  health_status: string;
  weight_kg: number | null;
  notes: string | null;
  user_id: string;
  owner_name: string;
  owner_phone: string | null;
  owner_address: string | null;
  owner_avatar: string | null;
  is_verified: boolean;
  last_symptom: string | null;
}

export function SickAnimalsMarket() {
  const { user } = useAuth();
  const [items, setItems] = useState<SickAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SickAnimal | null>(null);
  const [price, setPrice] = useState(15000);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: animals } = await supabase
      .from("livestock")
      .select("*")
      .in("health_status", ["malade", "traitement"]);
    const rows = animals || [];
    if (rows.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ownerIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const [{ data: profiles }, { data: kyc }, { data: lastVet }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id,full_name,phone,address,avatar_url")
        .in("user_id", ownerIds),
      supabase.from("kyc_verifications").select("user_id,status").in("user_id", ownerIds),
      supabase
        .from("veterinary_records")
        .select("livestock_id,description")
        .in(
          "livestock_id",
          rows.map((r) => r.id),
        )
        .order("recorded_at", { ascending: false }),
    ]);
    const pMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const kMap = new Map((kyc || []).map((k: any) => [k.user_id, k.status]));
    const lastMap = new Map<string, string>();
    (lastVet || []).forEach((r: any) => {
      if (!lastMap.has(r.livestock_id)) lastMap.set(r.livestock_id, r.description);
    });
    const enriched: SickAnimal[] = rows.map((a: any) => {
      const p = pMap.get(a.user_id) as any;
      return {
        id: a.id,
        identifier: a.identifier,
        species: a.species,
        breed: a.breed,
        health_status: a.health_status,
        weight_kg: a.weight_kg,
        notes: a.notes,
        user_id: a.user_id,
        owner_name: p?.full_name || "Agriculteur",
        owner_phone: p?.phone || null,
        owner_address: p?.address || null,
        owner_avatar: p?.avatar_url || null,
        is_verified: kMap.get(a.user_id) === "approved",
        last_symptom: lastMap.get(a.id) || null,
      };
    });
    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("vet-market-livestock")
      .on("postgres_changes", { event: "*", schema: "public", table: "livestock" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const proposeConsultation = async () => {
    if (!selected || !user) return;
    setSending(true);
    // Get vet's service_provider record
    const { data: provider } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!provider) {
      setSending(false);
      toast.error("Créez d'abord votre fiche prestataire dans votre cabinet.");
      return;
    }

    const { error } = await supabase.from("service_bookings").insert({
      provider_id: provider.id,
      client_id: selected.user_id,
      service_type: `Consultation urgente — ${selected.species} ${selected.identifier}`,
      description: message || `Proposition de consultation pour ${selected.identifier}`,
      scheduled_date: new Date().toISOString().split("T")[0],
      status: "en_attente",
      estimated_price: price,
    });
    // notify farmer
    await (supabase as any).from("notifications").insert({
      user_id: selected.user_id,
      type: "vet_proposal",
      title: "🩺 Un vétérinaire propose une consultation",
      message: `Pour ${selected.identifier} — ${price.toLocaleString()} XOF`,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Proposition envoyée à l'agriculteur");
    setSelected(null);
    setMessage("");
  };

  return (
    <>
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun animal signalé malade actuellement. 🎉
          </Card>
        ) : (
          items.map((a) => {
            const initials = a.owner_name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <Card key={a.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-11 h-11">
                    {a.owner_avatar && <AvatarImage src={a.owner_avatar} alt={a.owner_name} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{a.owner_name}</p>
                      <VerifiedBadge verified={a.is_verified} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      {a.owner_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {a.owner_address}
                        </span>
                      )}
                      {a.owner_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {a.owner_phone}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" /> {a.health_status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {a.species} · {a.identifier}
                      </Badge>
                      {a.breed && (
                        <Badge variant="secondary" className="text-xs">
                          {a.breed}
                        </Badge>
                      )}
                      {a.weight_kg && (
                        <Badge variant="secondary" className="text-xs">
                          {a.weight_kg} kg
                        </Badge>
                      )}
                    </div>
                    {(a.last_symptom || a.notes) && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {a.last_symptom || a.notes}
                      </p>
                    )}
                    <Button size="sm" className="mt-2" onClick={() => setSelected(a)}>
                      <Stethoscope className="w-4 h-4 mr-1" /> Proposer une consultation
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proposer une consultation</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <Card className="p-2 bg-muted/40 text-sm">
                <p className="font-medium">
                  {selected.owner_name} — {selected.species} {selected.identifier}
                </p>
                <p className="text-xs text-muted-foreground">
                  Statut : {selected.health_status}
                </p>
              </Card>
              <div>
                <label className="text-sm font-medium">Tarif proposé (XOF)</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message à l'agriculteur</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Diagnostic préliminaire, disponibilité, déplacement..."
                />
              </div>
              <Button className="w-full" onClick={proposeConsultation} disabled={sending}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Send className="w-4 h-4 mr-1" /> Envoyer la proposition</>)}
              </Button>
              <p className="text-xs text-muted-foreground">
                Une fois acceptée, une transaction sécurisée avec escrow sera créée
                automatiquement dans votre cabinet.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}