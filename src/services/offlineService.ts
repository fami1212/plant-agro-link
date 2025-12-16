// Offline Service using IndexedDB for data persistence
const DB_NAME = 'plantera_offline';
const DB_VERSION = 1;

interface OfflineRecord {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  created_at: string;
  synced: boolean;
}

class OfflineService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Pending operations queue
        if (!db.objectStoreNames.contains('pending_operations')) {
          const pendingStore = db.createObjectStore('pending_operations', { keyPath: 'id' });
          pendingStore.createIndex('table', 'table', { unique: false });
          pendingStore.createIndex('synced', 'synced', { unique: false });
        }

        // Cached data stores
        const tables = ['fields', 'crops', 'livestock', 'harvest_records', 'marketplace_listings'];
        tables.forEach(table => {
          if (!db.objectStoreNames.contains(table)) {
            const store = db.createObjectStore(table, { keyPath: 'id' });
            store.createIndex('user_id', 'user_id', { unique: false });
          }
        });
      };
    });
  }

  async saveOfflineOperation(table: string, operation: 'insert' | 'update' | 'delete', data: Record<string, unknown>): Promise<string> {
    if (!this.db) await this.init();

    const id = `${table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const record: OfflineRecord = {
      id,
      table,
      operation,
      data,
      created_at: new Date().toISOString(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_operations'], 'readwrite');
      const store = transaction.objectStore('pending_operations');
      const request = store.add(record);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<OfflineRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_operations'], 'readonly');
      const store = transaction.objectStore('pending_operations');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_operations'], 'readwrite');
      const store = transaction.objectStore('pending_operations');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          const updateRequest = store.put(record);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async cacheData(table: string, data: Record<string, unknown>[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);

      // Clear existing data
      store.clear();

      // Add new data
      data.forEach(item => {
        store.add(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getCachedData(table: string): Promise<Record<string, unknown>[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingSynced(): Promise<void> {
    if (!this.db) await this.init();

    const syncedRecords = await new Promise<OfflineRecord[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_operations'], 'readonly');
      const store = transaction.objectStore('pending_operations');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['pending_operations'], 'readwrite');
      const store = transaction.objectStore('pending_operations');

      syncedRecords.forEach(record => {
        store.delete(record.id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  onOnlineStatusChange(callback: (online: boolean) => void): () => void {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  getPendingCount(): Promise<number> {
    return this.getPendingOperations().then(ops => ops.length);
  }
}

export const offlineService = new OfflineService();

// Hook for using offline service in React components
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = offlineService.onOnlineStatusChange(setIsOnline);
    
    // Update pending count periodically
    const updatePending = async () => {
      const count = await offlineService.getPendingCount();
      setPendingCount(count);
    };
    
    updatePending();
    const interval = setInterval(updatePending, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingCount };
}
