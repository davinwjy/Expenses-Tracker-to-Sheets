import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { firebaseApp } from './firebase';
import { Account, Transaction, Investment, CategoryBudget, DashboardStats, UserSettings } from '../types';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

let cachedAccessToken: string | null = null;

export interface GoogleSheetSyncPayload {
  userEmail: string;
  usdIdrRate: number;
  stats?: DashboardStats | null;
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: CategoryBudget[];
}

export interface StoredSheetConfig {
  spreadsheetId: string;
  webhookUrl: string;
  autoSync: boolean;
  lastSynced: string;
}

export function getSheetStorageKey(email?: string): string {
  const cleanEmail = (email || 'default').trim().toLowerCase();
  return `wealthtrack_sheets_cfg_${cleanEmail}`;
}

export function getStoredSheetConfig(email?: string, settings?: UserSettings | null): StoredSheetConfig {
  const key = getSheetStorageKey(email);
  let local: Partial<StoredSheetConfig> = {};
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      local = JSON.parse(raw);
    }
    // Backwards compatibility with earlier keys
    const legacyId = localStorage.getItem(`wealthtrack_sheets_id_${email}`);
    const legacyTime = localStorage.getItem(`wealthtrack_sheets_id_${email}_time`);
    if (!local.spreadsheetId && legacyId) local.spreadsheetId = legacyId;
    if (!local.lastSynced && legacyTime) local.lastSynced = legacyTime;
  } catch {
    // ignore storage errors
  }

  return {
    spreadsheetId: settings?.googleSpreadsheetId || local.spreadsheetId || '',
    webhookUrl: settings?.googleSheetWebhookUrl || local.webhookUrl || '',
    autoSync: settings?.googleSheetAutoSync !== undefined ? settings.googleSheetAutoSync : (local.autoSync ?? true),
    lastSynced: settings?.googleSheetLastSynced || local.lastSynced || '',
  };
}

export function saveStoredSheetConfig(email: string, config: Partial<StoredSheetConfig>): StoredSheetConfig {
  const current = getStoredSheetConfig(email);
  const next: StoredSheetConfig = {
    ...current,
    ...config,
  };
  try {
    localStorage.setItem(getSheetStorageKey(email), JSON.stringify(next));
    if (next.spreadsheetId) {
      localStorage.setItem(`wealthtrack_sheets_id_${email}`, next.spreadsheetId);
    }
    if (next.lastSynced) {
      localStorage.setItem(`wealthtrack_sheets_id_${email}_time`, next.lastSynced);
    }
  } catch {
    // ignore
  }
  return next;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed;
}

export function buildTabularSheetsData(payload: GoogleSheetSyncPayload) {
  const rate = payload.usdIdrRate || 15850;
  const accountMap = new Map<string, string>();
  (payload.accounts || []).forEach((a) => accountMap.set(a.id, a.name));

  const nowStr = new Date().toLocaleString('id-ID');

  // 1. Summary Tab
  const totalBankCash = (payload.accounts || [])
    .filter((a) => a.type === 'bank' || a.type === 'cash')
    .reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalDebt = (payload.accounts || [])
    .filter((a) => a.type === 'credit_card' || a.type === 'paylater')
    .reduce((sum, a) => sum + (a.balance || 0), 0);
  const netLiquid = totalBankCash - totalDebt;

  const totalInvIdr = (payload.investments || []).reduce((sum, i) => {
    const val = i.currentValue ?? i.amountInvested ?? 0;
    const r = i.customExchangeRate || rate;
    return sum + (i.currency === 'USD' ? val * r : val);
  }, 0);

  const summaryRows = [
    ['Metric', 'Value (IDR / Info)', 'Notes'],
    ['User Account', payload.userEmail, 'Isolated Account Ledger'],
    ['Last Synced Timestamp', nowStr, 'Real-Time Auto-Sync (Web & Android)'],
    ['Total Net Worth (IDR)', netLiquid + totalInvIdr, 'Net Liquid Cash + Investment Portfolio'],
    ['Net Liquid Cash (IDR)', netLiquid, 'Bank & Cash minus CC/Paylater Debt'],
    ['Total Bank & Cash (IDR)', totalBankCash, `${(payload.accounts || []).filter((a) => a.type === 'bank' || a.type === 'cash').length} liquid accounts`],
    ['Total CC & Paylater Debt (IDR)', totalDebt, `${(payload.accounts || []).filter((a) => a.type === 'credit_card' || a.type === 'paylater').length} credit facilities`],
    ['Total Investment Portfolio (IDR)', totalInvIdr, `${(payload.investments || []).length} active holdings`],
    ['USD / IDR Exchange Rate', rate, 'Reference conversion rate'],
    ['Total Recorded Transactions', (payload.transactions || []).length, 'All-time expense, income & transfer logs'],
    ['Total Active Category Budgets', (payload.budgets || []).length, 'Monthly spending ceilings'],
  ];

  // 2. Accounts Tab
  const accountRows = [
    ['Account ID', 'Account Name', 'Type', 'Balance / Debt (IDR)', 'Credit Limit (IDR)', 'Account / Card Number', 'Updated At'],
    ...(payload.accounts || []).map((a) => [
      a.id,
      a.name,
      a.type,
      a.balance || 0,
      a.creditLimit || 0,
      a.accountNumber || a.last4Digits || '',
      a.updatedAt || a.createdAt || '',
    ]),
  ];

  // 3. Transactions Tab
  const txRows = [
    ['Transaction ID', 'Date', 'Type', 'Category', 'Amount (IDR)', 'Account Name', 'Account ID', 'Notes', 'Created At'],
    ...(payload.transactions || []).map((t) => [
      t.id,
      t.date,
      t.type,
      t.category,
      t.amount || 0,
      accountMap.get(t.accountId) || t.accountId,
      t.accountId,
      t.notes || '',
      t.createdAt || '',
    ]),
  ];

  // 4. Investments Tab
  const invRows = [
    [
      'Investment ID',
      'Asset Name',
      'Category',
      'Currency',
      'Cost Basis (Orig)',
      'Current Value (Orig)',
      'Current Value (IDR)',
      'Unrealized PnL (IDR)',
      'Units / Shares',
      'Platform / Broker',
      'Notes',
      'Updated At',
    ],
    ...(payload.investments || []).map((i) => {
      const r = i.customExchangeRate || rate;
      const costIdr = i.currency === 'USD' ? (i.amountInvested || 0) * r : (i.amountInvested || 0);
      const currIdr = i.currency === 'USD' ? (i.currentValue || 0) * r : (i.currentValue || 0);
      return [
        i.id,
        i.name,
        i.category,
        i.currency || 'IDR',
        i.amountInvested || 0,
        i.currentValue || 0,
        Math.round(currIdr),
        Math.round(currIdr - costIdr),
        i.units || 0,
        i.platform || '',
        i.notes || '',
        i.updatedAt || i.createdAt || '',
      ];
    }),
  ];

  // 5. Budgets Tab
  const currentMonth = new Date().toISOString().slice(0, 7);
  const spentByCategory = new Map<string, number>();
  (payload.transactions || []).forEach((t) => {
    if (t.type === 'expense' && (t.date || '').startsWith(currentMonth)) {
      const cat = (t.category || '').trim();
      spentByCategory.set(cat, (spentByCategory.get(cat) || 0) + (t.amount || 0));
    }
  });

  const budgetRows = [
    ['Budget ID', 'Category', 'Monthly Limit (IDR)', 'Spent This Month (IDR)', 'Remaining (IDR)', 'Usage (%)', 'Target Month'],
    ...(payload.budgets || []).map((b) => {
      const spent = spentByCategory.get((b.category || '').trim()) || 0;
      const limit = b.monthlyLimit || 0;
      const rem = limit - spent;
      const pct = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;
      return [
        b.id,
        b.category,
        limit,
        spent,
        rem,
        pct,
        b.month || 'Recurring Monthly',
      ];
    }),
  ];

  return {
    Summary: summaryRows,
    Accounts: accountRows,
    Transactions: txRows,
    Investments: invRows,
    Budgets: budgetRows,
  };
}

export async function authenticateGoogleSheets(): Promise<string> {
  const auth = getAuth(firebaseApp!);
  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to obtain Google Sheets access token');
  }
  cachedAccessToken = credential.accessToken;
  return cachedAccessToken;
}

export function getCachedGoogleSheetsToken(): string | null {
  return cachedAccessToken;
}

export async function createWealthTrackSpreadsheet(token: string, userEmail: string): Promise<string> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `WealthTrack Pro - ${userEmail}`,
      },
      sheets: [
        { properties: { title: 'Summary' } },
        { properties: { title: 'Accounts' } },
        { properties: { title: 'Transactions' } },
        { properties: { title: 'Investments' } },
        { properties: { title: 'Budgets' } },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Google Sheet: ${err}`);
  }

  const data = await res.json();
  return data.spreadsheetId;
}

async function ensureSheetTabsExist(token: string, spreadsheetId: string, tabNames: string[]) {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const existing = new Set<string>(
      (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean)
    );
    const missing = tabNames.filter((t) => !existing.has(t));
    if (missing.length === 0) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: missing.map((title) => ({
          addSheet: { properties: { title } },
        })),
      }),
    });
  } catch (err) {
    console.warn('ensureSheetTabsExist warning:', err);
  }
}

export async function syncFinancialDataToSheet(
  token: string,
  spreadsheetId: string,
  payload: {
    userEmail?: string;
    usdIdrRate?: number;
    stats?: DashboardStats | null;
    accounts: Account[];
    transactions: Transaction[];
    investments: Investment[];
    budgets?: CategoryBudget[];
  }
): Promise<void> {
  const sheetsData = buildTabularSheetsData({
    userEmail: payload.userEmail || 'davinwijaya16@gmail.com',
    usdIdrRate: payload.usdIdrRate || 15850,
    stats: payload.stats,
    accounts: payload.accounts || [],
    transactions: payload.transactions || [],
    investments: payload.investments || [],
    budgets: payload.budgets || [],
  });

  await ensureSheetTabsExist(token, spreadsheetId, ['Summary', 'Accounts', 'Transactions', 'Investments', 'Budgets']);

  for (const [tabName, rows] of Object.entries(sheetsData)) {
    // Clear tab first so deleted items don't leave ghost rows at the bottom
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${tabName}!A1:Z5000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    ).catch(() => {});

    await updateRange(token, spreadsheetId, `${tabName}!A1`, rows);
  }
}

async function updateRange(token: string, spreadsheetId: string, range: string, values: any[][]) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );
  if (!res.ok) {
    console.warn(`Failed to update range ${range}:`, await res.text());
  }
}

/**
 * Syncs all 5 tabs (Summary, Accounts, Transactions, Investments, Budgets) directly
 * to the user's Google Sheet via a Google Apps Script Web App URL.
 * Works 100% on AI Studio preview, GitHub Pages, and Android APK without any OAuth domain restrictions.
 */
export async function syncFinancialDataViaWebhook(
  webhookUrl: string,
  payload: GoogleSheetSyncPayload
): Promise<{ success: boolean; spreadsheetId?: string; spreadsheetUrl?: string }> {
  const sheetsData = buildTabularSheetsData(payload);

  const response = await fetch(webhookUrl.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'sync_all',
      userEmail: payload.userEmail,
      timestamp: new Date().toISOString(),
      sheets: sheetsData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook HTTP ${response.status}`);
  }

  try {
    const json = await response.json();
    return {
      success: true,
      spreadsheetId: json.spreadsheetId,
      spreadsheetUrl: json.spreadsheetUrl,
    };
  } catch {
    return { success: true };
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * WEALTHTRACK PRO - 24/7 REAL-TIME GOOGLE SHEETS AUTO-SYNC BRIDGE
 * Automatically syncs Summary, Accounts, Transactions, Investments & Budgets
 * from both Website and Android APK in real-time!
 *
 * SETUP (Takes 30 Seconds):
 * 1. Open your Google Sheet -> Click "Extensions" > "Apps Script"
 * 2. Delete any code there and paste this entire script, then click Save (💾)
 * 3. Click "Deploy" (top right) > "New deployment"
 * 4. Select type: "Web app"
 * 5. Set "Who has access" to: "Anyone"
 * 6. Click "Deploy", copy the "Web app URL", and paste it into WealthTrack Pro!
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsData = payload.sheets || {};
    var tabOrder = ['Summary', 'Accounts', 'Transactions', 'Investments', 'Budgets'];

    for (var i = 0; i < tabOrder.length; i++) {
      var tabName = tabOrder[i];
      var rows = sheetsData[tabName];
      if (!rows || !rows.length) continue;

      var sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
      }
      sheet.clearContents();
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

      // Style Header Row
      var headerRange = sheet.getRange(1, 1, 1, rows[0].length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0f172a');
      headerRange.setFontColor('#10b981');
      sheet.setFrozenRows(1);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      updatedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ready',
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    title: ss.getName()
  })).setMimeType(ContentService.MimeType.JSON);
}`;
