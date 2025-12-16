import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/services/offlineService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { offlineService } from "@/services/offlineService";
import { toast } from "sonner";

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("Pas de connexion internet");
      return;
    }

    setIsSyncing(true);
    try {
      const pendingOps = await offlineService.getPendingOperations();
      
      for (const op of pendingOps) {
        try {
          if (op.operation === 'insert') {
            const { error } = await supabase.from(op.table as any).insert(op.data);
            if (!error) await offlineService.markAsSynced(op.id);
          } else if (op.operation === 'update') {
            const { id, ...updateData } = op.data;
            const { error } = await supabase.from(op.table as any).update(updateData).eq('id', id);
            if (!error) await offlineService.markAsSynced(op.id);
          } else if (op.operation === 'delete') {
            const { error } = await supabase.from(op.table as any).delete().eq('id', op.data.id);
            if (!error) await offlineService.markAsSynced(op.id);
          }
        } catch (e) {
          console.error('Sync error for operation:', op.id, e);
        }
      }

      await offlineService.clearPendingSynced();
      toast.success("Synchronisation terminée");
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      <div className={`rounded-lg p-3 flex items-center justify-between ${
        isOnline ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-red-100 dark:bg-red-900/50'
      }`}>
        <div className="flex items-center gap-2">
          <WifiOff className={`w-4 h-4 ${isOnline ? 'text-yellow-600' : 'text-red-600'}`} />
          <span className="text-sm font-medium">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} en attente</Badge>
          )}
        </div>
        {isOnline && pendingCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}
      </div>
    </div>
  );
}
