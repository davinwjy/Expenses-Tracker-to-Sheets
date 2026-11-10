import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingSyncCount, triggerManualSync } = useFinance();

  // If online and nothing syncing or pending, hide banner
  if (isOnline && !isSyncing && pendingSyncCount === 0) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sticky top-13 z-15 w-full transition-all duration-200"
    >
      {!isOnline ? (
        <div className="bg-amber-950/90 border-b border-amber-500/30 text-amber-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-amber-300">Offline Mode:</span>
              <span className="text-amber-200/90 truncate">
                Dashboard & transaction recording active. Data saved to local cache.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
            {pendingSyncCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {pendingSyncCount} pending sync
              </span>
            )}
            <span className="hidden sm:inline-block text-amber-400/80">Auto-syncs when back online</span>
          </div>
        </div>
      ) : isSyncing ? (
        <div className="bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            <span className="font-semibold text-emerald-300">
              Syncing financial data to Firebase...
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">Cloud Sync Active</span>
        </div>
      ) : pendingSyncCount > 0 ? (
        <div className="bg-cyan-950/90 border-b border-cyan-500/30 text-cyan-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <CloudUpload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-cyan-300">{pendingSyncCount} offline changes</strong> ready to sync to Firebase.
            </span>
          </div>
          <button
            onClick={() => triggerManualSync()}
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-semibold cursor-pointer transition-colors"
          >
            Sync Now
          </button>
        </div>
      ) : null}
    </aside>
  );
};
