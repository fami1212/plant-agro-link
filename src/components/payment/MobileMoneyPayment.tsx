import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Copy,
  Phone
} from "lucide-react";
import { toast } from "sonner";
import {
  PaymentProvider,
  PaymentType,
  initiatePayment,
  getProviderInfo,
  calculateFees,
  formatCurrency,
  validatePhoneNumber,
  generateUSSDCode,
} from "@/services/paymentService";

interface MobileMoneyPaymentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  paymentType: PaymentType;
  referenceId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
}

type PaymentStep = 'select' | 'confirm' | 'processing' | 'success' | 'error';

export function MobileMoneyPayment({
  open,
  onOpenChange,
  amount,
  description,
  paymentType,
  referenceId,
  onSuccess,
  onError,
}: MobileMoneyPaymentProps) {
  const [step, setStep] = useState<PaymentStep>('select');
  const [provider, setProvider] = useState<PaymentProvider>('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const providerInfo = getProviderInfo(provider);
  const fees = calculateFees(amount, provider);
  const totalAmount = amount + fees;

  const handleProviderSelect = (value: PaymentProvider) => {
    setProvider(value);
  };

  const handleConfirm = () => {
    if (provider !== 'cash' && !validatePhoneNumber(phoneNumber)) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    setStep('confirm');
  };

  const handlePayment = async () => {
    setStep('processing');
    
    try {
      const response = await initiatePayment({
        amount,
        provider,
        phoneNumber,
        description,
        paymentType,
        referenceId,
      });

      if (response.status === 'completed') {
        setTransactionId(response.transactionId);
        setStep('success');
        onSuccess?.(response.transactionId);
      } else {
        setErrorMessage(response.message || 'Erreur de paiement');
        setStep('error');
        onError?.(response.message || 'Erreur de paiement');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Erreur inattendue');
      setStep('error');
      onError?.(error.message);
    }
  };

  const handleClose = () => {
    setStep('select');
    setPhoneNumber('');
    setTransactionId('');
    setErrorMessage('');
    onOpenChange(false);
  };

  const ussdCode = generateUSSDCode(provider, totalAmount);

  const copyUSSD = () => {
    if (ussdCode) {
      navigator.clipboard.writeText(ussdCode);
      toast.success("Code USSD copié !");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Paiement Mobile Money
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{description}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(amount)}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Choisir le mode de paiement</Label>
              <RadioGroup
                value={provider}
                onValueChange={(v) => handleProviderSelect(v as PaymentProvider)}
                className="grid gap-2"
              >
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="orange_money" />
                  <span className="text-2xl">🟠</span>
                  <div className="flex-1">
                    <p className="font-medium">Orange Money</p>
                    <p className="text-xs text-muted-foreground">Frais: 1%</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="wave" />
                  <span className="text-2xl">🌊</span>
                  <div className="flex-1">
                    <p className="font-medium">Wave</p>
                    <p className="text-xs text-muted-foreground">Frais: 0.5%</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="mtn" />
                  <span className="text-2xl">🟡</span>
                  <div className="flex-1">
                    <p className="font-medium">MTN Mobile Money</p>
                    <p className="text-xs text-muted-foreground">Frais: 1.5%</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="cash" />
                  <span className="text-2xl">💵</span>
                  <div className="flex-1">
                    <p className="font-medium">Espèces (à la livraison)</p>
                    <p className="text-xs text-muted-foreground">Sans frais</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {provider !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-l-md border border-r-0">
                    <span className="text-sm text-muted-foreground">+221</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="77 123 45 67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Montant</span>
                <span>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frais ({getProviderInfo(provider).fees * 100}%)</span>
                <span>{formatCurrency(fees)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleConfirm}
              disabled={provider !== 'cash' && !phoneNumber}
            >
              Continuer
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <span className="text-4xl">{providerInfo.icon}</span>
              <p className="font-semibold mt-2">{providerInfo.name}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatCurrency(totalAmount)}
              </p>
            </div>

            {ussdCode && (
              <div className="p-3 bg-accent/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Code USSD (optionnel)</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono">{ussdCode}</code>
                  <Button variant="ghost" size="sm" onClick={copyUSSD}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {provider !== 'cash' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>Paiement sur: +221 {phoneNumber}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('select')}>
                Retour
              </Button>
              <Button className="flex-1" onClick={handlePayment}>
                {provider === 'cash' ? 'Confirmer la commande' : 'Payer maintenant'}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <div>
              <p className="font-semibold">Traitement en cours...</p>
              <p className="text-sm text-muted-foreground">
                {provider === 'cash' 
                  ? "Confirmation de la commande" 
                  : "Vérifiez votre téléphone pour valider le paiement"}
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div>
              <p className="font-semibold text-lg">Paiement réussi !</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(totalAmount)} via {providerInfo.name}
              </p>
            </div>
            <Badge variant="outline" className="font-mono">
              {transactionId}
            </Badge>
            <Button className="w-full" onClick={handleClose}>
              Terminé
            </Button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-lg">Échec du paiement</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={() => setStep('select')}>
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
