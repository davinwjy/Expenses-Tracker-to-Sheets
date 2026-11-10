import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, CheckCircle2, Loader2, ExternalLink, ShieldCheck, RefreshCw, Download, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  authenticateGoogleSheets,
  getCachedGoogleSheetsToken,
  createWealthTrackSpreadsheet,
  syncFinancialDataToSheet,
} from '../../lib/googleSheetsSync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { accounts, transactions, investments, budgets, showNotification } = useFinance();

  const [isLoading, setIsLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const storageKey = user ? `wealthtrack_sheets_id_${user.email}` : 'wealthtrack_sheets_id_default';

  useEffect(() => {
    if (user) {
      const savedId = localStorage.getItem(storageKey);
      if (savedId) setSpreadsheetId(savedId);
      const savedTime = localStorage.getItem(`${storageKey}_time`);
      if (savedTime) setLastSynced(savedTime);
    }
  }, [user, storageKey]);

  if (!isOpen) return null;

  const handleConnectAndSync = async () => {
    if (!user) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      let token = getCachedGoogleSheetsToken();
      if (!token) {
        token = await authenticateGoogleSheets();
      }

      let currentId = spreadsheetId;
      if (!currentId) {
        currentId = await createWealthTrackSpreadsheet(token, user.email);
      }
      setSpreadsheetId(currentId);
      localStorage.setItem(storageKey, currentId);

      await syncFinancialDataToSheet(token, currentId, {
        accounts,
        transactions,
        investments,
        budgets,
      });

      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem(`${storageKey}_time`, now);

      showNotification({
        title: 'Google Sheets Sync Success',
        message: `All financial records (Accounts, Transactions, Investments, Budgets) for ${user.email} were successfully synced!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Google Sheets sync error:', err);
      const msg = err?.message || '';
      if (msg.includes('unauthorized-domain') || msg.includes('auth/unauthorized-domain')) {
        setAuthError(
          'Firebase domain authorization restriction detected on this preview URL. Use the Instant CSV Export below to get all your data (Accounts, Transactions, Investments & Budgets) for Google Sheets instantly!'
        );
      } else {
        setAuthError(msg || 'Failed to connect to Google Sheets.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAllCsv = () => {
    try {
      const prefix = `WealthTrack_${user?.email || 'davinwijaya16'}`;

      // 1. Accounts CSV
      const accHeader = ['Account Name', 'Type', 'Balance (IDR)', 'Account Number'];
      const accRows = accounts.map(a => [`"${a.name}"`, a.type, a.balance, a.accountNumber || '']);
      downloadCsv(`${prefix}_accounts.csv`, [accHeader.join(','), ...accRows.map(r => r.join(','))].join('\n'));

      // 2. Transactions CSV
      const txHeader = ['Date', 'Type', 'Category', 'Amount (IDR)', 'Account ID', 'Notes'];
      const txRows = transactions.map(t => [t.date, t.type, t.category, t.amount, t.accountId, `"${(t.notes || '').replace(/"/g, '""')}"`]);
      downloadCsv(`${prefix}_transactions.csv`, [txHeader.join(','), ...txRows.map(r => r.join(','))].join('\n'));

      // 3. Investments CSV
      const invHeader = ['Name', 'Category', 'Currency', 'Amount Invested', 'Current Value', 'Units', 'Platform', 'Notes'];
      const invRows = investments.map(i => [`"${i.name}"`, i.category, i.currency || 'IDR', i.amountInvested, i.currentValue || 0, i.units || 0, `"${i.platform || ''}"`, `"${(i.notes || '').replace(/"/g, '""')}"`]);
      downloadCsv(`${prefix}_investments.csv`, [invHeader.join(','), ...invRows.map(r => r.join(','))].join('\n'));

      // 4. Budgets CSV
      const bgtHeader = ['Category', 'Monthly Limit (IDR)'];
      const bgtRows = budgets.map(b => [`"${b.category}"`, b.monthlyLimit]);
      downloadCsv(`${prefix}_budgets.csv`, [bgtHeader.join(','), ...bgtRows.map(r => r.join(','))].join('\n'));

      showNotification({
        title: 'All Data Exported Successfully',
        message: 'Downloaded 4 CSV files (Accounts, Transactions, Investments, and Budgets) ready for Google Sheets!',
        type: 'success',
      });
    } catch (err: any) {
      showNotification({
        title: 'Export Failed',
        message: err.message || 'Could not export CSV files',
        type: 'error',
      });
    }
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg p-6 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                Google Sheets Integration & Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Accounts, Transactions, Investments & Budgets for {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1b212e] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Active User Account:
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {user?.email}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-slate-600 dark:text-zinc-400 border-t border-slate-200 dark:border-[#1b212e]">
              <div>• {accounts.length} Accounts</div>
              <div>• {transactions.length} Transactions</div>
              <div>• {investments.length} Investments</div>
              <div>• {budgets.length} Budgets</div>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Domain Authorization Notice</span>
              </div>
              <p>{authError}</p>
            </div>
          )}

          {spreadsheetId && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="font-mono text-emerald-700 dark:text-emerald-300 truncate max-w-[280px]">
                ID: {spreadsheetId}
              </span>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
              >
                Open Sheet <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Comprehensive CSV Export for All Financial Data */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Download All Data (4 CSV Sheets)
                </span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded">
                Accounts + Tx + Investments + Budgets
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">
              Instantly download everything you have inputted (Accounts, Transactions, Investments, and Budgets) as clean CSV files ready to upload into Google Sheets.
            </p>
            <button
              onClick={handleExportAllCsv}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download All 4 CSV Files for Google Sheets</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {!spreadsheetId ? (
            <button
              onClick={handleConnectAndSync}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Syncing All Data...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Cloud Sync via Google Sheets API</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleConnectAndSync}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                    <span>Sync All Now</span>
                  </>
                )}
              </button>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Spreadsheet</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
