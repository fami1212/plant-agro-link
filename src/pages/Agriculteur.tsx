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
  CloudSun,
} from "lucide-react";
import { FarmOverview } from "@/components/farmer/FarmOverview";
import { FarmCalendar } from "@/components/farmer/FarmCalendar";
import { FarmerFinanceSimple } from "@/components/farmer/FarmerFinanceSimple";
import { WeatherWidget } from "@/components/farmer/WeatherWidget";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Agriculteur() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AppLayout>
      <PageHeader
        title={t("farmer.title")}
        subtitle={t("farmer.subtitle")}
        action={
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        }
      />

      <div className="px-4 pb-28">
        <ScrollableTabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollableTabsList className="mb-5 bg-muted/50 p-1 rounded-xl">
            <ScrollableTabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("farmer.overview")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="calendar" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>{t("farmer.calendar")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="finances" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Wallet className="w-4 h-4" />
              <span>{t("farmer.finances")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="meteo" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <CloudSun className="w-4 h-4" />
              <span>{t("farmer.weather")}</span>
            </ScrollableTabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="overview" className="mt-0 animate-fade-in">
            <FarmOverview />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0 animate-fade-in">
            <FarmCalendar />
          </TabsContent>

          <TabsContent value="finances" className="mt-0 animate-fade-in">
            <FarmerFinanceSimple />
          </TabsContent>

          <TabsContent value="meteo" className="mt-0 animate-fade-in">
            <WeatherWidget />
          </TabsContent>
        </ScrollableTabs>
      </div>
    </AppLayout>
  );
}