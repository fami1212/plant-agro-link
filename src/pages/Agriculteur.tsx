import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { ScrollableTabs, ScrollableTabsList, ScrollableTabsTrigger } from "@/components/ui/scrollable-tabs";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Settings,
} from "lucide-react";
import { FarmOverview } from "@/components/farmer/FarmOverview";
import { FarmCalendar } from "@/components/farmer/FarmCalendar";
import { FarmerFinanceSimple } from "@/components/farmer/FarmerFinanceSimple";
import { useNavigate } from "react-router-dom";

export default function Agriculteur() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mon exploitation"
        subtitle="Gérez votre ferme simplement"
        action={
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 pb-28">
        <ScrollableTabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollableTabsList className="mb-4">
            <ScrollableTabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Aperçu</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Calendrier</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="finances" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>Finances</span>
            </ScrollableTabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="overview" className="mt-0">
            <FarmOverview />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <FarmCalendar />
          </TabsContent>

          <TabsContent value="finances" className="mt-0">
            <FarmerFinanceSimple />
          </TabsContent>
        </ScrollableTabs>
      </div>
    </AppLayout>
  );
}
