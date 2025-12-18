import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Sprout,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  Banknote,
  Activity,
  Target,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { InvestmentIoTMonitor } from "@/components/investor/InvestmentIoTMonitor";

interface InvestmentOpportunity {
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

interface Investment {
  id: string;
  title: string;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount: number | null;
  farmer_name?: string;
}

const riskConfig: Record<string, { label: string; color: string }> = {
  faible: { label: "Faible", color: "bg-success/10 text-success" },
  moyen: { label: "Moyen", color: "bg-warning/10 text-warning" },
  eleve: { label: "Élevé", color: "bg-destructive/10 text-destructive" },
};

export default function Investisseur() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOpportunities(), fetchInvestments()]);
    } catch (error) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    const { data, error } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("status", "ouverte")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const farmerIds = [...new Set((data || []).map(opp => opp.farmer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", farmerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    // Fetch actual investments for each opportunity to get real current_amount
    const opportunityTitles = (data || []).map(opp => opp.title);
    const { data: investments } = await supabase
      .from("investments")
      .select("title, amount_invested")
      .in("title", opportunityTitles);

    // Calculate total invested per opportunity title
    const investedMap = new Map<string, number>();
    (investments || []).forEach(inv => {
      const current = investedMap.get(inv.title) || 0;
      investedMap.set(inv.title, current + inv.amount_invested);
    });

    setOpportunities((data || []).map((opp) => ({
      ...opp,
      current_amount: investedMap.get(opp.title) || opp.current_amount || 0,
      expected_return_percent: opp.expected_return_percent || 15,
      risk_level: opp.risk_level || "moyen",
      farmer_name: profileMap.get(opp.farmer_id) || "Agriculteur",
    })));
  };

  const fetchInvestments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("investor_id", user.id)
      .order("investment_date", { ascending: false });

    if (error) throw error;

    const farmerIds = [...new Set((data || []).map(inv => inv.farmer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", farmerIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    setInvestments((data || []).map((inv) => ({
      ...inv,
      expected_return_percent: inv.expected_return_percent || 15,
      farmer_name: profileMap.get(inv.farmer_id) || "Agriculteur",
    })));
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
  const expectedReturns = investments.reduce(
    (sum, inv) => sum + inv.amount_invested * (1 + inv.expected_return_percent / 100),
    0
  );
  const potentialGain = expectedReturns - totalInvested;
  const activeCount = investments.filter(i => i.status === "en_cours").length;

  const handleInvest = async () => {
    if (!selectedOpportunity || !user || !investAmount) return;

    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    const remaining = selectedOpportunity.target_amount - selectedOpportunity.current_amount;
    if (amount > remaining) {
      toast.error(`Maximum: ${remaining.toLocaleString()} FCFA`);
      return;
    }

    setSubmitting(true);
    try {
      await supabase.from("investments").insert({
        investor_id: user.id,
        farmer_id: selectedOpportunity.farmer_id,
        title: selectedOpportunity.title,
        amount_invested: amount,
        expected_return_percent: selectedOpportunity.expected_return_percent,
        expected_harvest_date: selectedOpportunity.expected_harvest_date,
      });

      const newAmount = selectedOpportunity.current_amount + amount;
      await supabase
        .from("investment_opportunities")
        .update({ 
          current_amount: newAmount, 
          status: newAmount >= selectedOpportunity.target_amount ? "financee" : "ouverte" 
        })
        .eq("id", selectedOpportunity.id);

      toast.success("Investissement réussi!");
      setInvestDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'investissement");
    } finally {
      setSubmitting(false);
    }
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
        title="Investissements"
        subtitle="Financez l'agriculture locale"
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      {/* AI Contextual Tip */}
      <div className="px-4 mb-4">
        <AIContextualTip 
          context="investisseur" 
          data={{ totalInvested, activeInvestments: activeCount, potentialGain }} 
        />
      </div>

      {/* Portfolio Summary */}
      <div className="px-4 mb-6">
        <Card className="overflow-hidden border-0 shadow-elevated">
          <div className="gradient-hero p-5 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary-foreground mb-4">
                <Wallet className="w-5 h-5" />
                <span className="font-semibold">Mon Portefeuille</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-primary-foreground">
                <div>
                  <p className="text-sm opacity-80">Investi</p>
                  <p className="text-2xl font-bold">{(totalInvested / 1000).toFixed(0)}k</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Attendu</p>
                  <p className="text-2xl font-bold">{(expectedReturns / 1000).toFixed(0)}k</p>
                </div>
                <div>
                  <p className="text-sm opacity-80">Gain</p>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    <p className="text-2xl font-bold">+{(potentialGain / 1000).toFixed(0)}k</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4 h-12">
            <TabsTrigger value="opportunites" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Opportunités</span>
            </TabsTrigger>
            <TabsTrigger value="portefeuille" className="gap-2">
              <PieChart className="w-4 h-4" />
              <span className="hidden sm:inline">Portefeuille</span>
            </TabsTrigger>
            <TabsTrigger value="iot" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Suivi IoT</span>
            </TabsTrigger>
          </TabsList>

          {/* Opportunities */}
          <TabsContent value="opportunites" className="space-y-4">
            {opportunities.length === 0 ? (
              <EmptyState
                icon={<Sprout className="w-8 h-8" />}
                title="Aucune opportunité"
                description="Revenez bientôt pour découvrir des projets"
              />
            ) : (
              opportunities.map((opp, index) => {
                const progress = (opp.current_amount / opp.target_amount) * 100;
                const remaining = opp.target_amount - opp.current_amount;
                const risk = riskConfig[opp.risk_level] || riskConfig.moyen;

                return (
                  <Card
                    key={opp.id}
                    className={cn("animate-fade-in border-border/50", `stagger-${(index % 5) + 1}`)}
                    style={{ opacity: 0 }}
                  >
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground">{opp.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Sprout className="w-3.5 h-3.5" />
                            <span>{opp.farmer_name}</span>
                            {opp.location && (
                              <>
                                <span>•</span>
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate">{opp.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={cn("shrink-0", risk.color)}>
                          {risk.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-3 rounded-xl bg-primary/10">
                          <p className="text-xl font-bold text-primary">{opp.expected_return_percent}%</p>
                          <p className="text-xs text-muted-foreground">ROI</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-muted">
                          <p className="text-xl font-bold text-foreground">
                            {(opp.target_amount / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-muted-foreground">Objectif</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-muted">
                          <p className="text-xl font-bold text-foreground">
                            {opp.expected_harvest_date
                              ? format(new Date(opp.expected_harvest_date), "MMM", { locale: fr })
                              : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">Récolte</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Financement</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => {
                          setSelectedOpportunity(opp);
                          setInvestAmount("");
                          setInvestDialogOpen(true);
                        }}
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Investir • {(remaining / 1000).toFixed(0)}k restants
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Portfolio */}
          <TabsContent value="portefeuille" className="space-y-4">
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
                    {investments.filter(i => i.status === "complete" || i.status === "rembourse").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                </CardContent>
              </Card>
            </div>

            {investments.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8" />}
                title="Aucun investissement"
                description="Explorez les opportunités"
                action={{
                  label: "Voir opportunités",
                  onClick: () => setActiveTab("opportunites"),
                }}
              />
            ) : (
              investments.map((inv, index) => {
                const expectedReturn = inv.amount_invested * (1 + inv.expected_return_percent / 100);
                return (
                  <Card
                    key={inv.id}
                    className={cn("animate-fade-in border-border/50", `stagger-${(index % 5) + 1}`)}
                    style={{ opacity: 0 }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{inv.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {inv.farmer_name} • {format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <Badge className={cn(
                          inv.status === "en_cours" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                        )}>
                          {inv.status === "en_cours" ? "En cours" : "Terminé"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-muted text-center">
                          <p className="font-bold text-foreground">{(inv.amount_invested / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-muted-foreground">Investi</p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10 text-center">
                          <p className="font-bold text-primary">{(expectedReturn / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-muted-foreground">Attendu</p>
                        </div>
                        <div className="p-2 rounded-lg bg-success/10 text-center">
                          <p className="font-bold text-success">+{inv.expected_return_percent}%</p>
                          <p className="text-xs text-muted-foreground">ROI</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* IoT */}
          <TabsContent value="iot">
            <InvestmentIoTMonitor />
          </TabsContent>
        </Tabs>
      </div>

      {/* Invest Dialog */}
      <Dialog open={investDialogOpen} onOpenChange={setInvestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-primary" />
              Investir
            </DialogTitle>
          </DialogHeader>
          {selectedOpportunity && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-medium">{selectedOpportunity.title}</p>
                <p className="text-sm text-muted-foreground">{selectedOpportunity.farmer_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl bg-primary/10">
                  <p className="text-xl font-bold text-primary">{selectedOpportunity.expected_return_percent}%</p>
                  <p className="text-xs text-muted-foreground">ROI attendu</p>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <p className="text-xl font-bold">
                    {((selectedOpportunity.target_amount - selectedOpportunity.current_amount) / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Restant</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Montant à investir</label>
                <div className="relative mt-2">
                  <Input
                    type="number"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="0"
                    className="pr-16 h-12 text-lg font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    FCFA
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvest} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}