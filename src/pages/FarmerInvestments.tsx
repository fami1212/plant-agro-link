import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { FarmerInvestmentDashboard } from "@/components/farmer/FarmerInvestmentDashboard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";

export default function FarmerInvestments() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mes financements"
        subtitle="Gérez vos investissements et opportunités"
        action={
          <Button
            variant="hero"
            size="sm"
            onClick={() => navigate("/cultures")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle opportunité
          </Button>
        }
      />

      <div className="px-4 pb-6">
        <FarmerInvestmentDashboard />
      </div>
    </AppLayout>
  );
}
