import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Loader2 } from "lucide-react";

// This page now redirects to role-specific marketplace pages
export default function Marketplace() {
  const navigate = useNavigate();
  const { isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin } = useRoleAccess();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Give a small delay for roles to load
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;

    // Redirect based on role
    if (isAgriculteur || isAdmin) {
      navigate("/marketplace/farmer", { replace: true });
    } else if (isInvestisseur) {
      navigate("/marketplace/investor", { replace: true });
    } else if (isVeterinaire) {
      navigate("/marketplace/farmer", { replace: true });
    } else if (isAcheteur) {
      navigate("/marketplace/buyer", { replace: true });
    } else {
      navigate("/marketplace/buyer", { replace: true });
    }
  }, [ready, isAgriculteur, isVeterinaire, isAcheteur, isInvestisseur, isAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
