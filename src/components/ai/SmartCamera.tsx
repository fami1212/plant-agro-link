import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, Sparkles, Check, ImagePlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type AnalysisType = 
  | "crop_identification"
  | "disease_detection" 
  | "livestock_identification"
  | "harvest_maturity"
  | "field_analysis"
  | "unknown";

interface AnalysisResult {
  type: AnalysisType;
  confidence: number;
  data: Record<string, any>;
  suggestedActions: SuggestedAction[];
}

interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => Promise<void>;
}

interface SmartCameraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: "cultures" | "parcelles" | "betail" | "recoltes" | "general";
  onActionComplete?: (result: any) => void;
}

// French labels for analysis data keys
const frenchLabels: Record<string, string> = {
  cropName: "Nom de la culture",
  cropType: "Type de culture",
  variety: "Variété",
  growthStage: "Stade de croissance",
  healthIssue: "Problème de santé",
  diseaseName: "Nom de la maladie",
  severity: "Sévérité",
  affectedPart: "Partie affectée",
  treatment: "Traitement recommandé",
  species: "Espèce",
  breed: "Race",
  estimatedWeight: "Poids estimé (kg)",
  healthConcern: "Problème de santé",
  maturityLevel: "Niveau de maturité (%)",
  suggestedHarvestDate: "Date de récolte suggérée",
  qualityIndicators: "Indicateurs de qualité",
  soilType: "Type de sol",
  vegetation: "Végétation",
  estimatedArea: "Surface estimée (ha)",
  fieldName: "Nom suggéré",
  additionalInfo: "Informations supplémentaires",
  rawResponse: "Réponse brute",
  error: "Erreur"
};

export function SmartCamera({ open, onOpenChange, context = "general", onActionComplete }: SmartCameraProps) {
  const { user } = useAuth();
  const [imageData, setImageData] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Impossible d'accéder à la caméra");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setImageData(dataUrl);
      stopCamera();
      analyzeImage(dataUrl);
    }
  }, [stopCamera]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageData(dataUrl);
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("smart-camera-analyze", {
        body: { 
          imageBase64: base64Image.split(",")[1],
          context,
          userId: user?.id
        }
      });

      if (error) throw error;

      const result: AnalysisResult = {
        type: data.type,
        confidence: data.confidence,
        data: data.analysis,
        suggestedActions: buildActions(data.type, data.analysis)
      };

      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse de l'image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const buildActions = (type: AnalysisType, analysis: Record<string, any>): SuggestedAction[] => {
    const actions: SuggestedAction[] = [];

    switch (type) {
      case "crop_identification":
        actions.push({
          id: "add_crop",
          label: "Ajouter cette culture",
          description: `Créer une fiche pour ${analysis.cropName || "cette culture"}`,
          icon: "🌱",
          action: async () => {
            await createCropFromAnalysis(analysis);
          }
        });
        if (analysis.healthIssue) {
          actions.push({
            id: "diagnose",
            label: "Analyser la maladie",
            description: "Obtenir un diagnostic détaillé",
            icon: "🔬",
            action: async () => {
              await diagnosePlantDisease(analysis);
            }
          });
        }
        break;

      case "disease_detection":
        actions.push({
          id: "save_diagnostic",
          label: "Sauvegarder le diagnostic",
          description: `${analysis.diseaseName || "Maladie détectée"}: ${analysis.severity || "À évaluer"}`,
          icon: "📋",
          action: async () => {
            await saveDiagnostic(analysis);
          }
        });
        actions.push({
          id: "get_treatment",
          label: "Voir les traitements",
          description: "Recommandations de traitement",
          icon: "💊",
          action: async () => {
            toast.info(analysis.treatment || "Consultez un agronome pour le traitement approprié");
          }
        });
        break;

      case "livestock_identification":
        actions.push({
          id: "add_livestock",
          label: "Enregistrer cet animal",
          description: `${getSpeciesLabel(analysis.species)} - ${analysis.breed || "Race non identifiée"}`,
          icon: "🐄",
          action: async () => {
            await createLivestockFromAnalysis(analysis);
          }
        });
        if (analysis.healthConcern) {
          actions.push({
            id: "vet_alert",
            label: "Alerter un vétérinaire",
            description: "Demander une consultation urgente",
            icon: "🏥",
            action: async () => {
              await alertVeterinarian(analysis);
            }
          });
        }
        // Always offer vet alert option
        actions.push({
          id: "schedule_vet",
          label: "Planifier visite vétérinaire",
          description: "Demander un rendez-vous",
          icon: "📅",
          action: async () => {
            await scheduleVetVisit(analysis);
          }
        });
        break;

      case "harvest_maturity":
        actions.push({
          id: "record_harvest",
          label: "Enregistrer la récolte",
          description: `Maturité: ${analysis.maturityLevel || "À évaluer"}%`,
          icon: "🌾",
          action: async () => {
            await recordHarvestFromAnalysis(analysis);
          }
        });
        actions.push({
          id: "schedule_harvest",
          label: "Planifier la récolte",
          description: `Date suggérée: ${analysis.suggestedHarvestDate || "Bientôt"}`,
          icon: "📅",
          action: async () => {
            toast.info(`Récolte recommandée: ${analysis.suggestedHarvestDate || "dans quelques jours"}`);
          }
        });
        break;

      case "field_analysis":
        actions.push({
          id: "create_field",
          label: "Créer cette parcelle",
          description: `${analysis.estimatedArea ? `${analysis.estimatedArea} ha` : "Surface à définir"}`,
          icon: "🗺️",
          action: async () => {
            await createFieldFromAnalysis(analysis);
          }
        });
        break;

      default:
        actions.push({
          id: "retry",
          label: "Réessayer l'analyse",
          description: "L'IA n'a pas pu identifier le contenu",
          icon: "🔄",
          action: async () => {
            if (imageData) analyzeImage(imageData);
          }
        });
    }

    return actions;
  };

  // Helper to get species label in French
  const getSpeciesLabel = (species: any): string => {
    if (!species) return "Animal";
    const speciesStr = String(species).toLowerCase();
    const labels: Record<string, string> = {
      bovin: "Bovin", vache: "Bovin", boeuf: "Bovin", taureau: "Bovin", cow: "Bovin",
      ovin: "Ovin", mouton: "Ovin", brebis: "Ovin", sheep: "Ovin",
      caprin: "Caprin", chèvre: "Caprin", goat: "Caprin",
      volaille: "Volaille", poulet: "Volaille", poule: "Volaille", chicken: "Volaille",
      porcin: "Porcin", porc: "Porcin", cochon: "Porcin", pig: "Porcin",
      equin: "Équin", cheval: "Équin", horse: "Équin"
    };
    return labels[speciesStr] || "Animal";
  };

  // Action implementations
  const createCropFromAnalysis = async (analysis: Record<string, any>) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }
    
    try {
      const { data: fields } = await supabase
        .from("fields")
        .select("id, name")
        .eq("user_id", user.id)
        .limit(1);

      if (!fields?.length) {
        toast.error("Créez d'abord une parcelle pour ajouter une culture");
        return;
      }

      const { error } = await supabase.from("crops").insert({
        user_id: user.id,
        field_id: fields[0].id,
        name: String(analysis.cropName || "Nouvelle culture"),
        crop_type: mapCropType(String(analysis.cropType || "")) as any,
        variety: analysis.variety ? String(analysis.variety) : null,
        status: "en_croissance" as const,
        notes: `Ajouté par IA. ${analysis.additionalInfo ? String(analysis.additionalInfo) : ""}`
      });

      if (error) throw error;
      toast.success(`Culture "${analysis.cropName}" ajoutée avec succès!`);
      onActionComplete?.({ type: "crop_created", data: analysis });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création de la culture");
    }
  };

  const createLivestockFromAnalysis = async (analysis: Record<string, any>) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }
    
    try {
      // Safely handle species - ensure it's a string
      const speciesValue = analysis.species ? String(analysis.species) : "";
      const speciesPrefix = speciesValue.length >= 3 
        ? speciesValue.substring(0, 3).toUpperCase() 
        : "ANI";
      
      const { error } = await supabase.from("livestock").insert({
        user_id: user.id,
        identifier: `${speciesPrefix}-${Date.now().toString(36).toUpperCase()}`,
        species: mapSpecies(speciesValue) as any,
        breed: analysis.breed ? String(analysis.breed) : null,
        health_status: analysis.healthConcern ? "traitement" as const : "sain" as const,
        weight_kg: analysis.estimatedWeight ? Number(analysis.estimatedWeight) : null,
        notes: `Ajouté par IA. ${analysis.additionalInfo ? String(analysis.additionalInfo) : ""}`
      });

      if (error) throw error;
      toast.success("Animal enregistré avec succès!");
      onActionComplete?.({ type: "livestock_created", data: analysis });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement de l'animal");
    }
  };

  const createFieldFromAnalysis = async (analysis: Record<string, any>) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }
    
    try {
      // Parse area - ensure it's a valid number
      let areaValue = 1;
      if (analysis.estimatedArea) {
        const parsed = parseFloat(String(analysis.estimatedArea).replace(/[^\d.]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          areaValue = parsed;
        }
      }

      const { error } = await supabase.from("fields").insert({
        user_id: user.id,
        name: String(analysis.fieldName || "Nouvelle parcelle"),
        area_hectares: areaValue,
        soil_type: mapSoilType(String(analysis.soilType || "")) as any,
        status: "active" as const,
        description: `Créé par IA. ${analysis.additionalInfo ? String(analysis.additionalInfo) : ""}`
      });

      if (error) throw error;
      toast.success("Parcelle créée avec succès!");
      onActionComplete?.({ type: "field_created", data: analysis });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création de la parcelle");
    }
  };

  const alertVeterinarian = async (analysis: Record<string, any>) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }

    try {
      // Find available veterinarians
      const { data: vets } = await supabase
        .from("service_providers")
        .select("id, user_id, business_name, phone, whatsapp")
        .eq("service_category", "veterinaire")
        .eq("is_active", true)
        .limit(5);

      if (!vets?.length) {
        toast.info("Aucun vétérinaire disponible. Consultez le marketplace pour trouver un vétérinaire.");
        return;
      }

      // Create urgent booking request
      const { error } = await supabase.from("service_bookings").insert({
        client_id: user.id,
        provider_id: vets[0].id,
        service_type: "consultation_urgente",
        description: `Alerte santé animale détectée par IA: ${analysis.healthConcern || "À examiner"}. Espèce: ${getSpeciesLabel(analysis.species)}. Race: ${analysis.breed || "Non identifiée"}.`,
        scheduled_date: new Date().toISOString().split('T')[0],
        status: "pending",
        notes: `Détection automatique par caméra IA. Poids estimé: ${analysis.estimatedWeight || "Non disponible"} kg.`
      });

      if (error) throw error;
      
      toast.success("Demande de consultation vétérinaire envoyée!", {
        description: `Vétérinaire: ${vets[0].business_name}`
      });
      onActionComplete?.({ type: "vet_alert_sent", data: { ...analysis, vet: vets[0] } });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'envoi de l'alerte");
    }
  };

  const scheduleVetVisit = async (analysis: Record<string, any>) => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }

    try {
      const { data: vets } = await supabase
        .from("service_providers")
        .select("id, business_name")
        .eq("service_category", "veterinaire")
        .eq("is_active", true)
        .limit(5);

      if (!vets?.length) {
        toast.info("Aucun vétérinaire disponible. Ajoutez des vétérinaires dans le marketplace.");
        return;
      }

      // Schedule for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { error } = await supabase.from("service_bookings").insert({
        client_id: user.id,
        provider_id: vets[0].id,
        service_type: "visite_routine",
        description: `Visite planifiée pour: ${getSpeciesLabel(analysis.species)} - ${analysis.breed || "Race à confirmer"}`,
        scheduled_date: tomorrow.toISOString().split('T')[0],
        status: "pending",
        notes: `Planifié via caméra IA.`
      });

      if (error) throw error;
      toast.success("Visite vétérinaire planifiée!", {
        description: `Pour demain avec ${vets[0].business_name}`
      });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la planification");
    }
  };

  const recordHarvestFromAnalysis = async (analysis: Record<string, any>) => {
    toast.info("Sélectionnez la culture concernée pour enregistrer la récolte");
    onActionComplete?.({ type: "harvest_pending", data: analysis });
    onOpenChange(false);
  };

  const diagnosePlantDisease = async (analysis: Record<string, any>) => {
    toast.info(`Diagnostic: ${analysis.healthIssue || "Analyse en cours..."}`);
  };

  const saveDiagnostic = async (analysis: Record<string, any>) => {
    toast.success("Diagnostic sauvegardé");
    onActionComplete?.({ type: "diagnostic_saved", data: analysis });
  };

  // Mapping helpers
  const mapCropType = (type: string): string => {
    const mapping: Record<string, string> = {
      "cereal": "cereale", "céréale": "cereale", "cereale": "cereale",
      "legume": "legumineuse", "légumineuse": "legumineuse", "legumineuse": "legumineuse",
      "vegetable": "maraicher", "légume": "maraicher", "maraicher": "maraicher",
      "fruit": "fruitier", "fruitier": "fruitier",
      "tuber": "tubercule", "tubercule": "tubercule",
      "oleagineux": "oleagineux", "oléagineux": "oleagineux",
      "fourrage": "fourrage"
    };
    return mapping[type?.toLowerCase()] || "autre";
  };

  const mapSpecies = (species: string): string => {
    const mapping: Record<string, string> = {
      "cow": "bovin", "vache": "bovin", "boeuf": "bovin", "taureau": "bovin", "bovin": "bovin",
      "sheep": "ovin", "mouton": "ovin", "brebis": "ovin", "ovin": "ovin",
      "goat": "caprin", "chèvre": "caprin", "caprin": "caprin",
      "chicken": "volaille", "poulet": "volaille", "poule": "volaille", "volaille": "volaille",
      "pig": "porcin", "porc": "porcin", "cochon": "porcin", "porcin": "porcin",
      "horse": "equin", "cheval": "equin", "equin": "equin"
    };
    return mapping[species?.toLowerCase()] || "autre";
  };

  const mapSoilType = (type: string): string => {
    const mapping: Record<string, string> = {
      "clay": "argileux", "argileux": "argileux",
      "sandy": "sableux", "sableux": "sableux",
      "loamy": "limoneux", "limoneux": "limoneux",
      "chalky": "calcaire", "calcaire": "calcaire",
      "humifere": "humifere", "humifère": "humifere"
    };
    return mapping[type?.toLowerCase()] || "mixte";
  };

  const executeAction = async (action: SuggestedAction) => {
    setIsExecutingAction(action.id);
    try {
      await action.action();
    } finally {
      setIsExecutingAction(null);
    }
  };

  const reset = () => {
    setImageData(null);
    setAnalysisResult(null);
    stopCamera();
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const getContextLabel = () => {
    switch (context) {
      case "cultures": return "Identifier une culture";
      case "parcelles": return "Analyser un terrain";
      case "betail": return "Identifier un animal";
      case "recoltes": return "Évaluer la maturité";
      default: return "Scanner avec l'IA";
    }
  };

  const getFrenchLabel = (key: string): string => {
    return frenchLabels[key] || key.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] p-4 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            {getContextLabel()}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="space-y-3 sm:space-y-4 pr-2">
            {/* Camera/Image preview area */}
            {!imageData && !isCameraActive && (
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={startCamera} 
                  className="w-full h-24 sm:h-32 flex flex-col gap-2"
                  variant="outline"
                >
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
                  <span className="text-sm sm:text-base">Prendre une photo</span>
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="secondary"
                  className="w-full"
                >
                  <ImagePlus className="w-4 h-4 mr-2" />
                  Choisir une image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Camera view */}
            {isCameraActive && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg"
                />
                <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 flex justify-center gap-3 sm:gap-4">
                  <Button onClick={stopCamera} variant="outline" size="icon" className="h-10 w-10">
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button onClick={capturePhoto} size="lg" className="rounded-full w-14 h-14 sm:w-16 sm:h-16">
                    <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
                  </Button>
                </div>
              </div>
            )}

            {/* Image preview */}
            {imageData && (
              <div className="relative">
                <img 
                  src={imageData} 
                  alt="Captured" 
                  className="w-full rounded-lg max-h-48 sm:max-h-64 object-cover"
                />
                {!isAnalyzing && !analysisResult && (
                  <Button 
                    onClick={reset}
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Loading state */}
            {isAnalyzing && (
              <Card>
                <CardContent className="flex items-center justify-center py-6 sm:py-8">
                  <div className="text-center space-y-2 sm:space-y-3">
                    <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin mx-auto text-primary" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      L'IA analyse votre image...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis results */}
            {analysisResult && (
              <div className="space-y-3 sm:space-y-4">
                <Card>
                  <CardContent className="pt-3 sm:pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="font-medium text-sm sm:text-base">Résultat de l'analyse</h4>
                      <Badge 
                        variant={analysisResult.confidence > 0.8 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {Math.round(analysisResult.confidence * 100)}% confiance
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {Object.entries(analysisResult.data).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            {getFrenchLabel(key)}:
                          </span>
                          <span className="font-medium text-right truncate max-w-[60%]">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Suggested actions */}
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Actions suggérées</h4>
                  {analysisResult.suggestedActions.map((action) => (
                    <Button
                      key={action.id}
                      onClick={() => executeAction(action)}
                      disabled={isExecutingAction !== null}
                      variant="outline"
                      className="w-full justify-start h-auto py-2.5 sm:py-3 px-3"
                    >
                      <span className="text-lg sm:text-xl mr-2 sm:mr-3">{action.icon}</span>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm">{action.label}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {action.description}
                        </div>
                      </div>
                      {isExecutingAction === action.id ? (
                        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                      )}
                    </Button>
                  ))}
                </div>

                <Button onClick={reset} variant="ghost" className="w-full text-sm">
                  Scanner autre chose
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
