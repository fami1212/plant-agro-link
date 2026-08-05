import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TabsContent } from "@/components/ui/tabs";
import { HubTabs } from "@/components/common/HubTabs";
import { Input } from "@/components/ui/input";
import {
  TrendingUp, Wallet, ArrowUpRight, Sprout, Loader2, RefreshCw,
  Activity, Target, PieChart, Search, BarChart3, Users, FileText,
  MapPin, Calendar, Percent,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { InvestmentIoTMonitor } from "@/components/investor/InvestmentIoTMonitor";
import { InvestorReturns } from "@/components/investor/InvestorReturns";
import { PortfolioCard } from "@/components/investor/PortfolioCard";
import { FarmerNetworkFeed } from "@/components/investor/FarmerNetworkFeed";
import { RequestInvestmentDialog } from "@/components/investor/RequestInvestmentDialog";
import { MyContractsList } from "@/components/contracts/MyContractsList";
import {
  InvestmentDetailSheet, type InvestmentDetail,
} from "@/components/investor/InvestmentDetailSheet";

interface Opportunity {
  id: string;
  farmer_id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  expected_return_percent: number;
  risk_level: string;
  status: string;
  expected_harvest_date: string | null;
  location: string | null;
  farmer_name?: string;
}

const riskStyles: Record<string, string> = {
  faible: "bg-success/10 text-success border-success/30",
  moyen: "bg-warning/10 text-warning border-warning/30",
  eleve: "bg-destructive/10 text-destructive border-destructive/30",
};

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

/** Hub investisseur unifié : réseau, opportunités, portefeuille, contrats, suivi. */
export default function Investisseur() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [investments, setInvestments] = useState<InvestmentDetail[]>([]);
  const [pendingContracts, setPendingContracts] = useState<
    Array<{ id: string; transaction_id: string; farmer_name: string; amount: number }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [detail, setDetail] = useState<InvestmentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [{ data: opps }, { data: invs }, { data: reqs }] = await Promise.all([
        supabase
          .from("investment_opportunities")
          .select("*")
          .eq("status", "ouverte")
          .order("created_at", { ascending: false }),
        supabase
          .from("investments")
          .select("*")
          .eq("investor_id", user.id)
          .order("investment_date", { ascending: false }),
        (supabase as any)
          .from("investment_requests")
          .select("id, transaction_id, farmer_id, amount")
          .eq("investor_id", user.id)
          .eq("status", "contract_created")
          .not("transaction_id", "is", null),
      ]);

      const ids = Array.from(
        new Set([
          ...(opps || []).map((o: any) => o.farmer_id),
          ...(invs || []).map((i: any) => i.farmer_id),
          ...((reqs as any[]) || []).map((r) => r.farmer_id),
        ]),
      );
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
        : { data: [] as any[] };
      const nameOf = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      setOpportunities(
        (opps || []).map((o: any) => ({
          ...o,
          expected_return_percent: o.expected_return_percent || 15,
          risk_level: o.risk_level || "moyen",
          current_amount: o.current_amount || 0,
          farmer_name: nameOf.get(o.farmer_id) || "Agriculteur",
        })),
      );
      setInvestments(
        (invs || []).map((i: any) => ({
          ...i,
          expected_return_percent: i.expected_return_percent || 15,
          farmer_name: nameOf.get(i.farmer_id) || "Agriculteur",
        })),
      );
      setPendingContracts(
        ((reqs as any[]) || []).map((r) => ({
          id: r.id,
          transaction_id: r.transaction_id,
          farmer_name: nameOf.get(r.farmer_id) || "Agriculteur",
          amount: r.amount,
        })),
      );
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalInvested = investments.reduce((s, i) => s + i.amount_invested, 0);
  const expectedReturns = investments.reduce(
    (s, i) => s + i.amount_invested * (1 + i.expected_return_percent / 100),
    0,
  );
  const potentialGain = expectedReturns - totalInvested;
  const activeCount = investments.filter(
    (i) => i.status === "en_cours" || i.status === "actif",
  ).length;

  const filtered = opportunities.filter((o) =>
    `${o.title} ${o.farmer_name} ${o.location}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const openDetail = (inv: InvestmentDetail) => {
    setDetail(inv);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Espace investisseur"
        subtitle="Réseau, opportunités, contrats et suivi — au même endroit"
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 mb-4">
        <AIContextualTip
          context="investisseur"
          data={{ totalInvested, activeInvestments: activeCount, potentialGain }}
        />
      </div>

      {/* Contrats prêts à signer */}
      {pendingContracts.length > 0 && (
        <div className="px-4 mb-4 space-y-2">
          {pendingContracts.map((c) => (
            <Card key={c.id} className="p-3 bg-primary/5 border-primary/30 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  Contrat prêt à signer — {c.farmer_name}
                </p>
                <p className="text-xs text-muted-foreground">{fcfa(c.amount)}</p>
              </div>
              <Button size="sm" onClick={() => navigate(`/contract/${c.transaction_id}`)}>
                Signer
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Résumé portefeuille */}
      <div className="px-4 mb-5">
        <Card className="overflow-hidden border-0 shadow-elevated">
          <div className="gradient-hero p-5">
            <div className="flex items-center gap-2 text-primary-foreground mb-4">
              <Wallet className="w-5 h-5" />
              <span className="font-semibold">Mon portefeuille</span>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 ml-auto">
                {activeCount} actif{activeCount > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 text-primary-foreground">
              <div>
                <p className="text-xs opacity-80">Investi</p>
                <p className="text-2xl font-bold">{(totalInvested / 1000).toFixed(0)}k</p>
                <p className="text-[10px] opacity-60">FCFA</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Retour attendu</p>
                <p className="text-2xl font-bold">{(expectedReturns / 1000).toFixed(0)}k</p>
                <p className="text-[10px] opacity-60">FCFA</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Gain potentiel</p>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <p className="text-2xl font-bold">+{(potentialGain / 1000).toFixed(0)}k</p>
                </div>
                <p className="text-[10px] opacity-60">FCFA</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="px-4 pb-28">
        <HubTabs
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            { value: "opportunites", label: "Opportunités", icon: Target },
            { value: "reseau", label: "Réseau", icon: Users },
            { value: "portefeuille", label: "Portefeuille", icon: PieChart },
            { value: "contrats", label: "Contrats", icon: FileText },
            { value: "rendements", label: "Rendements", icon: BarChart3 },
            { value: "iot", label: "Suivi IoT", icon: Activity },
          ]}
        >
          {/* OPPORTUNITÉS */}
          <TabsContent value="opportunites" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un projet, un agriculteur, une région..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Sprout className="w-8 h-8" />}
                title="Aucune opportunité"
                description="Revenez bientôt, de nouveaux projets sont publiés régulièrement."
              />
            ) : (
              filtered.map((opp) => {
                const progress = Math.min(100, (opp.current_amount / opp.target_amount) * 100);
                const remaining = Math.max(0, opp.target_amount - opp.current_amount);
                return (
                  <Card key={opp.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{opp.title}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {opp.location || "Sénégal"} · {opp.farmer_name}
                          </p>
                        </div>
                        <Badge variant="outline" className={riskStyles[opp.risk_level] || riskStyles.moyen}>
                          Risque {opp.risk_level}
                        </Badge>
                      </div>

                      {opp.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-muted">
                          <p className="text-sm font-bold">{fcfa(opp.target_amount)}</p>
                          <p className="text-[10px] text-muted-foreground">Objectif</p>
                        </div>
                        <div className="p-2 rounded-lg bg-success/10">
                          <p className="text-sm font-bold text-success flex items-center justify-center gap-0.5">
                            <Percent className="w-3 h-3" />
                            {opp.expected_return_percent}
                          </p>
                          <p className="text-[10px] text-muted-foreground">ROI attendu</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <p className="text-sm font-bold text-primary flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {opp.expected_harvest_date
                              ? new Date(opp.expected_harvest_date).toLocaleDateString("fr-FR", {
                                  month: "short",
                                  year: "2-digit",
                                })
                              : "—"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Récolte</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Financement</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground text-right">
                          {fcfa(remaining)} restants
                        </p>
                      </div>

                      <Button
                        className="w-full"
                        disabled={remaining <= 0}
                        onClick={() => {
                          setSelectedOpportunity(opp);
                          setRequestOpen(true);
                        }}
                      >
                        <Wallet className="w-4 h-4 mr-1" />
                        Demander à investir
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">
                        PlantErea négocie et prépare un contrat signé par les deux parties.
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* RÉSEAU */}
          <TabsContent value="reseau">
            <FarmerNetworkFeed />
          </TabsContent>

          {/* PORTEFEUILLE */}
          <TabsContent value="portefeuille" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">
                    {investments.filter((i) => i.status === "complete" || i.status === "rembourse").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                </CardContent>
              </Card>
            </div>

            {investments.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8" />}
                title="Aucun investissement"
                description="Explorez les opportunités pour financer un projet agricole."
                action={{
                  label: "Voir les opportunités",
                  onClick: () => setActiveTab("opportunites"),
                }}
              />
            ) : (
              investments.map((inv, index) => (
                <PortfolioCard
                  key={inv.id}
                  investment={inv as any}
                  index={index}
                  onClick={() => openDetail(inv)}
                />
              ))
            )}
          </TabsContent>

          {/* CONTRATS */}
          <TabsContent value="contrats">
            <MyContractsList types={["INVESTMENT"]} />
          </TabsContent>

          <TabsContent value="rendements">
            <InvestorReturns />
          </TabsContent>

          <TabsContent value="iot">
            <InvestmentIoTMonitor />
          </TabsContent>
        </HubTabs>
      </div>

      {selectedOpportunity && (
        <RequestInvestmentDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          farmerId={selectedOpportunity.farmer_id}
          farmerName={selectedOpportunity.farmer_name || "Agriculteur"}
          opportunityId={selectedOpportunity.id}
          suggestedAmount={Math.min(
            100000,
            Math.max(0, selectedOpportunity.target_amount - selectedOpportunity.current_amount),
          )}
        />
      )}

      <InvestmentDetailSheet
        investment={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </AppLayout>
  );
}
