import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ReceivedInvestments } from "@/components/farmer/ReceivedInvestments";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function FarmerInvestments() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mes financements"
        subtitle="Gérez les investissements reçus"
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
        <ReceivedInvestments />
      </div>
    </AppLayout>
  );
}
