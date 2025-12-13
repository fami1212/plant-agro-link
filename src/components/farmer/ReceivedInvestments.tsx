import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  Loader2,
  Banknote,
  Phone,
  Mail,
  MessageCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EmptyState } from "@/components/common/EmptyState";
import { toast } from "sonner";

interface ReceivedInvestment {
  id: string;
  title: string;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  investor_id: string;
  investor_name: string;
  investor_email?: string;
  investor_phone?: string;
}

interface InvestmentOpportunity {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  status: string;
  investments_count: number;
}

export function ReceivedInvestments() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<ReceivedInvestment[]>([]);
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch investments received
      const { data: investmentsData } = await supabase
        .from("investments")
        .select("*")
        .eq("farmer_id", user.id)
        .order("investment_date", { ascending: false });

      const investmentsWithNames = await Promise.all(
        (investmentsData || []).map(async (inv) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone")
            .eq("user_id", inv.investor_id)
            .maybeSingle();

          return {
            id: inv.id,
            title: inv.title,
            amount_invested: inv.amount_invested,
            expected_return_percent: inv.expected_return_percent || 15,
            status: inv.status,
            investment_date: inv.investment_date,
            expected_harvest_date: inv.expected_harvest_date,
            investor_id: inv.investor_id,
            investor_name: profile?.full_name || "Investisseur",
            investor_email: profile?.email || undefined,
            investor_phone: profile?.phone || undefined,
          };
        })
      );

      setInvestments(investmentsWithNames);

      // Fetch my opportunities
      const { data: oppsData } = await supabase
        .from("investment_opportunities")
        .select("id, title, target_amount, current_amount, status")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });

      const oppsWithCounts = await Promise.all(
        (oppsData || []).map(async (opp) => {
          const { count } = await supabase
            .from("investments")
            .select("id", { count: "exact", head: true })
            .eq("farmer_id", user.id)
            .eq("title", opp.title);

          return {
            ...opp,
            investments_count: count || 0,
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

  const totalReceived = investments.reduce((sum, inv) => sum + inv.amount_invested, 0);
  const totalToRepay = investments.reduce(
    (sum, inv) => sum + inv.amount_invested * (1 + inv.expected_return_percent / 100),
    0
  );
  const activeInvestors = new Set(investments.map((inv) => inv.investor_name)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Banknote className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold text-primary">{(totalReceived / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">Reçu</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-accent" />
            <p className="text-lg font-bold text-accent">{(totalToRepay / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">À rembourser</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50 border-secondary">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-secondary-foreground" />
            <p className="text-lg font-bold text-foreground">{activeInvestors}</p>
            <p className="text-xs text-muted-foreground">Investisseurs</p>
          </CardContent>
        </Card>
      </div>

      {/* My Opportunities */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Mes opportunités
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.map((opp) => {
              const progress = (opp.current_amount / opp.target_amount) * 100;
              return (
                <div key={opp.id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm truncate">{opp.title}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        opp.status === "ouverte" && "bg-primary/10 text-primary border-primary/30",
                        opp.status === "financee" && "bg-success/10 text-success border-success/30",
                        opp.status === "fermee" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {opp.status === "ouverte" ? "Ouverte" : opp.status === "financee" ? "Financée" : "Fermée"}
                    </Badge>
                  </div>
                  <Progress value={progress} className="h-1.5 mb-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{(opp.current_amount / 1000).toFixed(0)}k / {(opp.target_amount / 1000).toFixed(0)}k FCFA</span>
                    <span>{opp.investments_count} investisseur{opp.investments_count > 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Received Investments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Investissements reçus
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <EmptyState
              icon={<Wallet className="w-8 h-8" />}
              title="Aucun investissement"
              description="Créez une opportunité depuis la page Cultures"
            />
          ) : (
            <div className="space-y-3">
              {investments.map((inv) => (
                <InvestmentCard key={inv.id} investment={inv} onRefresh={fetchData} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvestmentCard({ investment: inv, onRefresh }: { investment: ReceivedInvestment; onRefresh: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleMarkComplete = async () => {
    setUpdating(true);
    try {
      const returnAmount = inv.amount_invested * (1 + inv.expected_return_percent / 100);
      
      const { error } = await supabase
        .from("investments")
        .update({ 
          status: "rembourse",
          actual_return_amount: returnAmount,
          actual_return_date: new Date().toISOString()
        })
        .eq("id", inv.id);

      if (error) throw error;
      toast.success("Investissement marqué comme remboursé");
      onRefresh();
    } catch (error) {
      console.error("Error updating investment:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const handleContact = (type: "call" | "whatsapp" | "email") => {
    if (type === "call" && inv.investor_phone) {
      window.open(`tel:${inv.investor_phone}`, "_self");
    } else if (type === "whatsapp" && inv.investor_phone) {
      window.open(`https://wa.me/${inv.investor_phone.replace(/\s/g, "")}`, "_blank");
    } else if (type === "email" && inv.investor_email) {
      window.open(`mailto:${inv.investor_email}`, "_self");
    } else {
      toast.error("Contact non disponible");
    }
  };

  return (
    <>
      <div className="p-3 rounded-lg border border-border bg-card">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-sm">{inv.title}</p>
            <p className="text-xs text-muted-foreground">
              Par {inv.investor_name} • {format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              inv.status === "en_cours" && "bg-warning/10 text-warning border-warning/30",
              (inv.status === "complete" || inv.status === "rembourse") && "bg-success/10 text-success border-success/30"
            )}
          >
            {inv.status === "en_cours" ? "En cours" : "Remboursé"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded bg-muted">
            <p className="text-sm font-bold">{(inv.amount_invested / 1000).toFixed(0)}k</p>
            <p className="text-xs text-muted-foreground">Reçu</p>
          </div>
          <div className="p-2 rounded bg-primary/10">
            <p className="text-sm font-bold text-primary">{inv.expected_return_percent}%</p>
            <p className="text-xs text-muted-foreground">Rendement</p>
          </div>
          <div className="p-2 rounded bg-accent/10">
            <p className="text-sm font-bold text-accent">
              {((inv.amount_invested * (1 + inv.expected_return_percent / 100)) / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-muted-foreground">À rembourser</p>
          </div>
        </div>
        {inv.expected_harvest_date && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Récolte prévue: {format(new Date(inv.expected_harvest_date), "dd MMM yyyy", { locale: fr })}</span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowDetails(true)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Détails
          </Button>
          {inv.status === "en_cours" && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleMarkComplete}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Marquer remboursé
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Investor Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'investissement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Investment Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">{inv.title}</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Montant investi</p>
                  <p className="font-medium">{inv.amount_invested.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rendement prévu</p>
                  <p className="font-medium text-primary">+{inv.expected_return_percent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">À rembourser</p>
                  <p className="font-medium text-accent">
                    {(inv.amount_invested * (1 + inv.expected_return_percent / 100)).toLocaleString()} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date investissement</p>
                  <p className="font-medium">{format(new Date(inv.investment_date), "dd MMM yyyy", { locale: fr })}</p>
                </div>
              </div>
            </div>

            {/* Investor Info */}
            <div className="p-4 rounded-lg border border-border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Investisseur
              </h4>
              <div className="space-y-2">
                <p className="font-medium">{inv.investor_name}</p>
                {inv.investor_email && (
                  <p className="text-sm text-muted-foreground">{inv.investor_email}</p>
                )}
                {inv.investor_phone && (
                  <p className="text-sm text-muted-foreground">{inv.investor_phone}</p>
                )}
              </div>
              
              {/* Contact buttons */}
              <div className="flex gap-2 mt-3">
                {inv.investor_phone && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleContact("call")}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleContact("whatsapp")}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {inv.investor_email && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleContact("email")}
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Blockchain Notice */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 Les informations de cet investissement seront utilisées pour la traçabilité blockchain 
                lors de la validation de la récolte et du remboursement.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
