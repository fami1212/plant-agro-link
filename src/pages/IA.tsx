import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Sprout, Droplets, Mic, Sparkles, MessageCircle, History } from "lucide-react";
import { PlantDiseaseDetector } from "@/components/ai/PlantDiseaseDetector";
import { YieldPredictionModule } from "@/components/ai/YieldPredictionModule";
import { IrrigationRecommendationsModule } from "@/components/ai/IrrigationRecommendationsModule";
import { ScanHistory } from "@/components/ai/ScanHistory";

export default function IA() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("disease");

  return (
    <AppLayout>
      <PageHeader
        title="Intelligence Artificielle"
        subtitle="Outils IA pour votre exploitation"
      />

      <div className="px-4 pb-28 space-y-4">
        {/* Voice Assistant CTA - Prominent for accessibility */}
        <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Mic className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">Assistant Vocal</h3>
                <p className="text-sm text-primary-foreground/80 mb-2">
                  Parlez à l'IA - pas besoin de taper !
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="gap-1"
                    onClick={() => navigate("/voice")}
                  >
                    <Mic className="w-4 h-4" />
                    Ouvrir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick AI Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/voice")}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Chat IA</span>
              <span className="text-xs text-muted-foreground">Posez vos questions</span>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/voice")}
          >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-sm font-medium">Conseils IA</span>
              <span className="text-xs text-muted-foreground">Recommandations</span>
            </CardContent>
          </Card>
        </div>

        {/* AI Tools Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="disease" className="flex flex-col gap-1 py-2">
              <Bug className="w-4 h-4" />
              <span className="text-xs">Maladies</span>
            </TabsTrigger>
            <TabsTrigger value="yield" className="flex flex-col gap-1 py-2">
              <Sprout className="w-4 h-4" />
              <span className="text-xs">Rendement</span>
            </TabsTrigger>
            <TabsTrigger value="irrigation" className="flex flex-col gap-1 py-2">
              <Droplets className="w-4 h-4" />
              <span className="text-xs">Irrigation</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex flex-col gap-1 py-2">
              <History className="w-4 h-4" />
              <span className="text-xs">Historique</span>
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      </div>
    </AppLayout>
  );
}
