import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Anchor, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnchorButtonProps {
  transactionType: "investment_contract" | "marketplace_order" | "traceability" | "harvest" | "escrow";
  data: Record<string, any>;
  referenceId?: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

/**
 * Reusable button that anchors arbitrary data on Polygon Amoy via the
 * `blockchain-anchor` edge function. Displays tx hash + Polygonscan link
 * after success.
 */
export function AnchorButton({
  transactionType,
  data,
  referenceId,
  label = "Ancrer sur blockchain",
  size = "sm",
  variant = "outline",
  className,
}: AnchorButtonProps) {
  const [anchoring, setAnchoring] = useState(false);
  const [result, setResult] = useState<{ tx_hash: string; explorer_url: string } | null>(null);

  const handleAnchor = async () => {
    setAnchoring(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("blockchain-anchor", {
        body: {
          transaction_type: transactionType,
          reference_id: referenceId,
          data,
        },
      });
      if (error) throw error;
      const r = res as { tx_hash?: string; explorer_url?: string; error?: string };
      if (r?.error) throw new Error(r.error);
      if (!r?.tx_hash) throw new Error("Réponse invalide");
      setResult({ tx_hash: r.tx_hash, explorer_url: r.explorer_url! });
      toast.success("Ancrage blockchain réussi");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'ancrage blockchain");
    } finally {
      setAnchoring(false);
    }
  };

  if (result) {
    return (
      <div className={"space-y-1 " + (className ?? "")}>
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-medium">Ancré sur Polygon Amoy</span>
        </div>
        <code className="block text-[10px] font-mono break-all text-muted-foreground">
          {result.tx_hash}
        </code>
        <a
          href={result.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
        >
          Voir sur Polygonscan <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleAnchor}
      disabled={anchoring}
      className={className}
    >
      {anchoring ? (
        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> En cours…</>
      ) : (
        <><Anchor className="w-4 h-4 mr-1" /> {label}</>
      )}
    </Button>
  );
}