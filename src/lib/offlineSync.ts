import { Account, Transaction, Investment, CategoryBudget, DashboardStats, UserSettings, HoldingType } from '../types';
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
  // 1. Critical Financial Data Snapshot Cache (Isolated per user account)
  saveSnapshot(data: Partial<FinancialSnapshot>, userEmail?: string): void {
    try {
      const key = userEmail ? `wealthtrack_snapshot_${userEmail.trim().toLowerCase()}` : FINANCIAL_SNAPSHOT_KEY;
      const existing: Partial<FinancialSnapshot> = this.getSnapshot(userEmail) || {};
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
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save offline financial snapshot:', err);
    }
  },

  getSnapshot(userEmail?: string): FinancialSnapshot | null {
    try {
      const key = userEmail ? `wealthtrack_snapshot_${userEmail.trim().toLowerCase()}` : FINANCIAL_SNAPSHOT_KEY;
      let raw = localStorage.getItem(key);
      if (!raw && userEmail) {
        // Fallback to legacy global snapshot if exists
        raw = localStorage.getItem(FINANCIAL_SNAPSHOT_KEY);
      }
      if (raw) {
        return JSON.parse(raw) as FinancialSnapshot;
      }
    } catch (err) {
      console.warn('Failed to read offline financial snapshot:', err);
    }
    return null;
  },

  // 2. Offline Pending Sync Queue (Deprecated - replaced by local snapshot + Google Sheets Webhook)
  getPendingQueue(): PendingSyncItem[] {
    return [];
  },

  queueItem(item: Omit<PendingSyncItem, 'timestamp'>): void {
    // No-op: Data is saved immediately to user snapshot and synced to Google Sheets
  },

  removeItem(id: string): void {
    // No-op
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

  async syncPendingToFirebase(): Promise<{ success: boolean; syncedCount: number; errors: number }> {
    this.clearQueue();
    this.setLastSyncTime();
    return { success: true, syncedCount: 0, errors: 0 };
  },
};
