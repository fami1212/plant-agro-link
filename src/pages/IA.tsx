import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bug,
  Sprout,
  Droplets,
  Brain,
  Sparkles,
} from "lucide-react";
import { PlantDiseaseDetector } from "@/components/ai/PlantDiseaseDetector";

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
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-primary" />
                  Prédiction de rendement
                  <Badge variant="secondary">Bientôt</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Module en développement</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ce module analysera vos données historiques, les conditions météo
                  et les données IoT pour prédire le rendement de vos cultures.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <Badge variant="outline">Historique production</Badge>
                  <Badge variant="outline">Données météo</Badge>
                  <Badge variant="outline">Capteurs IoT</Badge>
                  <Badge variant="outline">Type de sol</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="irrigation" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary" />
                  Recommandations irrigation
                  <Badge variant="secondary">Bientôt</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Module en développement</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ce module fournira des recommandations personnalisées pour
                  l'irrigation et la fertilisation basées sur vos capteurs IoT.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <Badge variant="outline">Humidité sol</Badge>
                  <Badge variant="outline">Température</Badge>
                  <Badge variant="outline">Prévisions météo</Badge>
                  <Badge variant="outline">Besoins culture</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}