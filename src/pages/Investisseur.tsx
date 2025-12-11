import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  Sprout,
  MapPin,
  Calendar,
  Loader2,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Banknote,
  Eye,
  RefreshCw,
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
  crop_id: string | null;
  field_id: string | null;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  expected_return_percent: number;
  risk_level: string;
  status: string;
  start_date: string | null;
  expected_harvest_date: string | null;
  location: string | null;
  created_at: string;
  // Joined data
  farmer_name?: string;
  crop_name?: string;
  field_name?: string;
  field_size?: number;
}

interface Investment {
  id: string;
  investor_id: string;
  farmer_id: string;
  crop_id: string | null;
  field_id: string | null;
  title: string;
  description: string | null;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount: number | null;
  actual_return_date: string | null;
  // Computed
  expected_return: number;
  farmer_name?: string;
}

const riskColors: Record<string, string> = {
  faible: "bg-green-500/10 text-green-600",
  moyen: "bg-warning/10 text-warning",
  eleve: "bg-destructive/10 text-destructive",
};

const riskLabels: Record<string, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  ouverte: { label: "Ouvert", color: "bg-primary/10 text-primary", icon: Clock },
  financee: { label: "Financé", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle },
  en_production: { label: "En cours", color: "bg-warning/10 text-warning", icon: Sprout },
  terminee: { label: "Terminé", color: "bg-green-500/10 text-green-600", icon: CheckCircle },
  annulee: { label: "Annulé", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

const investmentStatusConfig: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours", color: "bg-warning/10 text-warning" },
  complete: { label: "Complété", color: "bg-green-500/10 text-green-600" },
  rembourse: { label: "Remboursé", color: "bg-blue-500/10 text-blue-600" },
  perdu: { label: "Perdu", color: "bg-destructive/10 text-destructive" },
};

export default function Investisseur() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [investMessage, setInvestMessage] = useState("");
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
      .select(`
        *,
        crops:crop_id (name, crop_type),
        fields:field_id (name, area_hectares)
      `)
      .eq("status", "ouverte")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch farmer profiles for each opportunity
    const opportunities = await Promise.all(
      (data || []).map(async (opp) => {
        const { data: farmerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", opp.farmer_id)
          .maybeSingle();

        return {
          ...opp,
          farmer_name: farmerProfile?.full_name || "Agriculteur",
          crop_name: opp.crops?.name || null,
          field_name: opp.fields?.name || null,
          field_size: opp.fields?.area_hectares || null,
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

    // Fetch farmer profiles for each investment
    const investments = await Promise.all(
      (data || []).map(async (inv) => {
        const { data: farmerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", inv.farmer_id)
          .maybeSingle();

        const expectedReturn = inv.amount_invested * (1 + inv.expected_return_percent / 100);

        return {
          ...inv,
          farmer_name: farmerProfile?.full_name || "Agriculteur",
          expected_return: expectedReturn,
        };
      })
    );

    setInvestments(investments);
  };

  // Calculate portfolio stats
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
  const expectedReturns = investments.reduce((sum, inv) => sum + inv.expected_return, 0);
  const actualReturns = investments
    .filter((inv) => inv.actual_return_amount !== null)
    .reduce((sum, inv) => sum + (inv.actual_return_amount || 0), 0);
  const potentialGain = expectedReturns - totalInvested;
  const avgROI =
    investments.length > 0
      ? investments.reduce((sum, inv) => sum + inv.expected_return_percent, 0) / investments.length
      : 0;

  const activeInvestments = investments.filter((i) => i.status === "en_cours").length;
  const completedInvestments = investments.filter((i) => i.status === "complete" || i.status === "rembourse").length;

  const categories = ["all", ...new Set(opportunities.map((o) => o.crop_name || "Autre").filter(Boolean))];

  const filteredOpportunities = opportunities.filter((opp) => {
    if (selectedCategory === "all") return true;
    return opp.crop_name === selectedCategory;
  });

  const handleInvestClick = (opportunity: InvestmentOpportunity) => {
    setSelectedOpportunity(opportunity);
    setInvestAmount("");
    setInvestMessage("");
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
      toast.error(`Le montant maximum est ${remainingAmount.toLocaleString()} FCFA`);
      return;
    }

    setSubmitting(true);
    try {
      // Create investment record
      const { error: investError } = await supabase.from("investments").insert({
        investor_id: user.id,
        farmer_id: selectedOpportunity.farmer_id,
        crop_id: selectedOpportunity.crop_id,
        field_id: selectedOpportunity.field_id,
        title: selectedOpportunity.title,
        description: investMessage || null,
        amount_invested: amount,
        expected_return_percent: selectedOpportunity.expected_return_percent,
        expected_harvest_date: selectedOpportunity.expected_harvest_date,
      });

      if (investError) throw investError;

      // Update opportunity current_amount
      const newCurrentAmount = selectedOpportunity.current_amount + amount;
      const newStatus = newCurrentAmount >= selectedOpportunity.target_amount ? "financee" : "ouverte";

      const { error: updateError } = await supabase
        .from("investment_opportunities")
        .update({
          current_amount: newCurrentAmount,
          status: newStatus,
        })
        .eq("id", selectedOpportunity.id);

      if (updateError) throw updateError;

      toast.success("Investissement effectué avec succès!", {
        description: `${amount.toLocaleString()} FCFA investis dans "${selectedOpportunity.title}"`,
      });

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
        title="Espace Investisseur"
        subtitle={`Bonjour ${profile?.full_name || "Investisseur"}`}
        action={
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      {/* Portfolio Summary */}
      <div className="px-4 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-semibold">Mon Portefeuille</span>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                {investments.length} investissement{investments.length > 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Investi</p>
                <p className="text-xl font-bold">{totalInvested.toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Retour Attendu</p>
                <p className="text-xl font-bold text-primary">{expectedReturns.toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gain Potentiel</p>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <p className="font-semibold text-green-600">+{potentialGain.toLocaleString()} FCFA</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI Moyen</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <p className="font-semibold">{avgROI.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="opportunites" className="flex flex-col gap-1 py-2 text-xs">
              <Search className="w-4 h-4" />
              <span>Opportunités</span>
            </TabsTrigger>
            <TabsTrigger value="portefeuille" className="flex flex-col gap-1 py-2 text-xs">
              <PieChart className="w-4 h-4" />
              <span>Portefeuille</span>
            </TabsTrigger>
            <TabsTrigger value="rendements" className="flex flex-col gap-1 py-2 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span>Rendements</span>
            </TabsTrigger>
          </TabsList>

          {/* OPPORTUNITÉS TAB */}
          <TabsContent value="opportunites" className="mt-4 space-y-4 pb-24">
            {/* Category Filter */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all",
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {cat === "all" ? "Tous" : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Opportunities List */}
            {filteredOpportunities.length === 0 ? (
              <EmptyState
                icon={<Search className="w-8 h-8" />}
                title="Aucune opportunité disponible"
                description="Revenez plus tard pour découvrir de nouvelles opportunités d'investissement"
              />
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.map((opp, index) => {
                  const fundingProgress = (opp.current_amount / opp.target_amount) * 100;
                  const remainingAmount = opp.target_amount - opp.current_amount;

                  return (
                    <Card
                      key={opp.id}
                      className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
                      style={{ opacity: 0 }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{opp.title}</h3>
                            {opp.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3" />
                                <span>{opp.location}</span>
                              </div>
                            )}
                          </div>
                          <Badge className={riskColors[opp.risk_level] || riskColors.moyen}>
                            {riskLabels[opp.risk_level] || opp.risk_level}
                          </Badge>
                        </div>

                        {opp.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{opp.description}</p>
                        )}

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Financement</span>
                            <span className="font-medium">{Math.round(fundingProgress)}%</span>
                          </div>
                          <Progress value={fundingProgress} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>{opp.current_amount.toLocaleString()} FCFA</span>
                            <span>Objectif: {opp.target_amount.toLocaleString()} FCFA</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center p-2 bg-muted rounded-lg">
                            <p className="text-lg font-bold text-primary">{opp.expected_return_percent}%</p>
                            <p className="text-xs text-muted-foreground">ROI attendu</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded-lg">
                            <p className="text-lg font-bold">
                              {opp.expected_harvest_date
                                ? Math.ceil(
                                    (new Date(opp.expected_harvest_date).getTime() - Date.now()) /
                                      (1000 * 60 * 60 * 24 * 30)
                                  )
                                : "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">Mois</p>
                          </div>
                          <div className="text-center p-2 bg-muted rounded-lg">
                            <p className="text-lg font-bold">{opp.field_size || "-"}</p>
                            <p className="text-xs text-muted-foreground">Hectares</p>
                          </div>
                        </div>

                        {/* Farmer Info */}
                        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Sprout className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{opp.farmer_name}</p>
                              <p className="text-xs text-muted-foreground">{opp.crop_name || "Culture"}</p>
                            </div>
                          </div>
                          {opp.expected_harvest_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(opp.expected_harvest_date), "MMM yyyy", { locale: fr })}
                            </div>
                          )}
                        </div>

                        <Button className="w-full" onClick={() => handleInvestClick(opp)}>
                          <Banknote className="w-4 h-4 mr-2" />
                          Investir ({remainingAmount.toLocaleString()} FCFA restants)
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PORTEFEUILLE TAB */}
          <TabsContent value="portefeuille" className="mt-4 space-y-4 pb-24">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{activeInvestments}</p>
                  <p className="text-xs text-muted-foreground">Actifs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{completedInvestments}</p>
                  <p className="text-xs text-muted-foreground">Terminés</p>
                </CardContent>
              </Card>
            </div>

            {investments.length === 0 ? (
              <EmptyState
                icon={<PieChart className="w-8 h-8" />}
                title="Aucun investissement"
                description="Parcourez les opportunités pour commencer à investir"
                action={{
                  label: "Voir les opportunités",
                  onClick: () => setActiveTab("opportunites"),
                }}
              />
            ) : (
              <div className="space-y-3">
                {investments.map((inv, index) => {
                  const statusInfo = investmentStatusConfig[inv.status] || investmentStatusConfig.en_cours;
                  const gain = inv.expected_return - inv.amount_invested;
                  const roiPercent = inv.expected_return_percent;

                  return (
                    <Card
                      key={inv.id}
                      className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)}
                      style={{ opacity: 0 }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{inv.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Investi le {format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground">Montant investi</p>
                            <p className="font-bold">{inv.amount_invested.toLocaleString()} FCFA</p>
                          </div>
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">Retour attendu</p>
                            <p className="font-bold text-primary">{inv.expected_return.toLocaleString()} FCFA</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-sm font-medium">+{roiPercent.toFixed(0)}% ROI</span>
                          </div>
                          <div className="text-sm text-muted-foreground">{inv.farmer_name}</div>
                        </div>

                        {inv.actual_return_amount !== null && (
                          <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">Retour réel</p>
                            <p className="font-bold text-green-600">
                              {inv.actual_return_amount.toLocaleString()} FCFA
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* RENDEMENTS TAB */}
          <TabsContent value="rendements" className="mt-4 space-y-4 pb-24">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Gains potentiels</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">+{potentialGain.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">FCFA</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Performance</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">+{avgROI.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">ROI moyen</p>
                </CardContent>
              </Card>
            </div>

            {actualReturns > 0 && (
              <Card className="bg-gradient-to-br from-green-600/10 to-green-600/5 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">Retours réalisés</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{actualReturns.toLocaleString()} FCFA</p>
                </CardContent>
              </Card>
            )}

            {/* Performance History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Historique des rendements</CardTitle>
              </CardHeader>
              <CardContent>
                {investments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun historique disponible</p>
                ) : (
                  <div className="space-y-3">
                    {investments.map((inv) => {
                      const gain = inv.expected_return - inv.amount_invested;
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{inv.title}</p>
                            <p className="text-xs text-muted-foreground">{inv.farmer_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">+{gain.toLocaleString()} FCFA</p>
                            <p className="text-xs text-muted-foreground">{inv.expected_return_percent.toFixed(0)}% ROI</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  Conseils d'investissement
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Diversifiez vos investissements sur différentes cultures</li>
                  <li>• Les projets à faible risque ont des rendements plus prévisibles</li>
                  <li>• Suivez régulièrement l'avancement des cultures</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invest Dialog */}
      <Dialog open={investDialogOpen} onOpenChange={setInvestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Investir dans ce projet</DialogTitle>
            <DialogDescription>{selectedOpportunity?.title}</DialogDescription>
          </DialogHeader>

          {selectedOpportunity && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span>Montant restant</span>
                  <span className="font-bold">
                    {(selectedOpportunity.target_amount - selectedOpportunity.current_amount).toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span>ROI attendu</span>
                  <span className="font-bold text-primary">{selectedOpportunity.expected_return_percent}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant à investir (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 100000"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optionnel)</Label>
                <Textarea
                  id="message"
                  placeholder="Un message pour l'agriculteur..."
                  value={investMessage}
                  onChange={(e) => setInvestMessage(e.target.value)}
                />
              </div>

              {investAmount && parseFloat(investAmount) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Retour attendu</span>
                    <span className="font-bold text-primary">
                      {Math.round(
                        parseFloat(investAmount) * (1 + selectedOpportunity.expected_return_percent / 100)
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>Gain potentiel</span>
                    <span className="font-bold text-green-600">
                      +
                      {Math.round(
                        parseFloat(investAmount) * (selectedOpportunity.expected_return_percent / 100)
                      ).toLocaleString()}{" "}
                      FCFA
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvestDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvestSubmit} disabled={submitting || !investAmount}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer l'investissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
