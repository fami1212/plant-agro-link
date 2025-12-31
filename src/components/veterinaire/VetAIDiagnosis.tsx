import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Camera, ImagePlus, Loader2, Stethoscope, AlertTriangle, 
  CheckCircle, Pill, Calendar, Phone, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DiagnosisResult {
  condition: string;
  confidence: number;
  severity: "faible" | "modérée" | "élevée" | "critique";
  symptoms: string[];
  possibleCauses: string[];
  recommendedTreatment: string;
  urgency: "routine" | "urgent" | "emergency";
  followUp: string;
}

interface VetAIDiagnosisProps {
  animalId?: string;
  animalInfo?: {
    species: string;
    breed?: string;
    identifier: string;
  };
  onDiagnosisComplete?: (diagnosis: DiagnosisResult) => void;
}

export function VetAIDiagnosis({ animalId, animalInfo, onDiagnosisComplete }: VetAIDiagnosisProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
        setDiagnosis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeDiagnosis = async () => {
    if (!imageData) return;
    
    setIsAnalyzing(true);
    try {
      const base64Image = imageData.split(",")[1];
      
      const response = await supabase.functions.invoke("smart-camera-analyze", {
        body: {
          image: base64Image,
          context: "veterinary_diagnosis",
          animalInfo: animalInfo || null,
          prompt: `Tu es un assistant vétérinaire expert. Analyse cette image d'animal pour identifier d'éventuels problèmes de santé.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte:
{
  "condition": "nom de la condition ou 'Animal en bonne santé'",
  "confidence": 85,
  "severity": "faible|modérée|élevée|critique",
  "symptoms": ["symptôme 1", "symptôme 2"],
  "possibleCauses": ["cause possible 1", "cause possible 2"],
  "recommendedTreatment": "description du traitement recommandé",
  "urgency": "routine|urgent|emergency",
  "followUp": "recommandations de suivi"
}

Sois précis et professionnel dans ton analyse. Si l'image n'est pas claire ou ne montre pas d'animal, indique-le.`
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (result.analysis) {
        try {
          const parsed = typeof result.analysis === "string" 
            ? JSON.parse(result.analysis) 
            : result.analysis;
          setDiagnosis(parsed);
          onDiagnosisComplete?.(parsed);
        } catch {
          // If not JSON, create a basic result
          setDiagnosis({
            condition: "Analyse incomplète",
            confidence: 50,
            severity: "faible",
            symptoms: ["Voir les détails ci-dessous"],
            possibleCauses: [result.analysis || "Non déterminé"],
            recommendedTreatment: "Consultation vétérinaire recommandée",
            urgency: "routine",
            followUp: "Prendre rendez-vous pour un examen approfondi"
          });
        }
      }
    } catch (error) {
      console.error("Diagnosis error:", error);
      toast.error("Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityConfig = (severity: string) => {
    const config: Record<string, { color: string; label: string }> = {
      faible: { color: "bg-green-100 text-green-800", label: "Faible" },
      modérée: { color: "bg-yellow-100 text-yellow-800", label: "Modérée" },
      élevée: { color: "bg-orange-100 text-orange-800", label: "Élevée" },
      critique: { color: "bg-red-100 text-red-800", label: "Critique" },
    };
    return config[severity] || config.faible;
  };

  const getUrgencyConfig = (urgency: string) => {
    const config: Record<string, { color: string; label: string; icon: any }> = {
      routine: { color: "text-green-600", label: "Routine", icon: CheckCircle },
      urgent: { color: "text-orange-600", label: "Urgent", icon: AlertTriangle },
      emergency: { color: "text-red-600", label: "Urgence", icon: Phone },
    };
    return config[urgency] || config.routine;
  };

  const reset = () => {
    setImageData(null);
    setDiagnosis(null);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          Diagnostic IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!imageData ? (
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1">Prendre ou importer une photo</p>
            <p className="text-sm text-muted-foreground">
              Photo de l'animal ou de la zone affectée
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative">
            <img 
              src={imageData} 
              alt="Animal" 
              className="w-full h-48 object-cover rounded-xl"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={reset}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {imageData && !diagnosis && (
          <Button 
            onClick={analyzeDiagnosis} 
            disabled={isAnalyzing}
            className="w-full"
            variant="hero"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Stethoscope className="w-4 h-4 mr-2" />
                Analyser
              </>
            )}
          </Button>
        )}

        {diagnosis && (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-4">
              {/* Condition & Severity */}
              <div className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{diagnosis.condition}</h3>
                  <Badge className={getSeverityConfig(diagnosis.severity).color}>
                    {getSeverityConfig(diagnosis.severity).label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Confiance:</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${diagnosis.confidence}%` }}
                    />
                  </div>
                  <span className="font-medium">{diagnosis.confidence}%</span>
                </div>
              </div>

              {/* Urgency */}
              <div className={cn(
                "p-3 rounded-xl flex items-center gap-3",
                diagnosis.urgency === "emergency" ? "bg-red-50" : 
                diagnosis.urgency === "urgent" ? "bg-orange-50" : "bg-green-50"
              )}>
                {(() => {
                  const config = getUrgencyConfig(diagnosis.urgency);
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className={cn("w-5 h-5", config.color)} />
                      <span className={cn("font-medium", config.color)}>
                        Niveau d'urgence: {config.label}
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Symptoms */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Symptômes observés</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {diagnosis.symptoms.map((symptom, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        {symptom}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Possible Causes */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Causes possibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {diagnosis.possibleCauses.map((cause, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-3 h-3 text-warning mt-1 shrink-0" />
                        {cause}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Treatment */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Traitement recommandé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{diagnosis.recommendedTreatment}</p>
                </CardContent>
              </Card>

              {/* Follow-up */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Suivi recommandé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{diagnosis.followUp}</p>
                </CardContent>
              </Card>

              <Button onClick={reset} variant="outline" className="w-full">
                <ImagePlus className="w-4 h-4 mr-2" />
                Nouvelle analyse
              </Button>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
