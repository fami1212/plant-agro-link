import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvestmentContract } from "@/components/investor/InvestmentContract";
import { Loader2 } from "lucide-react";
import { TransactionTimeline } from "@/components/transactions/TransactionTimeline";
import { InvestmentRoiSummary } from "@/components/investor/InvestmentRoiSummary";
import { InvestmentEventLog } from "@/components/investor/InvestmentEventLog";

interface Tx {
  id: string;
  title: string | null;
  amount: number;
  currency: string;
  initiator_id: string;
  receiver_id: string;
  status: string;
  metadata: Record<string, any> | null;
  created_at: string;
  amount_released?: number | null;
  trace_ref?: string | null;
}

export default function ContractSign() {
  const { transactionId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [investorName, setInvestorName] = useState("Investisseur");
  const [farmerName, setFarmerName] = useState("Agriculteur");

  useEffect(() => {
    (async () => {
      if (!transactionId) return;
      const { data } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .maybeSingle();
      setTx(data as Tx);
      if (data) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("user_id,full_name")
          .in("user_id", [data.initiator_id, data.receiver_id]);
        (ps || []).forEach((p: any) => {
          if (p.user_id === data.initiator_id) setInvestorName(p.full_name || "Investisseur");
          if (p.user_id === data.receiver_id) setFarmerName(p.full_name || "Agriculteur");
        });
      }
      setLoading(false);
    })();
  }, [transactionId]);

  const iAmInvestor = !!user && tx?.initiator_id === user.id;
  const iAmFarmer = !!user && tx?.receiver_id === user.id;

  if (loading)
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </AppLayout>
    );

  if (!tx)
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="p-6 text-center">Contrat introuvable.</Card>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <PageHeader title="Contrat d'investissement" subtitle="Signature bilatérale" />
      <div className="p-4 space-y-3">
        <Card className="p-4 text-sm space-y-1">
          <p><b>Projet :</b> {tx.title}</p>
          <p><b>Montant :</b> {tx.amount.toLocaleString()} {tx.currency}</p>
          <p><b>Statut :</b> {tx.status}</p>
          {tx.trace_ref && <p><b>Référence traçabilité :</b> <span className="font-mono">{tx.trace_ref}</span></p>}
          <p className="text-muted-foreground">
            Chaque partie doit signer pour activer l'escrow et le suivi contractuel.
          </p>
        </Card>
        <Button onClick={() => setOpen(true)} className="w-full">
          Ouvrir le contrat
        </Button>

        {/* Récapitulatif ROI */}
        <InvestmentRoiSummary
          amountInvested={tx.amount}
          returnPercent={Number(tx.metadata?.expected_return) || 0}
          investmentDate={tx.created_at}
          harvestDate={(tx.metadata?.harvest_date as string) || null}
          releasedAmount={Number(tx.amount_released || 0)}
        />

        {/* Timeline interactive des étapes escrow */}
        <Card className="p-4">
          <p className="font-semibold text-sm mb-2">Étapes du contrat (escrow)</p>
          <TransactionTimeline
            transactionId={tx.id}
            currentUserIsInitiator={iAmInvestor}
            currency={tx.currency || "XOF"}
          />
        </Card>

        {/* Centre de suivi */}
        <InvestmentEventLog transactionId={tx.id} />

        <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
          Retour
        </Button>
      </div>

      <InvestmentContract
        open={open}
        onOpenChange={setOpen}
        contractData={{
          projectTitle: tx.title || "Investissement",
          farmerName,
          investorName,
          amount: tx.amount,
          returnPercent: Number(tx.metadata?.expected_return) || 0,
          harvestDate: (tx.metadata?.harvest_date as string) || null,
          contractDate: tx.created_at,
        }}
        signerRole={iAmInvestor ? "investor" : iAmFarmer ? "farmer" : "witness"}
        signatureTarget={{ type: "transaction", id: tx.id }}
        onSign={async () => {
          /* handled by InvestmentContract */
        }}
      />
    </AppLayout>
  );
}