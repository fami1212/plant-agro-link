import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, Briefcase, Search, Loader2, Leaf, MapPin,
  Calendar, Percent, DollarSign, ArrowUpRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type InvestmentOpportunity = Database["public"]["Tables"]["investment_opportunities"]["Row"];
type Investment = Database["public"]["Tables"]["investments"]["Row"];

export default function MarketplaceInvestor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [myInvestments, setMyInvestments] = useState<Investment[]>([]);
  const [portfolioStats, setPortfolioStats] = useState({
    totalInvested: 0,
    expectedReturns: 0,
    activeCount: 0,
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOpportunities(), fetchMyInvestments()]);
    setLoading(false);
  };

  const fetchOpportunities = async () => {
    const { data } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("status", "ouverte")
      .order("created_at", { ascending: false });
    setOpportunities(data || []);
  };

  const fetchMyInvestments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("investments")
      .select("*")
      .eq("investor_id", user.id)
      .order("created_at", { ascending: false });
    
    const investments = data || [];
    setMyInvestments(investments);
    
    // Calculate portfolio stats
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
    const expectedReturns = investments.reduce((sum, inv) => {
      const returnPercent = inv.expected_return_percent || 0;
      return sum + (inv.amount_invested * returnPercent / 100);
    }, 0);
    const activeCount = investments.filter(inv => inv.status === "actif").length;
    
    setPortfolioStats({ totalInvested, expectedReturns, activeCount });
  };

  const filteredOpportunities = opportunities.filter((opp) =>
    opp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskBadge = (risk: string | null) => {
    const config: Record<string, { color: string; label: string }> = {
      faible: { color: "bg-green-100 text-green-800", label: "Faible" },
      moyen: { color: "bg-yellow-100 text-yellow-800", label: "Moyen" },
      eleve: { color: "bg-red-100 text-red-800", label: "Élevé" },
    };
    const c = config[risk || "moyen"] || config.moyen;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  return (
    <AppLayout>
      <PageHeader
        title="Investissements"
        subtitle="Financez l'agriculture et générez des rendements"
      />

      <div className="px-4 mb-4">
        <AIContextualTip context="marketplace" data={{ role: "investisseur" }} />
      </div>

      {/* Portfolio Summary */}
      <div className="px-4 mb-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {portfolioStats.totalInvested.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">FCFA investis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  +{portfolioStats.expectedReturns.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Gains attendus</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {portfolioStats.activeCount}
                </p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="opportunites" className="gap-1 text-xs">
              <TrendingUp className="w-4 h-4" />
              Opportunités
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-1 text-xs">
              <Briefcase className="w-4 h-4" />
              Mon Portfolio
            </TabsTrigger>
          </TabsList>

          {/* OPPORTUNITÉS */}
          <TabsContent value="opportunites" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une opportunité..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.map((opp) => {
                  const progress = opp.current_amount 
                    ? (opp.current_amount / opp.target_amount) * 100 
                    : 0;
                  const remaining = opp.target_amount - (opp.current_amount || 0);

                  return (
                    <Card key={opp.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{opp.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{opp.location || "Sénégal"}</span>
                            </div>
                          </div>
                          {getRiskBadge(opp.risk_level)}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {opp.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-green-500" />
                            <span className="font-medium">
                              {opp.expected_return_percent}% rendement
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>
                              {opp.expected_harvest_date 
                                ? new Date(opp.expected_harvest_date).toLocaleDateString("fr", { month: "short", year: "numeric" })
                                : "TBD"
                              }
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{(opp.current_amount || 0).toLocaleString()} FCFA</span>
                            <span>{opp.target_amount.toLocaleString()} FCFA</span>
                          </div>
                        </div>

                        <Button className="w-full mt-4" variant="hero">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Investir ({remaining.toLocaleString()} FCFA restants)
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredOpportunities.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Aucune opportunité disponible</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* PORTFOLIO */}
          <TabsContent value="portfolio" className="mt-4 space-y-4">
            {myInvestments.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucun investissement</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab("opportunites")}
                >
                  Voir les opportunités
                </Button>
              </div>
            ) : (
              myInvestments.map((inv) => (
                <Card key={inv.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{inv.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Investi le {new Date(inv.investment_date).toLocaleDateString("fr")}
                        </p>
                      </div>
                      <Badge variant={inv.status === "actif" ? "default" : "secondary"}>
                        {inv.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Montant</p>
                        <p className="font-semibold text-primary">
                          {inv.amount_invested.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rendement</p>
                        <p className="font-semibold text-green-600 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          +{inv.expected_return_percent}%
                        </p>
                      </div>
                    </div>

                    {inv.expected_harvest_date && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Récolte prévue: {new Date(inv.expected_harvest_date).toLocaleDateString("fr")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
