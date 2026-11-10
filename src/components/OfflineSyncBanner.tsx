import React from 'react';
import { WifiOff } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const OfflineSyncBanner: React.FC = () => {
  const { isOnline } = useFinance();

  // If device is online, no top banner popup is needed (silent local & Google Sheets sync active)
  if (isOnline) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sticky top-13 z-15 w-full transition-all duration-200"
    >
      <div className="bg-amber-950/90 border-b border-amber-500/30 text-amber-200 px-3 sm:px-5 py-2 text-xs flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-amber-300">Offline Mode:</span>
            <span className="text-amber-200/90 truncate">
              Dashboard & transaction recording active. Saved to local cache.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <span className="hidden sm:inline-block text-amber-400/80">Auto-syncs to Google Sheet when back online</span>
        </div>
      </div>
    </aside>
  );
};
