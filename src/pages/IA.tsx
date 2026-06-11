import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ScrollableTabs,
  ScrollableTabsList,
  ScrollableTabsTrigger,
} from "@/components/ui/scrollable-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Sprout, Droplets, Mic, Sparkles, MessageCircle, History, Camera, ArrowRight } from "lucide-react";
import { PlantDiseaseDetector } from "@/components/ai/PlantDiseaseDetector";
import { YieldPredictionModule } from "@/components/ai/YieldPredictionModule";
import { IrrigationRecommendationsModule } from "@/components/ai/IrrigationRecommendationsModule";
import { ScanHistory } from "@/components/ai/ScanHistory";
import { AIContextualTip } from "@/components/ai/AIContextualTip";
import { useLanguage } from "@/i18n/LanguageContext";

export default function IA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("disease");
  const { t } = useLanguage();

  return (
    <AppLayout>
      <PageHeader
        title={t("ai.title")}
        subtitle={t("ai.subtitle")}
      />

      <div className="px-4 pb-28 space-y-4">
        {/* AI Contextual Tip */}
        <AIContextualTip context="iot" />

        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
            onClick={() => navigate("/voice")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium block">{t("ai.voiceAssistant")}</span>
                <span className="text-xs text-muted-foreground">{t("ai.open")}</span>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20"
            onClick={() => navigate("/voice")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium block">{t("ai.chatIA")}</span>
                <span className="text-xs text-muted-foreground">{t("ai.chatDesc")}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Tabs — scrollable on mobile to avoid label collisions */}
        <ScrollableTabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollableTabsList className="w-full">
            <ScrollableTabsTrigger value="disease" className="gap-1.5">
              <Bug className="w-4 h-4" />
              <span>{t("ai.diseases")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="yield" className="gap-1.5">
              <Sprout className="w-4 h-4" />
              <span>{t("ai.yield")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="irrigation" className="gap-1.5">
              <Droplets className="w-4 h-4" />
              <span>{t("ai.irrigation")}</span>
            </ScrollableTabsTrigger>
            <ScrollableTabsTrigger value="history" className="gap-1.5">
              <History className="w-4 h-4" />
              <span>{t("ai.history")}</span>
            </ScrollableTabsTrigger>
          </ScrollableTabsList>

          <TabsContent value="disease" className="mt-4">
            <PlantDiseaseDetector />
          </TabsContent>

          <TabsContent value="yield" className="mt-4">
            <YieldPredictionModule />
          </TabsContent>

          <TabsContent value="irrigation" className="mt-4">
            <IrrigationRecommendationsModule />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScanHistory />
          </TabsContent>
        </ScrollableTabs>
      </div>
    </AppLayout>
  );
}
