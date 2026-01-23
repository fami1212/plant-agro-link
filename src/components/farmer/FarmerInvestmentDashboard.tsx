import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  Loader2,
  Banknote,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Percent,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordRepayment } from "@/services/blockchainService";

interface Investment {
  id: string;
  title: string;
  description: string | null;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount: number | null;
  investor_id: string;
  investor_name: string;
}

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  expected_return_percent: number;
  status: string;
  expected_harvest_date: string | null;
  created_at: string;
  risk_level: string | null;
  investors_count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  en_cours: { label: "En cours", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  rembourse: { label: "Remboursé", color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  complete: { label: "Complet", color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  ouverte: { label: "Ouverte", color: "bg-primary/10 text-primary border-primary/30", icon: Target },
  financee: { label: "Financée", color: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  fermee: { label: "Fermée", color: "bg-muted text-muted-foreground", icon: AlertCircle },
};

export function FarmerInvestmentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch received investments
      const { data: investmentsData } = await supabase
        .from("investments")
        .select("*")
        .eq("farmer_id", user.id)
        .order("investment_date", { ascending: false });

      // Get investor names
      const investorIds = [...new Set((investmentsData || []).map((inv) => inv.investor_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", investorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);

      setInvestments(
        (investmentsData || []).map((inv) => ({
          ...inv,
          investor_name: profileMap.get(inv.investor_id) || "Investisseur",
        }))
      );

      // Fetch my opportunities
      const { data: oppsData } = await supabase
        .from("investment_opportunities")
        .select("*")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      // Get investor counts per opportunity
      const oppsWithCounts = await Promise.all(
        (oppsData || []).map(async (opp) => {
          const { count } = await supabase
            .from("investments")
            .select("id", { count: "exact", head: true })
            .eq("farmer_id", user.id)
            .eq("title", opp.title);

          return {
            ...opp,
            investors_count: count || 0,
          };
        })
      );

      setOpportunities(oppsWithCounts);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRepayment = async () => {
    if (!selectedInvestment || !repaymentAmount) return;

    setProcessing(true);
    try {
      const amount = parseFloat(repaymentAmount);
      
      // Record on blockchain
      const tx = await recordRepayment(
        selectedInvestment.id,
        amount,
        selectedInvestment.investor_id,
        ""
      );

      // Update database
      const { error } = await supabase
        .from("investments")
        .update({
          status: "rembourse",
          actual_return_amount: amount,
          actual_return_date: new Date().toISOString(),
        })
        .eq("id", selectedInvestment.id);

      if (error) throw error;

      toast.success(`Remboursement enregistré! Hash: ${tx.hash.substring(0, 12)}...`);
      setSelectedInvestment(null);
      setRepaymentAmount("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du remboursement");
    } finally {
      setProcessing(false);
    }
  };

  // Calculate stats
  const totalReceived = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
  const totalToRepay = investments
    .filter((inv) => inv.status === "en_cours")
    .reduce((sum, inv) => sum + inv.amount_invested * (1 + inv.expected_return_percent / 100), 0);
  const totalRepaid = investments
    .filter((inv) => inv.status === "rembourse")
    .reduce((sum, inv) => sum + (inv.actual_return_amount || 0), 0);
  const activeInvestors = new Set(investments.filter((inv) => inv.status === "en_cours").map((inv) => inv.investor_id)).size;
  const openOpportunities = opportunities.filter((opp) => opp.status === "ouverte").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">Total reçu</span>
            </div>
            <p className="text-xl font-bold text-primary">
              {(totalReceived / 1000).toFixed(0)}k <span className="text-sm font-normal">FCFA</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              <span className="text-xs text-muted-foreground">À rembourser</span>
            </div>
            <p className="text-xl font-bold text-warning">
              {(totalToRepay / 1000).toFixed(0)}k <span className="text-sm font-normal">FCFA</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-xs text-muted-foreground">Remboursé</span>
            </div>
            <p className="text-xl font-bold text-success">
              {(totalRepaid / 1000).toFixed(0)}k <span className="text-sm font-normal">FCFA</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-xs text-muted-foreground">Investisseurs actifs</span>
            </div>
            <p className="text-xl font-bold text-accent">{activeInvestors}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="investments" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="investments" className="flex-1">
            <Wallet className="w-4 h-4 mr-1" />
            Investissements ({investments.length})
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="flex-1">
            <Target className="w-4 h-4 mr-1" />
            Opportunités ({opportunities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investments" className="space-y-3 mt-4">
          {investments.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-8 h-8" />}
              title="Aucun investissement reçu"
              description="Créez une opportunité d'investissement pour attirer des financements"
              action={{
                label: "Créer une opportunité",
                onClick: () => navigate("/cultures"),
              }}
            />
          ) : (
            investments.map((inv) => {
              const config = statusConfig[inv.status] || statusConfig.en_cours;
              const StatusIcon = config.icon;
              const expectedReturn = inv.amount_invested * (1 + inv.expected_return_percent / 100);

              return (
                <Card key={inv.id} variant="interactive">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{inv.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Par {inv.investor_name} •{" "}
                          {format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <p className="text-sm font-bold">{(inv.amount_invested / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-muted-foreground">Reçu</p>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/10">
                        <p className="text-sm font-bold text-primary">+{inv.expected_return_percent}%</p>
                        <p className="text-xs text-muted-foreground">Rendement</p>
                      </div>
                      <div className="p-2 rounded-lg bg-accent/10">
                        <p className="text-sm font-bold text-accent">{(expectedReturn / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-muted-foreground">À rembourser</p>
                      </div>
                    </div>

                    {inv.expected_harvest_date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          Récolte prévue:{" "}
                          {format(new Date(inv.expected_harvest_date), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                    )}

                    {inv.status === "en_cours" && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedInvestment(inv);
                          setRepaymentAmount(expectedReturn.toString());
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marquer comme remboursé
                      </Button>
                    )}

                    {inv.status === "rembourse" && inv.actual_return_amount && (
                      <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-success/10 text-success text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Remboursé: {inv.actual_return_amount.toLocaleString()} FCFA
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/cultures")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Créer une nouvelle opportunité
          </Button>

          {opportunities.length === 0 ? (
            <EmptyState
              icon={<Target className="w-8 h-8" />}
              title="Aucune opportunité"
              description="Créez une opportunité d'investissement depuis la page Cultures"
            />
          ) : (
            opportunities.map((opp) => {
              const config = statusConfig[opp.status] || statusConfig.ouverte;
              const StatusIcon = config.icon;
              const progress = (opp.current_amount / opp.target_amount) * 100;

              return (
                <Card key={opp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{opp.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          Créée le {format(new Date(opp.created_at), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Financement</span>
                        <span className="font-medium">
                          {(opp.current_amount / 1000).toFixed(0)}k / {(opp.target_amount / 1000).toFixed(0)}k FCFA
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{opp.investors_count} investisseur{opp.investors_count > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Percent className="w-4 h-4" />
                        <span className="font-medium">+{opp.expected_return_percent}%</span>
                      </div>
                    </div>

                    {opp.risk_level && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            opp.risk_level === "faible" && "bg-success/10 text-success",
                            opp.risk_level === "moyen" && "bg-warning/10 text-warning",
                            opp.risk_level === "eleve" && "bg-destructive/10 text-destructive"
                          )}
                        >
                          Risque {opp.risk_level}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Repayment Dialog */}
      <Dialog open={!!selectedInvestment} onOpenChange={() => setSelectedInvestment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le remboursement</DialogTitle>
          </DialogHeader>

          {selectedInvestment && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">{selectedInvestment.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Montant investi</p>
                    <p className="font-medium">{selectedInvestment.amount_invested.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rendement prévu</p>
                    <p className="font-medium text-primary">+{selectedInvestment.expected_return_percent}%</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Montant remboursé (FCFA)</Label>
                <Input
                  type="number"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  placeholder="Montant"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Montant attendu:{" "}
                  {(
                    selectedInvestment.amount_invested *
                    (1 + selectedInvestment.expected_return_percent / 100)
                  ).toLocaleString()}{" "}
                  FCFA
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleRepayment}
                disabled={processing || !repaymentAmount}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Confirmer le remboursement
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
