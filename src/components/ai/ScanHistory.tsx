import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Camera,
  Leaf,
  Bug,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ScanRecord {
  id: string;
  scan_type: string;
  image_url: string | null;
  analysis_data: Record<string, any>;
  confidence: number;
  disease_name: string | null;
  severity: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  related_crop_id: string | null;
  related_livestock_id: string | null;
  related_field_id: string | null;
}

interface DiseaseEvolution {
  disease: string;
  scans: ScanRecord[];
  trend: "improving" | "stable" | "worsening";
  latestSeverity: string;
  firstDetected: string;
}

const scanTypeLabels: Record<string, string> = {
  crop_identification: "Culture identifiée",
  disease_detection: "Maladie détectée",
  livestock_identification: "Animal identifié",
  harvest_maturity: "Maturité évaluée",
  field_analysis: "Terrain analysé",
  unknown: "Analyse générale",
};

const scanTypeIcons: Record<string, React.ReactNode> = {
  crop_identification: <Leaf className="w-4 h-4" />,
  disease_detection: <Bug className="w-4 h-4" />,
  livestock_identification: <span className="text-sm">🐄</span>,
  harvest_maturity: <span className="text-sm">🌾</span>,
  field_analysis: <span className="text-sm">🗺️</span>,
  unknown: <Camera className="w-4 h-4" />,
};

const severityColors: Record<string, string> = {
  légère: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  modérée: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  sévère: "bg-destructive/10 text-destructive border-destructive/30",
  grave: "bg-destructive/10 text-destructive border-destructive/30",
  faible: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  moyenne: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  élevée: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ScanHistory() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [diseaseEvolutions, setDiseaseEvolutions] = useState<DiseaseEvolution[]>([]);
  const [activeView, setActiveView] = useState<"history" | "evolution">("history");

  useEffect(() => {
    if (user) {
      fetchScans();
    }
  }, [user]);

  const fetchScans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scan_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform data to match ScanRecord interface
      const transformedData: ScanRecord[] = (data || []).map((item) => ({
        ...item,
        analysis_data: (typeof item.analysis_data === "object" && item.analysis_data !== null
          ? item.analysis_data
          : {}) as Record<string, any>,
      }));

      setScans(transformedData);
      computeDiseaseEvolutions(transformedData);
    } catch (error) {
      console.error("Error fetching scan history:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const computeDiseaseEvolutions = (scanData: ScanRecord[]) => {
    const diseaseScans = scanData.filter(
      (s) => s.scan_type === "disease_detection" && s.disease_name
    );

    const grouped: Record<string, ScanRecord[]> = {};
    diseaseScans.forEach((scan) => {
      const key = scan.disease_name!.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(scan);
    });

    const evolutions: DiseaseEvolution[] = Object.entries(grouped).map(
      ([disease, scansForDisease]) => {
        const sortedScans = scansForDisease.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const severityOrder: Record<string, number> = {
          légère: 1,
          faible: 1,
          modérée: 2,
          moyenne: 2,
          sévère: 3,
          élevée: 3,
          grave: 4,
        };

        let trend: "improving" | "stable" | "worsening" = "stable";
        if (sortedScans.length >= 2) {
          const firstSev = severityOrder[sortedScans[0].severity?.toLowerCase() || ""] || 2;
          const lastSev =
            severityOrder[sortedScans[sortedScans.length - 1].severity?.toLowerCase() || ""] || 2;
          if (lastSev < firstSev) trend = "improving";
          else if (lastSev > firstSev) trend = "worsening";
        }

        return {
          disease: scansForDisease[0].disease_name!,
          scans: sortedScans,
          trend,
          latestSeverity: sortedScans[sortedScans.length - 1].severity || "Non évaluée",
          firstDetected: sortedScans[0].created_at,
        };
      }
    );

    setDiseaseEvolutions(evolutions);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingDown className="w-4 h-4 text-success" />;
      case "worsening":
        return <TrendingUp className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving":
        return "En amélioration";
      case "worsening":
        return "En aggravation";
      default:
        return "Stable";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Historique des scans</h3>
                <p className="text-xs text-muted-foreground">
                  {scans.length} scan{scans.length > 1 ? "s" : ""} enregistré{scans.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchScans}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Toggle buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={activeView === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("history")}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-1" />
              Historique
            </Button>
            <Button
              variant={activeView === "evolution" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveView("evolution")}
              className="flex-1"
            >
              <Bug className="w-4 h-4 mr-1" />
              Maladies ({diseaseEvolutions.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History view */}
      {activeView === "history" && (
        <Card>
          <CardContent className="p-0">
            {scans.length === 0 ? (
              <div className="p-6 text-center">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucun scan enregistré. Utilisez la Smart Camera pour commencer.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y">
                  {scans.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedScan(scan)}
                    >
                      <div className="flex items-center gap-3">
                        {scan.image_url ? (
                          <img
                            src={scan.image_url}
                            alt="Scan"
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            {scanTypeIcons[scan.scan_type] || <Camera className="w-5 h-5" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {scan.disease_name ||
                                scan.analysis_data?.cropName ||
                                scan.analysis_data?.species ||
                                scanTypeLabels[scan.scan_type]}
                            </p>
                            {scan.severity && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  severityColors[scan.severity.toLowerCase()] ||
                                    "bg-muted text-muted-foreground"
                                )}
                              >
                                {scan.severity}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(scan.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disease evolution view */}
      {activeView === "evolution" && (
        <Card>
          <CardContent className="p-0">
            {diseaseEvolutions.length === 0 ? (
              <div className="p-6 text-center">
                <Bug className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Aucune maladie détectée. Vos cultures sont en bonne santé !
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {diseaseEvolutions.map((evolution) => (
                  <div key={evolution.disease} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <h4 className="font-medium">{evolution.disease}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(evolution.trend)}
                        <span className="text-xs text-muted-foreground">
                          {getTrendLabel(evolution.trend)}
                        </span>
                      </div>
                    </div>

                    {/* Evolution timeline */}
                    <div className="relative pl-4 space-y-2">
                      <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-muted" />
                      {evolution.scans.map((scan, index) => (
                        <div
                          key={scan.id}
                          className="relative flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -ml-2"
                          onClick={() => setSelectedScan(scan)}
                        >
                          <div
                            className={cn(
                              "w-3 h-3 rounded-full border-2 bg-background z-10",
                              index === evolution.scans.length - 1
                                ? "border-primary"
                                : "border-muted-foreground"
                            )}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  severityColors[scan.severity?.toLowerCase() || ""] ||
                                    "bg-muted text-muted-foreground"
                                )}
                              >
                                {scan.severity || "Non évaluée"}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(scan.created_at), "d MMM", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Treatment info */}
                    {evolution.scans[evolution.scans.length - 1].treatment && (
                      <div className="mt-3 p-2 rounded-lg bg-primary/5 text-xs">
                        <span className="font-medium">Traitement recommandé:</span>{" "}
                        {evolution.scans[evolution.scans.length - 1].treatment}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scan detail dialog */}
      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedScan && scanTypeIcons[selectedScan.scan_type]}
              Détails du scan
            </DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-4">
              {selectedScan.image_url && (
                <img
                  src={selectedScan.image_url}
                  alt="Scan"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{scanTypeLabels[selectedScan.scan_type]}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span>
                    {format(new Date(selectedScan.created_at), "d MMMM yyyy 'à' HH:mm", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confiance:</span>
                  <Badge variant="secondary">
                    {Math.round((selectedScan.confidence || 0) * 100)}%
                  </Badge>
                </div>
                {selectedScan.disease_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Maladie:</span>
                    <span>{selectedScan.disease_name}</span>
                  </div>
                )}
                {selectedScan.severity && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sévérité:</span>
                    <Badge
                      variant="outline"
                      className={severityColors[selectedScan.severity.toLowerCase()]}
                    >
                      {selectedScan.severity}
                    </Badge>
                  </div>
                )}
                {selectedScan.treatment && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Traitement:</span>
                    <p className="mt-1 p-2 bg-muted rounded-lg">{selectedScan.treatment}</p>
                  </div>
                )}
              </div>

              {/* Analysis data */}
              {Object.keys(selectedScan.analysis_data).length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Données d'analyse</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(selectedScan.analysis_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="max-w-[60%] truncate text-right">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
