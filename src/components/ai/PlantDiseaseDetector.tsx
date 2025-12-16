import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Leaf,
  Bug,
  Pill,
  ShieldCheck,
  XCircle,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiseaseAnalysis {
  disease_name: string;
  confidence: number;
  severity: string;
  description: string;
  causes: string[];
  treatments: { type: string; name: string; dosage?: string; application?: string }[];
  prevention: string[];
  urgency: string;
  additional_notes?: string;
}

const cropTypes = [
  { value: "tomate", label: "Tomate" },
  { value: "mais", label: "Maïs" },
  { value: "riz", label: "Riz" },
  { value: "manioc", label: "Manioc" },
  { value: "arachide", label: "Arachide" },
  { value: "mil", label: "Mil" },
  { value: "sorgho", label: "Sorgho" },
  { value: "oignon", label: "Oignon" },
  { value: "pomme_de_terre", label: "Pomme de terre" },
  { value: "haricot", label: "Haricot" },
  { value: "autre", label: "Autre" },
];

export function PlantDiseaseDetector() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropType, setCropType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 10 MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setLoading(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke("detect-disease", {
        body: {
          imageBase64: selectedImage,
          cropType: cropType || undefined,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnalysis(data.analysis);
      toast.success("Analyse terminée");
    } catch (error: any) {
      console.error("Error analyzing image:", error);
      toast.error(error.message || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "low":
      case "faible":
        return "bg-green-500";
      case "moderate":
      case "moyenne":
        return "bg-yellow-500";
      case "high":
      case "élevée":
        return "bg-orange-500";
      case "critical":
      case "critique":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "faible":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "moyenne":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "élevée":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "critique":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Leaf className="w-4 h-4" />;
    }
  };

  const isHealthy = analysis?.disease_name?.toLowerCase().includes("sain");

  return (
    <div className="space-y-4">
      {/* Image Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            Détection de maladies IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Crop Type Selection */}
          <div>
            <Label>Type de culture (optionnel)</Label>
            <Select value={cropType} onValueChange={setCropType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                {cropTypes.map((crop) => (
                  <SelectItem key={crop.value} value={crop.value}>
                    {crop.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Preview or Upload Area */}
          {selectedImage ? (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Plante sélectionnée"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelectedImage(null);
                  setAnalysis(null);
                }}
              >
                Changer
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Prenez une photo ou sélectionnez une image de votre plante
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Galerie
                </Button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Analyze Button */}
          <Button
            className="w-full"
            onClick={analyzeImage}
            disabled={!selectedImage || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Analyser l'image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card className={isHealthy ? "border-green-500" : "border-destructive"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {isHealthy ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                )}
                Résultat de l'analyse
              </CardTitle>
              <Badge className={getSeverityColor(analysis.severity)}>
                {analysis.confidence}% confiance
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Disease Name */}
            <div className="p-3 rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg">{analysis.disease_name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {analysis.description}
              </p>
            </div>

            {/* Urgency */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              {getUrgencyIcon(analysis.urgency)}
              <span className="text-sm font-medium">
                Urgence: {analysis.urgency}
              </span>
            </div>

            {/* Causes */}
            {analysis.causes && analysis.causes.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4" />
                  Causes probables
                </h4>
                <ul className="space-y-1">
                  {analysis.causes.map((cause, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Treatments */}
            {analysis.treatments && analysis.treatments.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4" />
                  Traitements recommandés
                </h4>
                <div className="space-y-2">
                  {analysis.treatments.map((treatment, i) => (
                    <div key={i} className="p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {treatment.type}
                        </Badge>
                        <span className="font-medium text-sm">{treatment.name}</span>
                      </div>
                      {(treatment.dosage || treatment.application) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {treatment.dosage && `Dosage: ${treatment.dosage}`}
                          {treatment.application && ` • ${treatment.application}`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prevention */}
            {analysis.prevention && analysis.prevention.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  Mesures préventives
                </h4>
                <ul className="space-y-1">
                  {analysis.prevention.map((measure, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Notes */}
            {analysis.additional_notes && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm">{analysis.additional_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}