import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Handshake, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  farmerId: string;
  farmerName: string;
  opportunityId?: string;
  suggestedAmount?: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function RequestInvestmentDialog({
  farmerId,
  farmerName,
  opportunityId,
  suggestedAmount,
  open,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(suggestedAmount || 100000);
  const [expectedReturn, setExpectedReturn] = useState(15);
  const [duration, setDuration] = useState(6);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("investment_requests").insert({
      investor_id: user.id,
      farmer_id: farmerId,
      opportunity_id: opportunityId,
      amount,
      currency: "XOF",
      expected_return: expectedReturn,
      duration_months: duration,
      message,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée à PlantErea — un admin vous recontacte.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" /> Demander à investir
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Votre demande est transmise à <b>PlantErea</b> qui négocie avec{" "}
            <b>{farmerName}</b> et vous prépare un contrat.
          </p>
          <div>
            <label className="text-sm font-medium">Montant (XOF)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium">ROI attendu %</label>
              <Input
                type="number"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Durée (mois)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Message pour l'admin/agriculteur</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Vos attentes, questions, conditions..."
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={saving || amount <= 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer la demande"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}