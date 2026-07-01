import { Link, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKycStatus } from "@/hooks/useKycStatus";

/**
 * Persistent banner reminding the user to complete KYC. Rendered by AppLayout
 * so it appears on every authenticated page. Auto-hides when the user is
 * approved, is an admin, or is already on the KYC/auth pages.
 */
export function KycBanner() {
  const { user } = useAuth();
  const { kyc, isApproved, loading } = useKycStatus();
  const location = useLocation();

  if (!user || loading || isApproved) return null;
  if (location.pathname.startsWith("/kyc") || location.pathname.startsWith("/auth")) return null;

  const label = {
    pending: "Vérification KYC requise pour effectuer des actions",
    submitted: "Dossier KYC en cours d'examen",
    rejected: "Dossier KYC rejeté — corriger et re-soumettre",
    approved: "",
  }[kyc?.status ?? "pending"];

  return (
    <Link
      to="/kyc"
      className="block bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-3 py-2 text-xs sm:text-sm hover:bg-amber-500/20"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        <span className="underline">Ouvrir</span>
      </div>
    </Link>
  );
}
