import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  syncFinancialDataViaWebhook,
  getStoredSheetConfig,
  extractSpreadsheetId,
  buildTabularSheetsData,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from '../../lib/googleSheetsSync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    accounts,
    transactions,
    investments,
    budgets,
    stats,
    usdIdrRate,
    settings,
    pullFromGoogleSheet,
    saveGoogleSheetSettings,
    showNotification,
  } = useFinance();

  const [activeMode, setActiveMode] = useState<'webhook' | 'csv'>('webhook');
  const [isLoading, setIsLoading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptBox, setShowScriptBox] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      const cfg = getStoredSheetConfig(user.email, settings);
      setSpreadsheetId(cfg.spreadsheetId || '');
      setWebhookUrl(cfg.webhookUrl || '');
      setAutoSync(cfg.autoSync);
      setLastSynced(cfg.lastSynced || '');
    }
  }, [user, settings, isOpen]);

  if (!isOpen) return null;

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      // ignore
    }
  };

  // 1. Connect & Sync via Universal Google Apps Script Bridge (Works on Web, GitHub Pages & Android APK!)
  const handleWebhookSync = async () => {
    if (!user) return;
    const cleanWebhook = webhookUrl.trim();
    if (!cleanWebhook || !cleanWebhook.startsWith('https://script.google.com/')) {
      setAuthError('Harap masukkan Webhook URL Google Apps Script yang valid (diawali https://script.google.com/macros/s/.../exec)');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    try {
      await saveGoogleSheetSettings({
        spreadsheetId: extractSpreadsheetId(spreadsheetId),
        webhookUrl: cleanWebhook,
        autoSync: true,
      });

      const res = await syncFinancialDataViaWebhook(cleanWebhook, {
        userEmail: user.email,
        usdIdrRate,
        stats,
        accounts,
        transactions,
        investments,
        budgets,
      });

      const now = new Date().toLocaleString();
      setLastSynced(now);
      if (res.spreadsheetId) setSpreadsheetId(res.spreadsheetId);

      await saveGoogleSheetSettings({
        spreadsheetId: res.spreadsheetId || spreadsheetId,
        webhookUrl: cleanWebhook,
        autoSync: true,
        lastSynced: now,
      });

      showNotification({
        title: 'Google Sheets Berhasil Disinkronkan',
        message: `Seluruh data untuk ${user.email} telah berhasil diunggah ke Google Sheet!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Google Sheets Webhook sync error:', err);
      setAuthError(
        'Gagal menghubungi URL Google Apps Script. Pastikan Anda melakukan Deploy sebagai Web app dengan Who has access: Anyone.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pull latest financial data from Google Sheet Webhook (Two-way sync)
  const handlePullFromSheets = async () => {
    if (!user) return;
    const cleanWebhook = webhookUrl.trim();
    if (!cleanWebhook || !cleanWebhook.startsWith('https://script.google.com/')) {
      setAuthError('Harap masukkan Webhook URL Google Apps Script yang valid terlebih dahulu.');
      return;
    }

    setIsPulling(true);
    setAuthError(null);
    try {
      // 1. Save settings first so FinanceContext has the latest URL
      await saveGoogleSheetSettings({
        spreadsheetId: extractSpreadsheetId(spreadsheetId),
        webhookUrl: cleanWebhook,
        autoSync: true,
      });

      // 2. Execute pull
      const ok = await pullFromGoogleSheet({ silent: false });
      if (ok) {
        const now = new Date().toLocaleString();
        setLastSynced(now);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Gagal menarik data dari Google Sheets.');
    } finally {
      setIsPulling(false);
    }
  };

  // 2. Export All 5 Tabs as CSV Files
  const handleExportAllCsv = () => {
    try {
      const prefix = `WealthTrack_${(user?.email || 'davinwijaya16').split('@')[0]}`;
      const sheetsData = buildTabularSheetsData({
        userEmail: user?.email || 'davinwijaya16@gmail.com',
        usdIdrRate,
        stats,
        accounts,
        transactions,
        investments,
        budgets,
      });

      const toCsvString = (rows: any[][]) =>
        rows
          .map((row) =>
            row
              .map((cell) => {
                if (cell === null || cell === undefined) return '""';
                const str = String(cell).replace(/"/g, '""');
                return `"${str}"`;
              })
              .join(',')
          )
          .join('\r\n');

      downloadCsv(`${prefix}_1_Summary.csv`, toCsvString(sheetsData.Summary));
      setTimeout(() => downloadCsv(`${prefix}_2_Accounts.csv`, toCsvString(sheetsData.Accounts)), 150);
      setTimeout(() => downloadCsv(`${prefix}_3_Transactions.csv`, toCsvString(sheetsData.Transactions)), 300);
      setTimeout(() => downloadCsv(`${prefix}_4_Investments.csv`, toCsvString(sheetsData.Investments)), 450);
      setTimeout(() => downloadCsv(`${prefix}_5_Budgets.csv`, toCsvString(sheetsData.Budgets)), 600);

      showNotification({
        title: 'CSV Files Downloaded',
        message: '5 CSV files generated (Summary, Accounts, Transactions, Investments, Budgets).',
        type: 'success',
      });
    } catch (err: any) {
      setAuthError(`Failed to export CSV: ${err.message}`);
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

  const handleToggleAutoSync = async (checked: boolean) => {
    setAutoSync(checked);
    await saveGoogleSheetSettings({
      spreadsheetId,
      webhookUrl,
      autoSync: checked,
      lastSynced,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-xl p-5 sm:p-6 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-2xl shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1b212e] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                Google Sheets Live Auto-Sync
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Syncs Summary, Accounts, Transactions, Investments & Budgets for{' '}
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {user?.email}
                </span>
              </p>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[10px] border border-emerald-500/20">
                  Database: Google Sheets (Cloud Ledger)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[10px] border border-blue-500/20">
                  Login: Firebase Auth
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Live Data Summary & Auto-Sync Toggle */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1b212e] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Real-Time Auto-Sync on Every Input:
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => handleToggleAutoSync(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {autoSync ? 'ACTIVE' : 'PAUSED'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-[#1d2332]">
            <div className="p-2 rounded-lg bg-white dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332]">
              <span className="text-slate-500 dark:text-zinc-500 block">Accounts</span>
              <strong className="text-slate-900 dark:text-zinc-100">{accounts.length} Accounts</strong>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332]">
              <span className="text-slate-500 dark:text-zinc-500 block">Transactions</span>
              <strong className="text-slate-900 dark:text-zinc-100">{transactions.length} Records</strong>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332]">
              <span className="text-slate-500 dark:text-zinc-500 block">Investments</span>
              <strong className="text-slate-900 dark:text-zinc-100">{investments.length} Assets</strong>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332]">
              <span className="text-slate-500 dark:text-zinc-500 block">Budgets</span>
              <strong className="text-slate-900 dark:text-zinc-100">{budgets.length} Categories</strong>
            </div>
          </div>

          {lastSynced && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              <span>Last Synchronized: <strong className="text-emerald-500">{lastSynced}</strong></span>
              {spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(spreadsheetId)}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Open Google Sheet <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Mode Selector Tabs (2 Clean Options) */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('webhook');
              setAuthError(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'webhook'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Real-Time Auto-Sync (Web & Android)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('csv');
              setAuthError(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'csv'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>📥 5-Sheet CSV Export</span>
          </button>
        </div>

        {authError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Notice</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-700 dark:text-zinc-300">
              {authError}
            </p>
          </div>
        )}

        {/* TAB 1: UNIVERSAL WEB + ANDROID APK AUTO-SYNC BRIDGE */}
        {activeMode === 'webhook' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Works 100% on Website, GitHub Pages & Android APK
                </span>
                <button
                  type="button"
                  onClick={() => setShowScriptBox(!showScriptBox)}
                  className="text-[11px] font-mono underline text-emerald-600 dark:text-emerald-400 cursor-pointer"
                >
                  {showScriptBox ? 'Hide Setup Guide' : 'Show 30-Sec Setup Guide'}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Connect any Google Sheet once using a Google Apps Script Web App URL. Every new Expense, Income, Transfer, Account, Investment, or Budget you input on <strong>Web or Android APK</strong> updates your Google Sheet automatically!
              </p>

              {showScriptBox && (
                <div className="pt-2 space-y-2 border-t border-emerald-500/20">
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 dark:text-zinc-300">
                    <li>
                      Open a new or existing Google Sheet at{' '}
                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-500 underline font-semibold"
                      >
                        sheets.new
                      </a>
                    </li>
                    <li>
                      Click <strong>Extensions → Apps Script</strong>, replace the code with the script below, and click{' '}
                      <strong>Save</strong> (💾).
                    </li>
                    <li>
                      Click <strong>Deploy → New deployment</strong>, select type <strong>Web app</strong>, set{' '}
                      <strong>Who has access: Anyone</strong>, and click <strong>Deploy</strong>.
                    </li>
                    <li>Copy the generated <strong>Web app URL</strong> and paste it below!</li>
                  </ol>

                  <div className="relative">
                    <pre className="p-3 rounded-lg bg-black/40 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-36">
                      {GOOGLE_APPS_SCRIPT_TEMPLATE}
                    </pre>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedScript ? 'Copied Script!' : 'Copy Script'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Google Apps Script Web App URL:
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                onBlur={() => {
                  const clean = webhookUrl.trim();
                  if (clean && clean.startsWith('https://script.google.com/')) {
                    saveGoogleSheetSettings({
                      webhookUrl: clean,
                      autoSync: true,
                    });
                  }
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleWebhookSync}
                disabled={isLoading || isPulling}
                className="w-full py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kirim ke Sheet...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>⚡ Kirim ke Google Sheet</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePullFromSheets}
                disabled={isLoading || isPulling}
                className="w-full py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 border border-slate-700"
              >
                {isPulling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Tarik Data...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>📥 Tarik Data dari Sheet</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed text-center">
              💡 Data tersimpan di <strong>Google Sheet</strong> sebagai cloud database utama dan di-cache lokal di perangkat Anda. Gunakan <strong>Tarik Data</strong> untuk sinkronisasi antar-perangkat (HP/Laptop).
            </p>
          </div>
        )}

        {/* TAB 2: 5-SHEET CSV EXPORT */}
        {activeMode === 'csv' && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Complete 5-Sheet CSV Export
                </span>
              </div>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded">
                Summary + Accounts + Tx + Investments + Budgets
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
              Instantly download all 5 formatted CSV tables (<strong>Summary</strong>, <strong>Accounts</strong>,{' '}
              <strong>Transactions</strong>, <strong>Investments</strong>, and <strong>Budgets</strong>) for{' '}
              <span className="font-mono">{user?.email}</span> to import directly into Google Sheets or Microsoft Excel.
            </p>
            <button
              type="button"
              onClick={handleExportAllCsv}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download All 5 CSV Files Now</span>
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            Isolated per-account ledger for {user?.email}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-300 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
