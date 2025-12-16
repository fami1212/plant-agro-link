import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Sprout, Droplets } from "lucide-react";
import { PlantDiseaseDetector } from "@/components/ai/PlantDiseaseDetector";
import { YieldPredictionModule } from "@/components/ai/YieldPredictionModule";
import { IrrigationRecommendationsModule } from "@/components/ai/IrrigationRecommendationsModule";

export default function IA() {
  const [activeTab, setActiveTab] = useState("disease");

  return (
    <AppLayout>
      <PageHeader
        title="Intelligence Artificielle"
        subtitle="Outils IA pour votre exploitation"
      />

      <div className="px-4 pb-28">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 mb-4">
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
          </TabsList>

          <TabsContent value="disease" className="mt-0">
            <PlantDiseaseDetector />
          </TabsContent>

          <TabsContent value="yield" className="mt-0">
            <YieldPredictionModule />
          </TabsContent>

          <TabsContent value="irrigation" className="mt-0">
            <IrrigationRecommendationsModule />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
