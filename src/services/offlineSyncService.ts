// Advanced Offline Sync with Conflict Resolution
import { offlineService } from "./offlineService";
import { supabase } from "@/integrations/supabase/client";

export type ConflictResolution = "local" | "remote" | "manual";

export interface SyncConflict {
  id: string;
  table: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface SyncResult {
  synced: number;
  conflicts: SyncConflict[];
  errors: string[];
}

class OfflineSyncService {
  private syncing = false;
  private conflicts: SyncConflict[] = [];
  private listeners: Set<(conflicts: SyncConflict[]) => void> = new Set();

  async syncPendingOperations(
    strategy: ConflictResolution = "local"
  ): Promise<SyncResult> {
    if (this.syncing) return { synced: 0, conflicts: [], errors: ["Sync déjà en cours"] };
    if (!navigator.onLine) return { synced: 0, conflicts: [], errors: ["Hors ligne"] };

    this.syncing = true;
    const result: SyncResult = { synced: 0, conflicts: [], errors: [] };

    try {
      const pending = await offlineService.getPendingOperations();

      for (const op of pending) {
        try {
          if (op.operation === "insert") {
            const { error } = await supabase.from(op.table as any).insert(op.data as any);
            if (error) {
              if (error.code === "23505") {
                // Duplicate key - conflict
                const conflict = await this.detectConflict(op.table, op.data, op.created_at);
                if (conflict) {
                  if (strategy === "local") {
                    await this.resolveWithLocal(conflict);
                    result.synced++;
                  } else if (strategy === "remote") {
                    result.synced++; // Keep remote, discard local
                  } else {
                    result.conflicts.push(conflict);
                    this.conflicts.push(conflict);
                  }
                }
              } else {
                result.errors.push(`${op.table}: ${error.message}`);
                continue;
              }
            } else {
              result.synced++;
            }
          } else if (op.operation === "update") {
            const id = op.data.id as string;
            if (!id) { result.errors.push("ID manquant pour update"); continue; }

            // Check for remote changes
            const { data: remote } = await supabase
              .from(op.table as any)
              .select("*")
              .eq("id", id)
              .maybeSingle();

            const remoteRecord = remote as Record<string, any> | null;
            if (remoteRecord && remoteRecord.updated_at && remoteRecord.updated_at > op.created_at) {
              const conflict: SyncConflict = {
                id, table: op.table,
                localData: op.data,
                remoteData: remoteRecord as Record<string, unknown>,
                localTimestamp: op.created_at,
                remoteTimestamp: remoteRecord.updated_at,
              };

              if (strategy === "local") {
                await this.resolveWithLocal(conflict);
                result.synced++;
              } else if (strategy === "remote") {
                result.synced++;
              } else {
                result.conflicts.push(conflict);
                this.conflicts.push(conflict);
              }
            } else {
              const { id: _id, ...updateData } = op.data;
              const { error } = await supabase
                .from(op.table as any)
                .update(updateData as any)
                .eq("id", id);
              if (error) result.errors.push(`${op.table}: ${error.message}`);
              else result.synced++;
            }
          } else if (op.operation === "delete") {
            const id = op.data.id as string;
            if (!id) continue;
            const { error } = await supabase.from(op.table as any).delete().eq("id", id);
            if (error && error.code !== "PGRST116") {
              result.errors.push(`${op.table}: ${error.message}`);
              continue;
            }
            result.synced++;
          }

          await offlineService.markAsSynced(op.id);
        } catch (err) {
          result.errors.push(`${op.table}: ${err instanceof Error ? err.message : "Erreur inconnue"}`);
        }
      }

      await offlineService.clearPendingSynced();
      this.notifyListeners();
    } finally {
      this.syncing = false;
    }

    return result;
  }

  private async detectConflict(
    table: string, localData: Record<string, unknown>, localTimestamp: string
  ): Promise<SyncConflict | null> {
    const id = localData.id as string;
    if (!id) return null;

    const { data: remote } = await supabase
      .from(table as any)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const remoteRecord = remote as Record<string, any> | null;
    if (!remoteRecord) return null;

    return {
      id, table, localData, remoteData: remoteRecord as Record<string, unknown>,
      localTimestamp, remoteTimestamp: remoteRecord.updated_at || remoteRecord.created_at,
    };
  }

  private async resolveWithLocal(conflict: SyncConflict) {
    const { id: _id, ...data } = conflict.localData;
    await supabase.from(conflict.table as any).update(data as any).eq("id", conflict.id);
  }

  async resolveConflict(conflictId: string, resolution: "local" | "remote") {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    if (resolution === "local") {
      await this.resolveWithLocal(conflict);
    }
    // "remote" = no action, keep remote data

    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    this.notifyListeners();
  }

  getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  onConflictsChange(listener: (conflicts: SyncConflict[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l([...this.conflicts]));
  }

  isSyncing(): boolean {
    return this.syncing;
  }
}

export const offlineSyncService = new OfflineSyncService();
