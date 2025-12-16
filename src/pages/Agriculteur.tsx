import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  TrendingUp,
  Settings,
} from "lucide-react";
import { FarmOverview } from "@/components/farmer/FarmOverview";
import { FarmCalendar } from "@/components/farmer/FarmCalendar";
import { SalesStats } from "@/components/farmer/SalesStats";
import { useNavigate } from "react-router-dom";

export default function Agriculteur() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  return (
    <AppLayout>
      <PageHeader
        title="Mon exploitation"
        subtitle="Tableau de bord agriculteur"
        action={
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 mb-4">
            <TabsTrigger value="overview" className="flex flex-col gap-1 py-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">Aperçu</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex flex-col gap-1 py-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Calendrier</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex flex-col gap-1 py-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Ventes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <FarmOverview />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <FarmCalendar />
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <SalesStats />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
