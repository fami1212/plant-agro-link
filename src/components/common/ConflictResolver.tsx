import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeftRight, Check } from "lucide-react";
import { offlineSyncService, type SyncConflict } from "@/services/offlineSyncService";
import { toast } from "sonner";

export function ConflictResolver() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  useEffect(() => {
    setConflicts(offlineSyncService.getConflicts());
    return offlineSyncService.onConflictsChange(setConflicts);
  }, []);

  if (conflicts.length === 0) return null;

  const resolve = async (id: string, resolution: "local" | "remote") => {
    await offlineSyncService.resolveConflict(id, resolution);
    toast.success(resolution === "local" ? "Version locale appliquée" : "Version serveur conservée");
  };

  return (
    <div className="px-4 mb-4 space-y-2">
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">{conflicts.length} conflit(s) de données</span>
      </div>
      {conflicts.map((c) => (
        <Card key={c.id} className="border-warning/30">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.table}</p>
                <p className="text-xs text-muted-foreground">ID: {c.id.slice(0, 8)}...</p>
              </div>
              <Badge variant="outline" className="text-warning border-warning/30">
                <ArrowLeftRight className="w-3 h-3 mr-1" />Conflit
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-primary/5">
                <p className="font-medium mb-1">Local</p>
                <p className="text-muted-foreground">{new Date(c.localTimestamp).toLocaleString("fr-FR")}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="font-medium mb-1">Serveur</p>
                <p className="text-muted-foreground">{new Date(c.remoteTimestamp).toLocaleString("fr-FR")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="default" className="flex-1 text-xs" onClick={() => resolve(c.id, "local")}>
                <Check className="w-3 h-3 mr-1" />Garder local
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => resolve(c.id, "remote")}>
                <Check className="w-3 h-3 mr-1" />Garder serveur
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
