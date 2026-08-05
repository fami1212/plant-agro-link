import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Download, MessageSquare, Loader2, CheckCircle2, Clock,
  Calendar, User, Percent, Wallet, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { downloadContractPDF, traceRefOf } from "@/services/contractExport";
import { TransactionTimeline } from "@/components/transactions/TransactionTimeline";
import { DirectMessageDialog } from "@/components/messaging/DirectMessageDialog";

export interface InvestmentDetail {
  id: string;
  title: string;
  amount_invested: number;
  expected_return_percent: number;
  status: string;
  investment_date: string;
  expected_harvest_date: string | null;
  actual_return_amount?: number | null;
  farmer_id?: string;
  farmer_name?: string;
}

interface Props {
  investment: InvestmentDetail | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

/** Vue contrat détaillée d'un investissement : parties, termes, signatures, suivi escrow. */
export function InvestmentDetailSheet({ investment, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState<any>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!open || !investment || !user) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("type", "INVESTMENT")
        .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      const match =
        (data || []).find(
          (t: any) =>
            (t.title || "").toLowerCase() === investment.title.toLowerCase() ||
            (investment.farmer_id &&
              (t.receiver_id === investment.farmer_id || t.initiator_id === investment.farmer_id)),
        ) || null;
      setTx(match);
      if (match) {
        const { data: sigs } = await (supabase as any)
          .from("contract_signatures")
          .select("*")
          .eq("target_type", "transaction")
          .eq("target_id", match.id);
        setSignatures(sigs || []);
      } else {
        setSignatures([]);
      }
      setLoading(false);
    })();
  }, [open, investment?.id, user?.id]);

  if (!investment) return null;

  const expected = investment.amount_invested * (1 + investment.expected_return_percent / 100);
  const gain = expected - investment.amount_invested;
  const hasInvestorSig = signatures.some((s) => s.signer_role === "investor");
  const hasFarmerSig = signatures.some((s) => s.signer_role === "farmer");
  const bothSigned = hasInvestorSig && hasFarmerSig;

  const handleExport = async () => {
    if (!tx) return toast.error("Contrat non disponible");
    setExporting(true);
    try {
      await downloadContractPDF(tx.id);
      toast.success("Contrat exporté en PDF");
    } catch (e: any) {
      toast.error(e?.message || "Export impossible");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {investment.title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-3 pb-8">
          {/* Résumé clair */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Agriculteur financé</span>
              <span className="font-semibold ml-auto">{investment.farmer_name || "Agriculteur"}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-muted">
                <Wallet className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="font-bold text-sm">{fcfa(investment.amount_invested)}</p>
                <p className="text-[10px] text-muted-foreground">Investi</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Percent className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="font-bold text-sm text-primary">{investment.expected_return_percent}%</p>
                <p className="text-[10px] text-muted-foreground">ROI contractuel</p>
              </div>
              <div className="p-2.5 rounded-xl bg-success/10">
                <CheckCircle2 className="w-4 h-4 mx-auto text-success mb-1" />
                <p className="font-bold text-sm text-success">+{fcfa(gain)}</p>
                <p className="text-[10px] text-muted-foreground">Gain estimé</p>
              </div>
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Montant à recevoir à terme</span>
                <span className="font-semibold text-foreground">{fcfa(expected)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date d'investissement</span>
                <span className="text-foreground">
                  {new Date(investment.investment_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Récolte prévue</span>
                <span className="text-foreground">
                  {investment.expected_harvest_date
                    ? new Date(investment.expected_harvest_date).toLocaleDateString("fr-FR")
                    : "À définir"}
                </span>
              </div>
              {tx?.trace_ref && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Référence traçabilité</span>
                  <span className="font-mono text-foreground">{traceRefOf(tx)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Statut contrat */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Statut du contrat</p>
              <Badge className={bothSigned ? "bg-green-600" : "bg-amber-500"}>
                {bothSigned ? "Signé par les 2 parties" : "Signatures en attente"}
              </Badge>
            </div>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : tx ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-1.5">
                    {hasInvestorSig ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    Investisseur {hasInvestorSig ? "signé" : "en attente"}
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-1.5">
                    {hasFarmerSig ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    Agriculteur {hasFarmerSig ? "signé" : "en attente"}
                  </div>
                </div>
                <Progress value={((hasInvestorSig ? 1 : 0) + (hasFarmerSig ? 1 : 0)) * 50} className="h-1.5" />
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => navigate(`/contract/${tx.id}`)}>
                    {hasInvestorSig ? "Voir le contrat" : "Signer le contrat"}
                  </Button>
                  <Button size="sm" variant="outline" disabled={exporting} onClick={handleExport}>
                    {exporting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1" />
                    )}
                    PDF
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucun contrat formel rattaché pour l'instant. PlantErea prépare le contrat après
                validation de la demande d'investissement.
              </p>
            )}
          </Card>

          {/* Suivi escrow / étapes */}
          {tx && (
            <Card className="p-4">
              <p className="font-semibold text-sm mb-2">Suivi du financement</p>
              <TransactionTimeline transactionId={tx.id} />
            </Card>
          )}

          <div className="grid grid-cols-2 gap-2">
            {investment.farmer_id && (
              <Button variant="outline" onClick={() => setChatOpen(true)}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Discuter
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate("/transactions")}>
              Toutes mes transactions
            </Button>
          </div>
        </div>

        {investment.farmer_id && (
          <DirectMessageDialog
            open={chatOpen}
            onOpenChange={setChatOpen}
            otherUserId={investment.farmer_id}
            otherUserName={investment.farmer_name || "Agriculteur"}
            context={`Investissement: ${investment.title}`}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
