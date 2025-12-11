import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Wallet,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Sprout,
  MapPin,
  Calendar,
  Loader2,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface InvestmentOpportunity {
  id: string;
  title: string;
  category: string;
  location: string;
  target_amount: number;
  current_amount: number;
  expected_roi: number;
  duration_months: number;
  risk_level: "low" | "medium" | "high";
  farmer_name: string;
  crop_type: string;
  field_size: number;
  status: "open" | "funded" | "in_progress" | "completed";
  created_at: string;
}

interface Investment {
  id: string;
  opportunity_id: string;
  amount: number;
  status: "active" | "completed" | "cancelled";
  expected_return: number;
  actual_return?: number;
  invested_at: string;
  opportunity: InvestmentOpportunity;
}

// Mock data for demo (to be replaced with real DB data)
const mockOpportunities: InvestmentOpportunity[] = [
  {
    id: "1",
    title: "Culture de Mil - Saison Pluviale",
    category: "Céréales",
    location: "Thiès, Sénégal",
    target_amount: 2500000,
    current_amount: 1750000,
    expected_roi: 25,
    duration_months: 6,
    risk_level: "low",
    farmer_name: "Mamadou Diallo",
    crop_type: "Mil Souna",
    field_size: 5,
    status: "open",
    created_at: "2024-01-15",
  },
  {
    id: "2",
    title: "Maraîchage Bio - Tomates",
    category: "Légumes",
    location: "Niayes, Dakar",
    target_amount: 1800000,
    current_amount: 1800000,
    expected_roi: 35,
    duration_months: 4,
    risk_level: "medium",
    farmer_name: "Fatou Sow",
    crop_type: "Tomate Roma",
    field_size: 2,
    status: "funded",
    created_at: "2024-01-10",
  },
  {
    id: "3",
    title: "Élevage Bovin - Embouche",
    category: "Bétail",
    location: "Kaolack",
    target_amount: 5000000,
    current_amount: 2000000,
    expected_roi: 40,
    duration_months: 8,
    risk_level: "high",
    farmer_name: "Ibrahima Ndiaye",
    crop_type: "Bovins",
    field_size: 10,
    status: "open",
    created_at: "2024-01-20",
  },
  {
    id: "4",
    title: "Riziculture - Vallée du Fleuve",
    category: "Céréales",
    location: "Saint-Louis",
    target_amount: 3500000,
    current_amount: 3500000,
    expected_roi: 30,
    duration_months: 5,
    risk_level: "low",
    farmer_name: "Ousmane Ba",
    crop_type: "Riz Sahel",
    field_size: 8,
    status: "in_progress",
    created_at: "2024-01-05",
  },
];

const mockInvestments: Investment[] = [
  {
    id: "inv1",
    opportunity_id: "2",
    amount: 500000,
    status: "active",
    expected_return: 675000,
    invested_at: "2024-01-12",
    opportunity: mockOpportunities[1],
  },
  {
    id: "inv2",
    opportunity_id: "4",
    amount: 750000,
    status: "active",
    expected_return: 975000,
    invested_at: "2024-01-08",
    opportunity: mockOpportunities[3],
  },
];

const riskColors = {
  low: "bg-green-500/10 text-green-600",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
};

const statusConfig = {
  open: { label: "Ouvert", color: "bg-primary/10 text-primary", icon: Clock },
  funded: { label: "Financé", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle },
  in_progress: { label: "En cours", color: "bg-warning/10 text-warning", icon: Sprout },
  completed: { label: "Terminé", color: "bg-green-500/10 text-green-600", icon: CheckCircle },
};

export default function Investisseur() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("opportunites");
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>(mockOpportunities);
  const [investments, setInvestments] = useState<Investment[]>(mockInvestments);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Calculate portfolio stats
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const expectedReturns = investments.reduce((sum, inv) => sum + inv.expected_return, 0);
  const potentialGain = expectedReturns - totalInvested;
  const avgROI = investments.length > 0 
    ? investments.reduce((sum, inv) => sum + ((inv.expected_return - inv.amount) / inv.amount) * 100, 0) / investments.length 
    : 0;

  const filteredOpportunities = opportunities.filter(opp => {
    if (selectedCategory === "all") return opp.status === "open";
    return opp.category === selectedCategory && opp.status === "open";
  });

  const handleInvest = (opportunity: InvestmentOpportunity) => {
    toast.success(`Investissement dans "${opportunity.title}" initié`, {
      description: "Vous serez contacté pour finaliser la transaction",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Espace Investisseur"
        subtitle={`Bonjour ${profile?.full_name || "Investisseur"}`}
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
                {investments.length} investissements
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
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {["all", "Céréales", "Légumes", "Bétail", "Fruits"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all",
                    selectedCategory === cat
                      ? "gradient-hero text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {cat === "all" ? "Tous" : cat}
                </button>
              ))}
            </div>

            {/* Opportunities List */}
            {filteredOpportunities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucune opportunité disponible</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.map((opp, index) => (
                  <Card key={opp.id} className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)} style={{ opacity: 0 }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold line-clamp-1">{opp.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{opp.location}</span>
                          </div>
                        </div>
                        <Badge className={riskColors[opp.risk_level]}>
                          {opp.risk_level === "low" ? "Faible" : opp.risk_level === "medium" ? "Moyen" : "Élevé"}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Financement</span>
                          <span className="font-medium">
                            {Math.round((opp.current_amount / opp.target_amount) * 100)}%
                          </span>
                        </div>
                        <Progress value={(opp.current_amount / opp.target_amount) * 100} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>{opp.current_amount.toLocaleString()} FCFA</span>
                          <span>Objectif: {opp.target_amount.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <p className="text-lg font-bold text-primary">{opp.expected_roi}%</p>
                          <p className="text-xs text-muted-foreground">ROI attendu</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <p className="text-lg font-bold">{opp.duration_months}</p>
                          <p className="text-xs text-muted-foreground">Mois</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <p className="text-lg font-bold">{opp.field_size}</p>
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
                            <p className="text-xs text-muted-foreground">{opp.crop_type}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{opp.category}</Badge>
                      </div>

                      <Button className="w-full" onClick={() => handleInvest(opp)}>
                        <Banknote className="w-4 h-4 mr-2" />
                        Investir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PORTEFEUILLE TAB */}
          <TabsContent value="portefeuille" className="mt-4 space-y-4 pb-24">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{investments.filter(i => i.status === "active").length}</p>
                  <p className="text-xs text-muted-foreground">Actifs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{investments.filter(i => i.status === "completed").length}</p>
                  <p className="text-xs text-muted-foreground">Terminés</p>
                </CardContent>
              </Card>
            </div>

            {investments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Aucun investissement</p>
                  <Button className="mt-4" onClick={() => setActiveTab("opportunites")}>
                    Voir les opportunités
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {investments.map((inv, index) => {
                  const StatusIcon = statusConfig[inv.opportunity.status]?.icon || Clock;
                  return (
                    <Card key={inv.id} className={cn("animate-fade-in", `stagger-${(index % 5) + 1}`)} style={{ opacity: 0 }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{inv.opportunity.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              Investi le {format(new Date(inv.invested_at), "dd MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          <Badge className={statusConfig[inv.opportunity.status]?.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig[inv.opportunity.status]?.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground">Montant investi</p>
                            <p className="font-bold">{inv.amount.toLocaleString()} FCFA</p>
                          </div>
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <p className="text-xs text-muted-foreground">Retour attendu</p>
                            <p className="font-bold text-primary">{inv.expected_return.toLocaleString()} FCFA</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              +{((inv.expected_return - inv.amount) / inv.amount * 100).toFixed(0)}% ROI
                            </span>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                        </div>
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
                    <span className="text-sm text-muted-foreground">Gains totaux</span>
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

            {/* Performance History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Historique des rendements</CardTitle>
              </CardHeader>
              <CardContent>
                {investments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun historique disponible
                  </p>
                ) : (
                  <div className="space-y-3">
                    {investments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{inv.opportunity.title}</p>
                          <p className="text-xs text-muted-foreground">{inv.opportunity.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            +{(inv.expected_return - inv.amount).toLocaleString()} FCFA
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {((inv.expected_return - inv.amount) / inv.amount * 100).toFixed(0)}% ROI
                          </p>
                        </div>
                      </div>
                    ))}
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
    </AppLayout>
  );
}
