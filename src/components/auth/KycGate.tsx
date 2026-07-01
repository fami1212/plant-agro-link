import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ShieldCheck, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKycStatus } from "@/hooks/useKycStatus";

interface KycGateProps {
  children: ReactNode;
  /**
   * If true, the wrapped content is fully hidden until the user is approved.
   * If false (default), the children still render but an approval banner is
   * shown on top so that non-restricted UI stays visible.
   */
  blocking?: boolean;
  title?: string;
}

/**
 * Wrap any action or route that requires an admin-approved KYC.
 * Admins bypass the gate automatically (`isApproved` is true for them).
 */
export function KycGate({ children, blocking = true, title }: KycGateProps) {
  const { kyc, loading, isApproved } = useKycStatus();

  if (loading) return null;
  if (isApproved) return <>{children}</>;

  const status = kyc?.status ?? "pending";
  const info = {
    pending: {
      icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
      label: "Vérification KYC requise",
      desc: "Pour accéder à cette fonctionnalité vous devez soumettre vos pièces d'identité.",
      cta: "Démarrer la vérification",
    },
    submitted: {
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      label: "Dossier en cours d'examen",
      desc: "Un administrateur va valider votre dossier sous 24 à 48h.",
      cta: "Voir mon dossier",
    },
    rejected: {
      icon: <XCircle className="w-6 h-6 text-red-500" />,
      label: "Dossier rejeté",
      desc: kyc?.admin_notes || "Veuillez mettre à jour vos informations et le soumettre à nouveau.",
      cta: "Corriger mon dossier",
    },
    approved: {
      icon: <ShieldCheck className="w-6 h-6 text-green-500" />,
      label: "Compte vérifié",
      desc: "",
      cta: "",
    },
  }[status];

  const banner = (
    <Card className="p-4 flex items-start gap-3 border-amber-500/40 bg-amber-500/5">
      {info.icon}
      <div className="flex-1">
        <p className="font-semibold">{title || info.label}</p>
        <p className="text-sm text-muted-foreground">{info.desc}</p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/kyc">{info.cta}</Link>
        </Button>
      </div>
    </Card>
  );

  if (!blocking) {
    return (
      <div className="space-y-4">
        {banner}
        {children}
      </div>
    );
  }
  return <div className="p-4">{banner}</div>;
}
