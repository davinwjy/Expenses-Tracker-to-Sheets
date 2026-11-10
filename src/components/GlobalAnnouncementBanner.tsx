import React, { useState } from 'react';
import { Megaphone, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const GlobalAnnouncementBanner: React.FC = () => {
  const { announcement } = useFinance();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!announcement || !announcement.enabled || !announcement.message || isDismissed) {
    return null;
  }

  const typeConfig = {
    warning: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    alert: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-200',
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
    },
    success: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    info: {
      bg: 'bg-blue-500/15 border-blue-500/30 text-blue-200',
      icon: Megaphone,
      iconColor: 'text-blue-400',
    },
  }[announcement.type || 'info'];

  const Icon = typeConfig.icon;

  return (
    <div
      role="banner"
      aria-label="System announcement"
      className={`border-b px-4 py-2 text-xs flex items-center justify-between gap-3 ${typeConfig.bg} transition-all`}
    >
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full">
        <Icon className={`w-4 h-4 shrink-0 ${typeConfig.iconColor}`} />
        <span className="font-medium flex-1">{announcement.message}</span>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
