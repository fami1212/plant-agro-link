import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, Briefcase, Search, Loader2, MapPin,
  Calendar, Percent, ArrowUpRight, Wallet
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MobileMoneyPayment } from "@/components/payment/MobileMoneyPayment";
import type { Database } from "@/integrations/supabase/types";

type InvestmentOpportunity = Database["public"]["Tables"]["investment_opportunities"]["Row"];
type Investment = Database["public"]["Tables"]["investments"]["Row"];

export default function MarketplaceInvestor() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [investAmount, setInvestAmount] = useState(0);
  
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [myInvestments, setMyInvestments] = useState<Investment[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    gains: 0,
    active: 0,
  });

  useEffect(() => {
    if (user) fetchData();
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
    
    const total = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
    const gains = investments.reduce((sum, inv) => {
      return sum + (inv.amount_invested * (inv.expected_return_percent || 0) / 100);
    }, 0);
    const active = investments.filter(inv => inv.status === "actif").length;
    
    setStats({ total, gains, active });
  };

  const handleInvest = (opp: InvestmentOpportunity) => {
    const remaining = opp.target_amount - (opp.current_amount || 0);
    setSelectedOpportunity(opp);
    setInvestAmount(Math.min(100000, remaining)); // Default 100k or remaining
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    if (!selectedOpportunity || !user) return;
    
    // Create investment record
    await supabase.from("investments").insert({
      investor_id: user.id,
      farmer_id: selectedOpportunity.farmer_id,
      title: selectedOpportunity.title,
      description: selectedOpportunity.description,
      amount_invested: investAmount,
      expected_return_percent: selectedOpportunity.expected_return_percent,
      expected_harvest_date: selectedOpportunity.expected_harvest_date,
      field_id: selectedOpportunity.field_id,
      crop_id: selectedOpportunity.crop_id,
      status: "actif",
    });

    // Update opportunity current_amount
    await supabase
      .from("investment_opportunities")
      .update({ 
        current_amount: (selectedOpportunity.current_amount || 0) + investAmount 
      })
      .eq("id", selectedOpportunity.id);
    
    setShowPayment(false);
    setSelectedOpportunity(null);
    toast.success("Investissement effectué !");
    fetchData();
  };

  const filteredOpportunities = opportunities.filter((opp) =>
    opp.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskBadge = (risk: string | null) => {
    const config: Record<string, { color: string; label: string }> = {
      faible: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Faible" },
      moyen: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Moyen" },
      eleve: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Élevé" },
    };
    const c = config[risk || "moyen"] || config.moyen;
    return <Badge className={c.color}>{c.label}</Badge>;
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
        subtitle="Financez l'agriculture sénégalaise"
      />

      {/* Portfolio Summary */}
      <div className="px-4 mb-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <CardContent className="p-4 relative">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-bold text-primary">
                  {stats.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">FCFA investis</p>
              </div>
              <div className="space-y-1 border-x border-border/30">
                <div className="flex items-center justify-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-600">
                  +{stats.gains.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">Gains prévus</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>
                <p className="text-lg font-bold text-primary">
                  {stats.active}
                </p>
                <p className="text-[10px] text-muted-foreground">Actifs</p>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">ROI moyen</span>
                  <span className="font-semibold text-green-600">
                    +{stats.total > 0 ? Math.round((stats.gains / stats.total) * 100) : 0}%
                  </span>
                </div>
                <Progress value={(stats.gains / stats.total) * 100} className="h-1 mt-1.5" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="opportunites" className="flex flex-col gap-0.5 text-[11px]">
              <TrendingUp className="w-4 h-4" />
              Opportunités
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex flex-col gap-0.5 text-[11px]">
              <Briefcase className="w-4 h-4" />
              Portfolio
            </TabsTrigger>
          </TabsList>

          {/* OPPORTUNITÉS */}
          <TabsContent value="opportunites" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Aucune opportunité disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOpportunities.map((opp) => {
                  const progress = opp.current_amount 
                    ? (opp.current_amount / opp.target_amount) * 100 
                    : 0;
                  const remaining = opp.target_amount - (opp.current_amount || 0);

                  return (
                    <Card key={opp.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{opp.title}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span>{opp.location || "Sénégal"}</span>
                            </div>
                          </div>
                          {getRiskBadge(opp.risk_level)}
                        </div>

                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {opp.description}
                        </p>

                        <div className="flex items-center justify-between mb-3 text-xs">
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <Percent className="w-3 h-3" />
                            {opp.expected_return_percent}% rendement
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {opp.expected_harvest_date 
                              ? new Date(opp.expected_harvest_date).toLocaleDateString("fr", { month: "short", year: "numeric" })
                              : "À définir"
                            }
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Financement</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                          <p className="text-xs text-muted-foreground text-right">
                            {remaining.toLocaleString()} FCFA restants
                          </p>
                        </div>

                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleInvest(opp)}
                          disabled={remaining <= 0}
                        >
                          <Wallet className="w-4 h-4 mr-1" />
                          Investir maintenant
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PORTFOLIO */}
          <TabsContent value="portfolio" className="mt-4 space-y-3">
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
                <Card key={inv.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{inv.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.investment_date).toLocaleDateString("fr")}
                      </p>
                    </div>
                    <Badge variant={inv.status === "actif" ? "default" : "secondary"} className="text-[10px]">
                      {inv.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Investi</p>
                      <p className="font-semibold text-primary text-sm">
                        {inv.amount_invested.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rendement</p>
                      <p className="font-semibold text-green-600 text-sm flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        +{inv.expected_return_percent}%
                      </p>
                    </div>
                  </div>

                  {inv.expected_harvest_date && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Récolte: {new Date(inv.expected_harvest_date).toLocaleDateString("fr")}
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Money Payment */}
      {selectedOpportunity && (
        <MobileMoneyPayment
          open={showPayment}
          onOpenChange={setShowPayment}
          amount={investAmount}
          description={`Investissement: ${selectedOpportunity.title}`}
          paymentType="marketplace"
          referenceId={selectedOpportunity.id}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </AppLayout>
  );
}
