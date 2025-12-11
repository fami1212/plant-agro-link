import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";

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
  crop_name?: string;
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

const riskColors: Record<string, string> = {
  faible: "bg-success/15 text-success border-success/30",
  moyen: "bg-warning/15 text-warning border-warning/30",
  eleve: "bg-destructive/15 text-destructive border-destructive/30",
};

const riskLabels: Record<string, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
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
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchOpportunities(), fetchInvestments()]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async () => {
    const { data, error } = await supabase
      .from("investment_opportunities")
      .select(`*, crops:crop_id (name)`)
      .eq("status", "ouverte")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const opportunities = await Promise.all(
      (data || []).map(async (opp) => {
        const { data: farmerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", opp.farmer_id)
          .maybeSingle();

        return {
          id: opp.id,
          farmer_id: opp.farmer_id,
          title: opp.title,
          description: opp.description,
          target_amount: opp.target_amount,
          current_amount: opp.current_amount || 0,
          expected_return_percent: opp.expected_return_percent || 15,
          risk_level: opp.risk_level || "moyen",
          status: opp.status,
          expected_harvest_date: opp.expected_harvest_date,
          location: opp.location,
          farmer_name: farmerProfile?.full_name || "Agriculteur",
          crop_name: opp.crops?.name || null,
        };
      })
    );

    setOpportunities(opportunities);
  };

  const fetchInvestments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("investor_id", user.id)
      .order("investment_date", { ascending: false });

    if (error) throw error;

    const investments = await Promise.all(
      (data || []).map(async (inv) => {
        const { data: farmerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", inv.farmer_id)
          .maybeSingle();

        return {
          id: inv.id,
          title: inv.title,
          amount_invested: inv.amount_invested,
          expected_return_percent: inv.expected_return_percent || 15,
          status: inv.status,
          investment_date: inv.investment_date,
          expected_harvest_date: inv.expected_harvest_date,
          actual_return_amount: inv.actual_return_amount,
          farmer_name: farmerProfile?.full_name || "Agriculteur",
        };
      })
    );

    setInvestments(investments);
  };

  // Portfolio stats
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
  const expectedReturns = investments.reduce(
    (sum, inv) => sum + inv.amount_invested * (1 + inv.expected_return_percent / 100),
    0
  );
  const potentialGain = expectedReturns - totalInvested;

  const handleInvestClick = (opportunity: InvestmentOpportunity) => {
    setSelectedOpportunity(opportunity);
    setInvestAmount("");
    setInvestDialogOpen(true);
  };

  const handleInvestSubmit = async () => {
    if (!selectedOpportunity || !user || !investAmount) return;

    const amount = parseFloat(investAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    const remainingAmount = selectedOpportunity.target_amount - selectedOpportunity.current_amount;
    if (amount > remainingAmount) {
      toast.error(`Maximum: ${remainingAmount.toLocaleString()} FCFA`);
      return;
    }

    setSubmitting(true);
    try {
      const { error: investError } = await supabase.from("investments").insert({
        investor_id: user.id,
        farmer_id: selectedOpportunity.farmer_id,
        title: selectedOpportunity.title,
        amount_invested: amount,
        expected_return_percent: selectedOpportunity.expected_return_percent,
        expected_harvest_date: selectedOpportunity.expected_harvest_date,
      });

      if (investError) throw investError;

      const newCurrentAmount = selectedOpportunity.current_amount + amount;
      const newStatus = newCurrentAmount >= selectedOpportunity.target_amount ? "financee" : "ouverte";

      await supabase
        .from("investment_opportunities")
        .update({ current_amount: newCurrentAmount, status: newStatus })
        .eq("id", selectedOpportunity.id);

      toast.success("Investissement réussi!");
      setInvestDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error investing:", error);
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
        subtitle={`Bienvenue, ${profile?.full_name || "Investisseur"}`}
        action={
          <Button variant="ghost" size="icon" onClick={fetchData}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        }
      />

      {/* Portfolio Summary */}
      <div className="px-4 mb-6">
        <Card className="overflow-hidden">
          <div className="gradient-hero p-5">
            <div className="flex items-center gap-3 text-primary-foreground mb-4">
              <Wallet className="w-6 h-6" />
              <span className="font-semibold text-lg">Mon Portefeuille</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-primary-foreground">
              <div>
                <p className="text-sm opacity-80">Investi</p>
                <p className="text-xl font-bold">{(totalInvested / 1000).toFixed(0)}k</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Attendu</p>
                <p className="text-xl font-bold">{(expectedReturns / 1000).toFixed(0)}k</p>
              </div>
              <div>
                <p className="text-sm opacity-80">Gain</p>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <p className="text-xl font-bold">+{(potentialGain / 1000).toFixed(0)}k</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="opportunites">Opportunités</TabsTrigger>
            <TabsTrigger value="portefeuille">Mon portefeuille</TabsTrigger>
          </TabsList>

          {/* Opportunities Tab */}
          <TabsContent value="opportunites" className="space-y-4 pb-24">
            {opportunities.length === 0 ? (
              <EmptyState
                icon={<Sprout className="w-8 h-8" />}
                title="Aucune opportunité"
                description="Revenez plus tard pour découvrir des projets agricoles"
              />
            ) : (
              opportunities.map((opp, index) => {
                const progress = (opp.current_amount / opp.target_amount) * 100;
                const remaining = opp.target_amount - opp.current_amount;

                return (
                  <Card
                    key={opp.id}
                    className={cn("animate-fade-in shadow-soft", `stagger-${(index % 5) + 1}`)}
                    style={{ opacity: 0 }}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{opp.title}</h3>
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
                        <Badge variant="outline" className={cn("shrink-0 ml-2", riskColors[opp.risk_level])}>
                          {riskLabels[opp.risk_level] || opp.risk_level}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2.5 rounded-lg bg-primary/10">
                          <p className="text-lg font-bold text-primary">{opp.expected_return_percent}%</p>
                          <p className="text-xs text-muted-foreground">ROI</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-muted">
                          <p className="text-lg font-bold text-foreground">
                            {(opp.target_amount / 1000000).toFixed(1)}M
                          </p>
                          <p className="text-xs text-muted-foreground">Objectif</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-muted">
                          <p className="text-lg font-bold text-foreground">
                            {opp.expected_harvest_date
                              ? format(new Date(opp.expected_harvest_date), "MMM yy", { locale: fr })
                              : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">Récolte</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Financement</span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Action */}
                      <Button className="w-full" onClick={() => handleInvestClick(opp)}>
                        <Banknote className="w-4 h-4 mr-2" />
                        Investir • {(remaining / 1000).toFixed(0)}k FCFA restants
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portefeuille" className="space-y-4 pb-24">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{investments.filter((i) => i.status === "en_cours").length}</p>
                  <p className="text-sm text-muted-foreground">En cours</p>
                </CardContent>
              </Card>
              <Card className="bg-success/5 border-success/20">
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-success">{investments.filter((i) => i.status === "complete" || i.status === "rembourse").length}</p>
                  <p className="text-sm text-muted-foreground">Terminés</p>
                </CardContent>
              </Card>
            </div>

            {investments.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8" />}
                title="Aucun investissement"
                description="Explorez les opportunités pour commencer"
                action={{
                  label: "Voir les opportunités",
                  onClick: () => setActiveTab("opportunites"),
                }}
              />
            ) : (
              investments.map((inv, index) => {
                const expectedReturn = inv.amount_invested * (1 + inv.expected_return_percent / 100);
                const gain = expectedReturn - inv.amount_invested;

                return (
                  <Card
                    key={inv.id}
                    className={cn("animate-fade-in shadow-soft", `stagger-${(index % 5) + 1}`)}
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
                        <Badge
                          variant="outline"
                          className={cn(
                            inv.status === "en_cours" && "bg-warning/15 text-warning border-warning/30",
                            (inv.status === "complete" || inv.status === "rembourse") && "bg-success/15 text-success border-success/30"
                          )}
                        >
                          {inv.status === "en_cours" ? "En cours" : "Terminé"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-2.5 rounded-lg bg-muted text-center">
                          <p className="text-sm font-bold text-foreground">{(inv.amount_invested / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-muted-foreground">Investi</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-primary/10 text-center">
                          <p className="text-sm font-bold text-primary">{(expectedReturn / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-muted-foreground">Attendu</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-success/10 text-center">
                          <p className="text-sm font-bold text-success">+{(gain / 1000).toFixed(0)}k</p>
                          <p className="text-xs text-muted-foreground">Gain</p>
                        </div>
                      </div>

                      {inv.expected_harvest_date && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>Récolte prévue: {format(new Date(inv.expected_harvest_date), "MMMM yyyy", { locale: fr })}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invest Dialog */}
      <Dialog open={investDialogOpen} onOpenChange={setInvestDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Investir</DialogTitle>
          </DialogHeader>

          {selectedOpportunity && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium text-foreground">{selectedOpportunity.title}</p>
                <p className="text-sm text-muted-foreground">{selectedOpportunity.farmer_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-xl font-bold text-primary">{selectedOpportunity.expected_return_percent}%</p>
                  <p className="text-xs text-muted-foreground">ROI attendu</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xl font-bold text-foreground">
                    {((selectedOpportunity.target_amount - selectedOpportunity.current_amount) / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-muted-foreground">Restant</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Montant (FCFA)</label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="text-lg"
                />
              </div>

              {investAmount && parseFloat(investAmount) > 0 && (
                <div className="p-3 rounded-lg bg-success/10 text-center">
                  <p className="text-sm text-muted-foreground">Retour attendu</p>
                  <p className="text-xl font-bold text-success">
                    {Math.round(parseFloat(investAmount) * (1 + selectedOpportunity.expected_return_percent / 100)).toLocaleString()} FCFA
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInvestDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvestSubmit} disabled={submitting || !investAmount}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
