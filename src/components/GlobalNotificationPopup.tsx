import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  X,
  ArrowDownRight,
  Receipt,
  Wallet,
  Tag,
  Calendar,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr } from '../lib/formatters';

export const GlobalNotificationPopup: React.FC = () => {
  const { notification, closeNotification } = useFinance();
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

    const duration = notification.durationMs || 4500;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    setProgress(100);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return Math.max(0, prev - step);
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [notification]);

  if (!notification) return null;

  const isExpense = notification.txType === 'expense';
  const isIncome = notification.txType === 'income';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[94%] sm:w-auto sm:min-w-[420px] max-w-lg pointer-events-auto font-mono transition-all duration-300"
    >
      <div
        className={`relative overflow-hidden rounded-xl border bg-white dark:bg-[#090c12]/95 backdrop-blur-md p-3.5 sm:p-4 shadow-2xl transition-all ${
          isExpense
            ? 'border-rose-300 dark:border-rose-500/40 shadow-[0_12px_40px_rgba(244,63,94,0.15)]'
            : isIncome
            ? 'border-emerald-300 dark:border-emerald-500/40 shadow-[0_12px_40px_rgba(16,185,129,0.15)]'
            : notification.type === 'error'
            ? 'border-rose-300 dark:border-rose-500/60 shadow-[0_12px_40px_rgba(244,63,94,0.15)]'
            : 'border-cyan-300 dark:border-cyan-500/40 shadow-[0_12px_40px_rgba(6,182,212,0.15)]'
        }`}
      >
        {/* Subtle Top Ambient Glow Accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] ${
            isExpense
              ? 'bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20'
              : isIncome
              ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20'
              : 'bg-gradient-to-r from-cyan-500/20 via-cyan-500 to-cyan-500/20'
          }`}
        />

        <div className="flex items-start gap-3">
          {/* Status Badge Icon */}
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
              isExpense
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : isIncome
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : notification.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
            }`}
          >
            {isExpense ? (
              <Receipt className="w-5 h-5" />
            ) : isIncome ? (
              <ArrowDownRight className="w-5 h-5" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : notification.type === 'info' ? (
              <Info className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                  isExpense
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : isIncome
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                }`}
              >
                {isExpense ? 'EXPENSE' : isIncome ? 'INCOME' : notification.type === 'info' ? 'SYSTEM' : 'NOTIFICATION'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-mono">
                {notification.type === 'info' ? 'INFO' : notification.type === 'error' ? 'FAILED' : 'SUCCESS'}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tracking-wide uppercase">
              {notification.title}
            </h4>

            {/* Prominent Amount */}
            {notification.amount !== undefined && (
              <div className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={`text-base sm:text-lg font-black tracking-tight tabular-nums ${
                    isExpense ? 'text-rose-600 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-zinc-100'
                  }`}
                >
                  {isExpense ? '-' : isIncome ? '+' : ''}
                  {formatIdr(notification.amount)}
                </span>
              </div>
            )}

            {/* Transaction Metadata Pills */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 dark:text-zinc-400">
              {notification.accountName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#131722] border border-slate-200 dark:border-[#212838] text-slate-800 dark:text-zinc-300">
                  <Wallet className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                  <span>{notification.accountName}</span>
                </span>
              )}
              {notification.category && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#131722] border border-slate-200 dark:border-[#212838] text-slate-800 dark:text-zinc-300">
                  <Tag className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                  <span>{notification.category}</span>
                </span>
              )}
              {notification.date && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#131722] border border-slate-200 dark:border-[#212838] text-slate-700 dark:text-zinc-400">
                  <Calendar className="w-3 h-3 text-slate-500 dark:text-zinc-500" />
                  <span>{notification.date}</span>
                </span>
              )}
            </div>

            {/* Memo Note if exists */}
            {notification.message && (
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-zinc-400 italic line-clamp-2">
                &ldquo;{notification.message}&rdquo;
              </p>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={closeNotification}
            className="p-1 rounded text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer shrink-0"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dismiss Countdown Progress Line */}
        <div className="mt-3 w-full bg-slate-200 dark:bg-zinc-800/40 h-0.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              isExpense
                ? 'bg-rose-500'
                : isIncome
                ? 'bg-emerald-500'
                : 'bg-cyan-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
