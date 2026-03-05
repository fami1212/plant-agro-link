import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { FarmerInvestmentDashboard } from "@/components/farmer/FarmerInvestmentDashboard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function FarmerInvestments() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AppLayout>
      <PageHeader
        title={t("farmer.investments")}
        subtitle={t("farmer.investmentsSubtitle")}
        action={
          <Button variant="hero" size="sm" onClick={() => navigate("/cultures")}>
            <Plus className="w-4 h-4 mr-1" />
            {t("farmer.newOpportunity")}
          </Button>
        }
      />
      <div className="px-4 pb-6">
        <FarmerInvestmentDashboard />
      </div>
    </AppLayout>
  );
}