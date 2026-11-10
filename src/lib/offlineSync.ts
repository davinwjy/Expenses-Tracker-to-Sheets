import { Account, Transaction, Investment, CategoryBudget, DashboardStats, UserSettings, HoldingType } from '../types';
import { firestoreService } from './firestoreService';
import { syncFirestoreOnline } from './firebase';

export interface FinancialSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: CategoryBudget[];
  holdingTypes?: HoldingType[];
  stats: DashboardStats | null;
  settings: UserSettings | null;
  usdIdrRate: number;
  rateSource?: string;
  rateLastUpdated?: string | null;
  timestamp: string;
}

export interface PendingSyncItem {
  id: string;
  type: 'account' | 'transaction' | 'investment' | 'budget' | 'settings';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

const FINANCIAL_SNAPSHOT_KEY = 'wealthtrack_financial_snapshot_v1';
const PENDING_SYNC_QUEUE_KEY = 'wealthtrack_pending_sync_queue_v1';
const LAST_SYNC_KEY = 'wealthtrack_last_firebase_sync';

export const offlineSyncManager = {
  // 1. Critical Financial Data Snapshot Cache
  saveSnapshot(data: Partial<FinancialSnapshot>): void {
    try {
      const existing: Partial<FinancialSnapshot> = this.getSnapshot() || {};
      const updated: FinancialSnapshot = {
        accounts: data.accounts ?? existing.accounts ?? [],
        transactions: data.transactions ?? existing.transactions ?? [],
        investments: data.investments ?? existing.investments ?? [],
        budgets: data.budgets ?? existing.budgets ?? [],
        holdingTypes: data.holdingTypes ?? existing.holdingTypes ?? [],
        stats: data.stats !== undefined ? data.stats : (existing.stats ?? null),
        settings: data.settings !== undefined ? data.settings : (existing.settings ?? null),
        usdIdrRate: data.usdIdrRate ?? existing.usdIdrRate ?? 15850,
        rateSource: data.rateSource ?? existing.rateSource,
        rateLastUpdated: data.rateLastUpdated ?? existing.rateLastUpdated,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(FINANCIAL_SNAPSHOT_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save offline financial snapshot:', err);
    }
  },

  getSnapshot(): FinancialSnapshot | null {
    try {
      const raw = localStorage.getItem(FINANCIAL_SNAPSHOT_KEY);
      if (raw) {
        return JSON.parse(raw) as FinancialSnapshot;
      }
    } catch (err) {
      console.warn('Failed to read offline financial snapshot:', err);
    }
    return null;
  },

  // 2. Offline Pending Sync Queue (Outbox for Firebase)
  getPendingQueue(): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
      if (raw) {
        return JSON.parse(raw) as PendingSyncItem[];
      }
    } catch {
      // ignore
    }
    return [];
  },

  queueItem(item: Omit<PendingSyncItem, 'timestamp'>): void {
    try {
      const current = this.getPendingQueue();
      // Replace existing item with same id if pending
      const filtered = current.filter((q) => q.id !== item.id);
      filtered.push({
        ...item,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('wealthtrack:pending_sync_change', { detail: { count: filtered.length } }));
    } catch (err) {
      console.warn('Failed to queue offline sync item:', err);
    }
  },

  removeItem(id: string): void {
    try {
      const current = this.getPendingQueue();
      const filtered = current.filter((q) => q.id !== id);
      localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('wealthtrack:pending_sync_change', { detail: { count: filtered.length } }));
    } catch {
      // ignore
    }
  },

  clearQueue(): void {
    try {
      localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
      window.dispatchEvent(new CustomEvent('wealthtrack:pending_sync_change', { detail: { count: 0 } }));
    } catch {
      // ignore
    }
  },

  getLastSyncTime(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  },

  setLastSyncTime(): void {
    try {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch {
      // ignore
    }
  },

  // 3. Flush Pending Queue to Firebase when Online
  async syncPendingToFirebase(): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      await syncFirestoreOnline();
      this.setLastSyncTime();
      return { success: true, syncedCount: 0, errors: 0 };
    }

    await syncFirestoreOnline();

    let syncedCount = 0;
    let errors = 0;
    const remaining: PendingSyncItem[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'transaction') {
          if (item.action === 'delete') {
            await firestoreService.deleteTransaction(item.id);
          } else {
            await firestoreService.saveTransaction(item.data);
          }
        } else if (item.type === 'account') {
          if (item.action === 'delete') {
            await firestoreService.deleteAccount(item.id);
          } else {
            await firestoreService.saveAccount(item.data);
          }
        } else if (item.type === 'investment') {
          if (item.action === 'delete') {
            await firestoreService.deleteInvestment(item.id);
          } else {
            await firestoreService.saveInvestment(item.data);
          }
        } else if (item.type === 'budget') {
          if (item.action === 'delete') {
            await firestoreService.deleteBudget(item.id);
          } else {
            await firestoreService.saveBudget(item.data);
          }
        } else if (item.type === 'settings') {
          await firestoreService.saveSettings(item.data);
        }
        syncedCount++;
      } catch (err) {
        console.warn(`Failed to sync queued item ${item.id}:`, err);
        errors++;
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(remaining));
      window.dispatchEvent(new CustomEvent('wealthtrack:pending_sync_change', { detail: { count: remaining.length } }));
    } catch {}

    this.setLastSyncTime();
    return { success: errors === 0, syncedCount, errors };
  },
};
