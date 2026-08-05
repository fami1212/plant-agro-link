import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MapPin, Sprout, TrendingUp, Handshake, ChevronDown } from "lucide-react";
import { RequestInvestmentDialog } from "./RequestInvestmentDialog";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";

interface FarmerCard {
  user_id: string;
  full_name: string;
  address: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  crops_count: number;
  opportunities: Array<{
    id: string;
    title: string;
    description: string | null;
    target_amount: number;
    current_amount: number | null;
    expected_return_percent: number | null;
    status: string;
  }>;
}

export function FarmerNetworkFeed() {
  const [farmers, setFarmers] = useState<FarmerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerCard | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<{ id?: string; amount?: number } | null>(null);

  const load = async () => {
    setLoading(true);
    // Annuaire public sécurisé des agriculteurs (contourne le RLS sur user_roles)
    const { data: directory } = await (supabase as any).rpc("get_farmer_directory");
    const rowsDir = (directory || []) as Array<{
      user_id: string;
      full_name: string;
      address: string | null;
      avatar_url: string | null;
      is_verified: boolean;
      crops_count: number;
    }>;
    const ids = rowsDir.map((r) => r.user_id);
    if (ids.length === 0) {
      setFarmers([]);
      setLoading(false);
      return;
    }
    const { data: opps } = await supabase
      .from("investment_opportunities")
      .select("id,farmer_id,title,description,target_amount,current_amount,expected_return_percent,status")
      .in("farmer_id", ids)
      .eq("status", "ouverte");
    const oppMap = new Map<string, any[]>();
    (opps || []).forEach((o: any) => {
      const arr = oppMap.get(o.farmer_id) || [];
      arr.push(o);
      oppMap.set(o.farmer_id, arr);
    });
    const rows: FarmerCard[] = rowsDir.map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name || "Utilisateur",
      address: p.address,
      avatar_url: p.avatar_url,
      is_verified: !!p.is_verified,
      crops_count: p.crops_count || 0,
      opportunities: oppMap.get(p.user_id) || [],
    }));
    // sort: verified first, then those with opportunities
    rows.sort((a, b) => {
      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
      return b.opportunities.length - a.opportunities.length;
    });
    setFarmers(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {farmers.length} agriculteur(s) — envoyez une demande via PlantErea qui négociera pour vous.
      </p>
      {farmers.map((f) => {
        const initials = f.full_name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        const isOpen = expanded[f.user_id];
        return (
          <Card key={f.user_id} className="p-3">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                {f.avatar_url && <AvatarImage src={f.avatar_url} alt={f.full_name} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{f.full_name}</p>
                  <VerifiedBadge verified={f.is_verified} />
                </div>
                {f.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {f.address}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Sprout className="w-3 h-3" /> {f.crops_count} culture(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {f.opportunities.length} opportunité(s)
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedFarmer(f);
                      setSelectedOpp(null);
                    }}
                  >
                    <Handshake className="w-4 h-4 mr-1" /> Demander à investir
                  </Button>
                  {f.opportunities.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpanded((e) => ({ ...e, [f.user_id]: !e[f.user_id] }))}
                    >
                      <ChevronDown
                        className={`w-4 h-4 mr-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                      Voir projets
                    </Button>
                  )}
                </div>

                {isOpen && f.opportunities.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {f.opportunities.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-md border border-border/50 p-2 bg-muted/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{o.title}</p>
                          {o.expected_return_percent && (
                            <Badge variant="secondary" className="text-xs">
                              +{o.expected_return_percent}%
                            </Badge>
                          )}
                        </div>
                        {o.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {o.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span>{o.target_amount.toLocaleString()} XOF</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedFarmer(f);
                              setSelectedOpp({ id: o.id, amount: o.target_amount });
                            }}
                          >
                            Investir ici
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {selectedFarmer && (
        <RequestInvestmentDialog
          open={!!selectedFarmer}
          onOpenChange={(o) => !o && setSelectedFarmer(null)}
          farmerId={selectedFarmer.user_id}
          farmerName={selectedFarmer.full_name}
          opportunityId={selectedOpp?.id}
          suggestedAmount={selectedOpp?.amount}
        />
      )}
    </div>
  );
}