import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Shield, AlertTriangle, CheckCircle2, Loader2, PenLine, Globe } from "lucide-react";
import { toast } from "sonner";
import { AnchorButton } from "@/components/blockchain/AnchorButton";
import {
  buildSignature,
  saveSignature,
  getSignatures,
  type SignaturePayload,
} from "@/lib/signature";
import { useAuth } from "@/hooks/useAuth";

interface ContractData {
  projectTitle: string;
  farmerName: string;
  investorName: string;
  amount: number;
  returnPercent: number;
  harvestDate: string | null;
  contractDate: string;
}

interface InvestmentContractProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractData: ContractData;
  onSign: (signature?: SignaturePayload) => Promise<void>;
  /** When provided, the signature is persisted and linked to this target. */
  signatureTarget?: {
    type: "transaction" | "investment" | "investment_request";
    id: string | null;
  };
  /** Which side the current user is signing as. */
  signerRole?: "investor" | "farmer" | "witness";
}

export function InvestmentContract({
  open,
  onOpenChange,
  contractData,
  onSign,
  signatureTarget,
  signerRole = "investor",
}: InvestmentContractProps) {
  const { user } = useAuth();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState(
    signerRole === "farmer" ? contractData.farmerName || "" : contractData.investorName || "",
  );
  const [signature, setSignature] = useState<SignaturePayload | null>(null);
  const [allSignatures, setAllSignatures] = useState<Array<SignaturePayload & { user_id: string }>>([]);

  // Load existing signatures for the target to avoid double-signing bug.
  useEffect(() => {
    if (!open || !signatureTarget?.id) return;
    (async () => {
      const list = await getSignatures(signatureTarget.type, signatureTarget.id!);
      setAllSignatures(list as any);
      const mine = user ? list.find((s: any) => s.user_id === user.id) : null;
      if (mine) {
        setSignature(mine);
        setSigned(true);
      }
    })();
  }, [open, signatureTarget?.id, signatureTarget?.type, user?.id]);

  const handleSign = async () => {
    if (!acceptedTerms || !acceptedRisks) {
      toast.error("Veuillez accepter toutes les conditions");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Saisissez votre nom complet pour signer");
      return;
    }
    setSigning(true);
    try {
      const sig = await buildSignature(signerName.trim(), {
        signer_role: signerRole,
        contract_snapshot: {
          projectTitle: contractData.projectTitle,
          farmerName: contractData.farmerName,
          investorName: signerName.trim(),
          amount: contractData.amount,
          returnPercent: contractData.returnPercent,
          harvestDate: contractData.harvestDate,
          contractDate: contractData.contractDate,
        },
      });
      setSignature(sig);
      await onSign(sig);
      if (user && signatureTarget) {
        await saveSignature(user.id, signatureTarget.type, signatureTarget.id, sig);
      } else if (user) {
        // Fallback: still persist the audit trail with no target link.
        await saveSignature(user.id, "investment", null, sig);
      }
      // Refresh the aggregated list for the counterparty banner.
      if (signatureTarget?.id) {
        const list = await getSignatures(signatureTarget.type, signatureTarget.id);
        setAllSignatures(list as any);
        // If both sides signed, flip transaction status to SIGNED.
        if (
          signatureTarget.type === "transaction" &&
          list.some((s: any) => s.signer_role === "investor") &&
          list.some((s: any) => s.signer_role === "farmer")
        ) {
          await (supabase as any)
            .from("transactions")
            .update({ status: "SIGNED", signed_at: new Date().toISOString() })
            .eq("id", signatureTarget.id);
        }
      }
      setSigned(true);
      toast.success("Contrat signé avec succès !");
    } catch {
      toast.error("Erreur lors de la signature");
    } finally {
      setSigning(false);
    }
  };

  const estimatedReturn = contractData.amount * (1 + contractData.returnPercent / 100);
  const contractId = `CTR-${Date.now().toString(36).toUpperCase()}`;

  const handleClose = () => {
    onOpenChange(false);
    // Do NOT reset `signed`/`signature` — they may be already-persisted state
    // (avoids the "please sign again" bug when reopening).
    setTimeout(() => {
      setAcceptedTerms(false);
      setAcceptedRisks(false);
    }, 300);
  };

  const counterpartRole = signerRole === "investor" ? "farmer" : "investor";
  const counterpartSignature = allSignatures.find((s: any) => s.signer_role === counterpartRole);
  const bothSigned =
    allSignatures.some((s: any) => s.signer_role === "investor") &&
    allSignatures.some((s: any) => s.signer_role === "farmer");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Contrat d'investissement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Contract Header */}
          <div className="text-center p-4 rounded-xl bg-muted/50 border">
            <p className="text-xs text-muted-foreground">Contrat N°</p>
            <p className="font-mono font-bold text-lg">{contractId}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(contractData.contractDate).toLocaleDateString("fr-FR", { dateStyle: "long" })}
            </p>
          </div>

          {/* Parties */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm">Parties au contrat</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-primary/5">
                  <p className="text-xs text-muted-foreground">Investisseur</p>
                  <p className="font-medium">{contractData.investorName}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/5">
                  <p className="text-xs text-muted-foreground">Agriculteur</p>
                  <p className="font-medium">{contractData.farmerName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm">Termes financiers</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Projet</span>
                  <span className="font-medium">{contractData.projectTitle}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Montant investi</span>
                  <span className="font-bold">{contractData.amount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">ROI attendu</span>
                  <span className="font-bold text-success">{contractData.returnPercent}%</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-success/10 border border-success/20">
                  <span className="font-medium">Retour estimé</span>
                  <span className="font-bold text-success">{estimatedReturn.toLocaleString()} FCFA</span>
                </div>
                {contractData.harvestDate && (
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Récolte prévue</span>
                    <span>{new Date(contractData.harvestDate).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Clauses */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="font-semibold text-sm">Clauses principales</h4>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li>Le rendement est estimatif et dépend des conditions agricoles et climatiques.</li>
                <li>Les fonds sont sécurisés via un contrat intelligent sur la blockchain PlantErea.</li>
                <li>Le remboursement est prévu après la récolte et la vente des produits.</li>
                <li>En cas de sinistre majeur, une médiation sera organisée sur la plateforme.</li>
                <li>La plateforme prélève des frais de 2% sur les gains réalisés.</li>
              </ul>
            </CardContent>
          </Card>

          {/* Risk Warning */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Avertissement :</strong> Tout investissement comporte des risques. 
              Les rendements passés ne garantissent pas les performances futures. Investissez uniquement ce que vous pouvez vous permettre de perdre.
            </p>
          </div>

          {/* Acceptance */}
          {!signed && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="signer-name" className="text-xs font-medium flex items-center gap-1">
                  <PenLine className="w-3.5 h-3.5" /> Signature — Nom complet
                </label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Prénom Nom"
                />
                <p className="text-[10px] text-muted-foreground">
                  En signant, votre nom, l'horodatage, votre adresse IP et votre appareil seront enregistrés comme preuve d'accord.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(!!v)} />
                <label htmlFor="terms" className="text-xs leading-tight cursor-pointer">
                  J'ai lu et j'accepte les termes et conditions du contrat d'investissement.
                </label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="risks" checked={acceptedRisks} onCheckedChange={(v) => setAcceptedRisks(!!v)} />
                <label htmlFor="risks" className="text-xs leading-tight cursor-pointer">
                  Je comprends les risques liés à l'investissement agricole et j'investis en connaissance de cause.
                </label>
              </div>
            </div>
          )}

          {/* Signed Confirmation */}
          {signed && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
              <p className="font-semibold text-success">Contrat signé</p>
              <p className="text-xs text-muted-foreground">
                Votre signature électronique a été enregistrée.
              </p>
              {signature && (
                <div className="text-left text-[11px] bg-background/60 rounded-lg p-2 space-y-1 font-mono">
                  <div><b>Signataire :</b> {signature.signer_name}</div>
                  <div><b>Horodatage :</b> {new Date(signature.signed_at).toLocaleString()}</div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <b>IP :</b> {signature.ip_address || "n/a"}
                  </div>
                  <div><b>Appareil :</b> {signature.device}</div>
                </div>
              )}
              <Badge variant="outline" className="font-mono text-xs">{contractId}</Badge>
              <div className="pt-2">
                <AnchorButton
                  transactionType="investment_contract"
                  referenceId={contractId}
                  data={{
                    contractId,
                    projectTitle: contractData.projectTitle,
                    farmerName: contractData.farmerName,
                    investorName: contractData.investorName,
                    amount: contractData.amount,
                    returnPercent: contractData.returnPercent,
                    harvestDate: contractData.harvestDate,
                    contractDate: contractData.contractDate,
                  }}
                  label="Ancrer le contrat sur blockchain"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {signed ? (
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button
                onClick={handleSign}
                disabled={!acceptedTerms || !acceptedRisks || signing}
                className="gap-1.5"
              >
                {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Signer le contrat
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
