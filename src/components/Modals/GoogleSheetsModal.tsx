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
  Link2,
  Zap,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  authenticateGoogleSheets,
  getCachedGoogleSheetsToken,
  createWealthTrackSpreadsheet,
  syncFinancialDataToSheet,
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
    saveGoogleSheetSettings,
    showNotification,
  } = useFinance();

  const [activeMode, setActiveMode] = useState<'webhook' | 'oauth' | 'csv'>('webhook');
  const [isLoading, setIsLoading] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
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

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleCopyDomain = async () => {
    try {
      await navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    } catch {
      // ignore
    }
  };

  // 1. Connect & Sync via Universal Google Apps Script Bridge (Works on Web, GitHub Pages & Android APK!)
  const handleWebhookSync = async () => {
    if (!user) return;
    const cleanWebhook = webhookUrl.trim();
    if (!cleanWebhook || !cleanWebhook.startsWith('https://script.google.com/')) {
      setAuthError('Please paste a valid Google Apps Script Web App URL (starts with https://script.google.com/macros/s/.../exec)');
      return;
    }

    setIsLoading(true);
    setAuthError(null);
    try {
      const cleanSheetId = extractSpreadsheetId(spreadsheetId);
      const res = await syncFinancialDataViaWebhook(cleanWebhook, {
        userEmail: user.email,
        usdIdrRate,
        stats,
        accounts,
        transactions,
        investments,
        budgets,
      });

      const finalSheetId = res.spreadsheetId || cleanSheetId;
      const now = new Date().toLocaleString();

      setSpreadsheetId(finalSheetId || '');
      setLastSynced(now);

      await saveGoogleSheetSettings({
        spreadsheetId: finalSheetId,
        webhookUrl: cleanWebhook,
        autoSync: true,
        lastSynced: now,
      });

      showNotification({
        title: 'Live Google Sheet Auto-Sync Connected!',
        message: `All 5 tabs (Summary, Accounts, Transactions, Investments, Budgets) for ${user.email} are now synced & linked across Web and Android!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Webhook sync error:', err);
      setAuthError(
        err?.message ||
          'Failed to reach Google Apps Script URL. Make sure you deployed as "Web app" with "Who has access: Anyone".'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Connect & Sync via Direct Google OAuth REST API
  const handleOAuthConnectAndSync = async () => {
    if (!user) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      let token = getCachedGoogleSheetsToken();
      if (!token) {
        token = await authenticateGoogleSheets();
      }

      let currentId = extractSpreadsheetId(spreadsheetId);
      if (!currentId) {
        currentId = await createWealthTrackSpreadsheet(token, user.email);
      }

      await syncFinancialDataToSheet(token, currentId, {
        userEmail: user.email,
        usdIdrRate,
        stats,
        accounts,
        transactions,
        investments,
        budgets,
      });

      const now = new Date().toLocaleString();
      setSpreadsheetId(currentId);
      setLastSynced(now);

      await saveGoogleSheetSettings({
        spreadsheetId: currentId,
        webhookUrl,
        autoSync: true,
        lastSynced: now,
      });

      showNotification({
        title: 'Google Sheets OAuth Sync Success',
        message: `All 5 tabs (Summary, Accounts, Transactions, Investments, Budgets) for ${user.email} were synced to your Google Sheet!`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Google Sheets OAuth sync error:', err);
      const msg = err?.message || '';
      if (msg.includes('unauthorized-domain') || msg.includes('auth/unauthorized-domain')) {
        setAuthError(
          `Firebase Auth blocked the popup because "${currentDomain}" is not yet in your Firebase Console -> Authentication -> Settings -> Authorized domains. Either add "${currentDomain}" there, OR use the "Web + Android Auto-Sync Bridge" tab above which works immediately without domain restrictions!`
        );
      } else {
        setAuthError(msg || 'Failed to connect to Google Sheets via OAuth.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Export All 5 Tabs as CSV Files
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
                const str = cell === null || cell === undefined ? '' : String(cell);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              })
              .join(',')
          )
          .join('\n');

      downloadCsv(`${prefix}_1_summary.csv`, toCsvString(sheetsData.Summary));
      downloadCsv(`${prefix}_2_accounts.csv`, toCsvString(sheetsData.Accounts));
      downloadCsv(`${prefix}_3_transactions.csv`, toCsvString(sheetsData.Transactions));
      downloadCsv(`${prefix}_4_investments.csv`, toCsvString(sheetsData.Investments));
      downloadCsv(`${prefix}_5_budgets.csv`, toCsvString(sheetsData.Budgets));

      showNotification({
        title: 'Complete Financial Ledger Exported',
        message: 'Downloaded all 5 CSV sheets (Summary, Accounts, Transactions, Investments, Budgets) ready for Google Sheets!',
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
                Real-Time Sync on Every Input (Web & Android):
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-[#1b212e] text-[11px] font-mono text-slate-600 dark:text-zinc-400">
            <div>
              <strong className="text-slate-900 dark:text-zinc-100">{accounts.length}</strong> Accounts
            </div>
            <div>
              <strong className="text-slate-900 dark:text-zinc-100">{transactions.length}</strong> Transactions
            </div>
            <div>
              <strong className="text-slate-900 dark:text-zinc-100">{investments.length}</strong> Investments
            </div>
            <div>
              <strong className="text-slate-900 dark:text-zinc-100">{budgets.length}</strong> Budgets
            </div>
          </div>

          {(webhookUrl || spreadsheetId) && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#1b212e] text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {webhookUrl ? '24/7 Cloud Bridge Linked' : 'Spreadsheet ID Linked'}
                {lastSynced ? ` · Last Synced: ${lastSynced}` : ''}
              </span>
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

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('webhook');
              setAuthError(null);
            }}
            className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'webhook'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Web + APK Bridge</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('oauth');
              setAuthError(null);
            }}
            className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'oauth'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Google OAuth</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('csv');
              setAuthError(null);
            }}
            className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'csv'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>5-Sheet CSV</span>
          </button>
        </div>

        {authError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Sync Notice</span>
            </div>
            <p className="leading-relaxed">{authError}</p>
            {activeMode === 'oauth' && currentDomain && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/20 font-mono text-[11px]">
                <span className="truncate">{currentDomain}</span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: UNIVERSAL WEB + ANDROID APK AUTO-SYNC BRIDGE */}
        {activeMode === 'webhook' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  Works 100% on Website, GitHub Pages & Android APK (No Domain Error!)
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
                Connect any Google Sheet once using a Google Apps Script Web App URL. It is saved to your{' '}
                <strong className="text-slate-800 dark:text-zinc-200">{user?.email}</strong> Firebase profile so every
                new Expense, Income, Transfer, Account, Investment, or Budget you input on <strong>Web or Android APK</strong> updates your Google Sheet automatically!
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
                      <strong>Save</strong>.
                    </li>
                    <li>
                      Click <strong>Deploy → New deployment</strong>, choose type <strong>Web app</strong>, set{' '}
                      <em>Who has access</em> to <strong>Anyone</strong>, and click <strong>Deploy</strong>.
                    </li>
                    <li>Paste the generated <strong>Web app URL</strong> below and click <strong>Save & Sync All Data Now</strong>!</li>
                  </ol>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Apps Script Code:</span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Script Copied!' : 'Copy Apps Script Code'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Google Apps Script Web App URL <span className="text-emerald-500">*</span>
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Google Sheet URL or Spreadsheet ID (Optional — auto-detected on sync)
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1AbC.../edit"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleWebhookSync}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing All 5 Tabs to Google Sheet...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Save & Sync All Data Now (Summary, Accounts, Tx, Investments, Budgets)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DIRECT GOOGLE OAUTH API */}
        {activeMode === 'oauth' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200 dark:border-[#1b212e] space-y-2 text-xs">
              <p className="text-slate-600 dark:text-zinc-300 leading-relaxed">
                Uses Firebase Google OAuth popup to create or update a Google Sheet directly in your Google Drive.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-500 dark:text-zinc-400">
                  Current Domain: <strong className="font-mono text-slate-800 dark:text-zinc-200">{currentDomain}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 font-mono text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Copied' : 'Copy for Firebase Auth'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Existing Google Sheet URL or ID (Leave blank to create a new Google Sheet automatically)
              </label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Leave blank to auto-create 'WealthTrack Pro - davinwijaya16@gmail.com'"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] text-xs font-mono text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleOAuthConnectAndSync}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting & Syncing All 5 Tabs...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{spreadsheetId ? 'Sync All 5 Tabs via Google OAuth' : 'Connect & Create Google Sheet (OAuth)'}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 3: 5-SHEET CSV EXPORT */}
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
              <span className="font-mono">{user?.email}</span> to import directly into Google Sheets.
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
