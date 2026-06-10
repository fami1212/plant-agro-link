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
  FileDown,
  Wheat,
  PawPrint,
  MapPin,
  Activity,
  Brain,
  Cpu,
} from "lucide-react";
import { FarmOverview } from "@/components/farmer/FarmOverview";
import { FarmCalendar } from "@/components/farmer/FarmCalendar";
import { FarmerFinanceSimple } from "@/components/farmer/FarmerFinanceSimple";
import { WeatherWidget } from "@/components/farmer/WeatherWidget";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateAgriculturalReportPDF } from "@/services/pdfService";
import { toast } from "sonner";

export default function Agriculteur() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { user, profile } = useAuth();

  const handleExportReport = async () => {
    if (!user) return;
    try {
      const [fieldsRes, cropsRes, livestockRes, harvestRes] = await Promise.all([
        supabase.from("fields").select("name, area_hectares, soil_type, status").eq("user_id", user.id),
        supabase.from("crops").select("name, crop_type, status, sowing_date, expected_yield_kg, fields:field_id(name)").eq("user_id", user.id),
        supabase.from("livestock").select("identifier, species, breed, health_status, weight_kg").eq("user_id", user.id),
        supabase.from("harvest_records").select("quantity_kg, quality_grade").eq("user_id", user.id),
      ]);
      generateAgriculturalReportPDF({
        farmerName: profile?.full_name || "Agriculteur",
        fields: (fieldsRes.data || []).map(f => ({ name: f.name, area: f.area_hectares, soilType: f.soil_type, status: f.status || "active" })),
        crops: (cropsRes.data || []).map(c => ({ name: c.name, type: c.crop_type, field: (c.fields as any)?.name || "-", status: c.status, sowingDate: c.sowing_date || undefined, expectedYield: c.expected_yield_kg || undefined })),
        livestock: (livestockRes.data || []).map(l => ({ identifier: l.identifier, species: l.species, breed: l.breed || undefined, health: l.health_status, weight: l.weight_kg || undefined })),
        harvestSummary: {
          totalKg: (harvestRes.data || []).reduce((s, h) => s + (h.quantity_kg || 0), 0),
          avgQuality: (harvestRes.data || [])[0]?.quality_grade || "N/A",
          recordCount: (harvestRes.data || []).length,
        },
      });
      toast.success(t("pdf.agriculturalReport"));
    } catch (err) {
      console.error(err);
      toast.error("Erreur export PDF");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title={t("farmer.title")}
        subtitle={t("farmer.subtitle")}
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleExportReport} title={t("pdf.agriculturalReport")}>
              <FileDown className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-28">
        <ScrollableTabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollableTabsList className="mb-5 bg-muted/40 p-1 rounded-xl">
            <ScrollableTabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("farmer.overview")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="calendar" 
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>{t("farmer.calendar")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="cultures"
              onClick={() => navigate("/cultures")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Wheat className="w-4 h-4" />
              <span>{t("nav.crops")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="betail"
              onClick={() => navigate("/betail")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <PawPrint className="w-4 h-4" />
              <span>{t("nav.livestock")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="parcelles"
              onClick={() => navigate("/parcelles")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <MapPin className="w-4 h-4" />
              <span>{t("nav.parcels")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="iot"
              onClick={() => navigate("/iot")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Activity className="w-4 h-4" />
              <span>{t("nav.iot")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="devices"
              onClick={() => navigate("/devices")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Cpu className="w-4 h-4" />
              <span>Devices</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger
              value="ia"
              onClick={() => navigate("/ia")}
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Brain className="w-4 h-4" />
              <span>{t("nav.ai")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="finances" 
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
            >
              <Wallet className="w-4 h-4" />
              <span>{t("farmer.finances")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger 
              value="meteo" 
              className="flex items-center gap-2 data-[state=active]:bg-background rounded-lg"
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