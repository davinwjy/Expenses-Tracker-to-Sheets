import { Account, Transaction, Investment, CategoryBudget, DashboardStats, UserSettings } from '../types';

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
  const updated: StoredSheetConfig = {
    ...current,
    ...config,
  };
  try {
    localStorage.setItem(getSheetStorageKey(email), JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

export function buildTabularSheetsData(payload: GoogleSheetSyncPayload): {
  Summary: any[][];
  Accounts: any[][];
  Transactions: any[][];
  Investments: any[][];
  Budgets: any[][];
} {
  const now = new Date().toLocaleString();
  const rate = payload.usdIdrRate || 15850;

  // 1. Tab: Summary (Portfolio Overview & User Profile)
  const totalBalance = payload.accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalInvested = payload.investments.reduce((s, i) => s + (i.amountInvested || 0), 0);
  const totalCurrentValue = payload.investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const netWorth = totalBalance + totalCurrentValue;
  const overallPnL = totalCurrentValue - totalInvested;
  const overallReturn = totalInvested > 0 ? (overallPnL / totalInvested) * 100 : 0;

  const summaryRows = [
    ['WealthTrack Pro - Financial Overview', ''],
    ['User Account', payload.userEmail],
    ['Last Synchronized', now],
    ['USD / IDR Exchange Rate', rate],
    ['', ''],
    ['METRIC', 'VALUE (IDR)'],
    ['Total Cash & Bank Balance', totalBalance],
    ['Total Capital Invested', totalInvested],
    ['Total Portfolio Market Value', totalCurrentValue],
    ['Total Net Worth (Cash + Investments)', netWorth],
    ['Overall Investment Profit / Loss', overallPnL],
    ['Overall Portfolio Return (%)', `${overallReturn.toFixed(2)}%`],
    ['', ''],
    ['SUMMARY BY HOLDING TYPE', 'INVESTED (IDR)', 'CURRENT VALUE (IDR)', 'PROFIT / LOSS', 'RETURN %'],
  ];

  // Holding types breakdown
  const holdingsMap: Record<string, { invested: number; current: number }> = {};
  payload.investments.forEach((inv) => {
    const t = inv.category || 'Other';
    if (!holdingsMap[t]) holdingsMap[t] = { invested: 0, current: 0 };
    holdingsMap[t].invested += inv.amountInvested || 0;
    holdingsMap[t].current += inv.currentValue || 0;
  });

  Object.entries(holdingsMap).forEach(([t, val]) => {
    const pnl = val.current - val.invested;
    const ret = val.invested > 0 ? (pnl / val.invested) * 100 : 0;
    summaryRows.push([t, val.invested, val.current, pnl, `${ret.toFixed(2)}%`]);
  });

  // 2. Tab: Accounts (Cash, Banks, E-Wallets)
  const accountRows = [
    ['ID', 'Account Name', 'Type', 'Balance (IDR)', 'Color', 'Last Updated'],
    ...payload.accounts.map((acc) => [
      acc.id,
      acc.name,
      acc.type,
      acc.balance,
      acc.color || '#10b981',
      acc.updatedAt ? new Date(acc.updatedAt).toLocaleString() : now,
    ]),
  ];

  // 3. Tab: Transactions (Expenses, Income, Transfers)
  const sortedTx = [...payload.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const txRows = [
    ['ID', 'Date', 'Type', 'Amount (IDR)', 'Category', 'Account', 'Notes', 'Transfer To Account'],
    ...sortedTx.map((tx) => {
      const acc = payload.accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
      const toAcc = tx.toAccountId ? payload.accounts.find((a) => a.id === tx.toAccountId)?.name || tx.toAccountId : '';
      return [
        tx.id,
        tx.date,
        tx.type.toUpperCase(),
        tx.amount,
        tx.category,
        acc,
        tx.notes || '',
        toAcc,
      ];
    }),
  ];

  // 4. Tab: Investments (Multi-Asset: USD, Bitcoin, Saham, RDPU, ETF USA)
  const invRows = [
    [
      'ID',
      'Asset Name',
      'Category',
      'Currency',
      'Platform / Broker',
      'Amount Invested',
      'Current Value',
      'Profit / Loss',
      'Return (%)',
      'Units / Quantity',
      'Custom Rate',
      'Notes',
    ],
    ...payload.investments.map((inv) => {
      const pnl = (inv.currentValue || 0) - (inv.amountInvested || 0);
      const ret = inv.amountInvested > 0 ? (pnl / inv.amountInvested) * 100 : 0;
      return [
        inv.id,
        inv.name,
        inv.category,
        inv.currency,
        inv.platform || 'General',
        inv.amountInvested,
        inv.currentValue,
        pnl,
        `${ret.toFixed(2)}%`,
        inv.units || '',
        inv.customExchangeRate || '',
        inv.notes || '',
      ];
    }),
  ];

  // 5. Tab: Budgets (Monthly Budget Limits & Spending)
  const budgetRows = [
    ['Category', 'Monthly Limit (IDR)', 'Spent (IDR)', 'Remaining (IDR)', 'Status (%)', 'Month'],
    ...payload.budgets.map((b) => {
      const spent = payload.transactions
        .filter((t) => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);
      const rem = Math.max(0, b.monthlyLimit - spent);
      const pct = b.monthlyLimit > 0 ? `${Math.round((spent / b.monthlyLimit) * 100)}%` : '0%';
      return [
        b.category,
        b.monthlyLimit,
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

/**
 * PUSH: Syncs all 5 tabs directly to the user's Google Sheet via Webhook.
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

/**
 * PULL: Fetches all data across all 5 tabs from the user's Google Sheet Webhook.
 * Used for two-way synchronization across multiple devices (PC, Phone, Laptop).
 */
export async function fetchFinancialDataFromWebhook(
  webhookUrl: string,
  userId: string = 'usr_local'
): Promise<{
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  budgets: CategoryBudget[];
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  lastSynced?: string;
}> {
  let json: any = null;

  // Try POST action: 'fetch_all' first (avoids CORS issues on Google Apps Script)
  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'fetch_all' }),
    });
    if (res.ok) {
      json = await res.json();
    }
  } catch (err) {
    console.warn('POST fetch_all attempt error:', err);
  }

  // Fallback to GET if POST didn't return valid sheets
  if (!json || !json.sheets) {
    try {
      const getRes = await fetch(webhookUrl.trim(), { method: 'GET' });
      if (getRes.ok) {
        json = await getRes.json();
      }
    } catch (err) {
      console.warn('GET fetch attempt error:', err);
    }
  }

  if (!json || typeof json !== 'object') {
    throw new Error('Google Sheet Webhook URL did not return a valid response. Make sure access is set to "Anyone".');
  }

  const sheets = json.sheets || {};
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];
  const investments: Investment[] = [];
  const budgets: CategoryBudget[] = [];

  // Robust number parser for Indonesian formats, currency symbols (Rp, $), and dots/commas
  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).replace(/[^0-9.,-]/g, '').trim();
    if (!s) return 0;
    if (s.includes('.') && s.includes(',')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes('.')) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, '');
      }
    } else if (s.includes(',')) {
      const parts = s.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(',', '.');
      }
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  // Flexible Tab Finder (supports English, Indonesian, Sheet1/2/3/4, or header keyword matching)
  const findSheetRows = (possibleNames: string[], headerKeywords: string[]): any[] => {
    for (const name of possibleNames) {
      if (sheets[name] && Array.isArray(sheets[name]) && sheets[name].length > 0) {
        return sheets[name];
      }
    }
    const sheetKeys = Object.keys(sheets);
    for (const name of possibleNames) {
      const matchKey = sheetKeys.find((k) => k.trim().toLowerCase() === name.trim().toLowerCase());
      if (matchKey && Array.isArray(sheets[matchKey]) && sheets[matchKey].length > 0) {
        return sheets[matchKey];
      }
    }
    // Fallback: inspect header row of ANY tab for matching keywords
    for (const key of sheetKeys) {
      const rows = sheets[key];
      if (Array.isArray(rows) && rows.length > 0) {
        const headerStr = (rows[0] || []).map((cell: any) => String(cell || '')).join(' ').toLowerCase();
        if (headerKeywords.some((kw) => headerStr.includes(kw.toLowerCase()))) {
          return rows;
        }
      }
    }
    return [];
  };

  const accRows = findSheetRows(
    ['Accounts', 'Akun', 'Rekening', 'Bank', 'Sheet1', 'Sheet 1'],
    ['account name', 'nama akun', 'balance', 'saldo', 'account type', 'tipe akun']
  );
  const txRows = findSheetRows(
    ['Transactions', 'Transaksi', 'Expenses', 'Pengeluaran', 'Catatan', 'Sheet2', 'Sheet 2'],
    ['amount', 'jumlah', 'category', 'kategori', 'notes', 'catatan', 'transfer']
  );
  const invRows = findSheetRows(
    ['Investments', 'Investasi', 'Portfolio', 'Assets', 'Portofolio', 'Sheet3', 'Sheet 3'],
    ['asset name', 'nama aset', 'current value', 'nilai pasar', 'units', 'platform']
  );
  const bgtRows = findSheetRows(
    ['Budgets', 'Anggaran', 'Budget', 'Target', 'Sheet4', 'Sheet 4'],
    ['monthly limit', 'batas bulanan', 'budget', 'anggaran']
  );

  // Parse Accounts
  if (accRows.length > 0) {
    let startIdx = 0;
    const firstRowStr = (accRows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('name') || firstRowStr.includes('nama') || firstRowStr.includes('balance') || firstRowStr.includes('saldo') || firstRowStr.includes('id')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < accRows.length; i++) {
      const r = accRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;

      const col0 = String(r[0] || '').trim();
      const col1 = String(r[1] || '').trim();
      const col2 = String(r[2] || '').trim();

      if (!col0 && !col1 && !r[3]) continue;
      if (col0.toLowerCase() === 'id' || col1.toLowerCase() === 'account name' || col1.toLowerCase() === 'nama akun') continue;

      const name = col1 || col0 || `Account ${i}`;
      const id = col0 && col0.length > 2 ? col0 : `acc_${i}_${Date.now()}`;

      let rawType = (col2 || 'bank').toLowerCase().trim();
      let type: any = 'bank';
      if (['cash', 'kas', 'tunai'].includes(rawType)) type = 'cash';
      else if (['e-wallet', 'ewallet', 'dompet digital', 'gopay', 'ovo', 'dana'].includes(rawType)) type = 'e-wallet';
      else if (['credit_card', 'kartu kredit', 'cc'].includes(rawType)) type = 'credit_card';
      else if (['paylater', 'pay later'].includes(rawType)) type = 'paylater';
      else if (['investment_bank', 'bank investasi'].includes(rawType)) type = 'investment_bank';

      accounts.push({
        id,
        userId,
        name,
        type,
        balance: parseNumber(r[3]),
        color: r[4] ? String(r[4]).trim() : '#10b981',
        createdAt: r[5] ? String(r[5]) : new Date().toISOString(),
        updatedAt: r[5] ? String(r[5]) : new Date().toISOString(),
      });
    }
  }

  // Parse Transactions
  if (txRows.length > 0) {
    let startIdx = 0;
    const firstRowStr = (txRows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('amount') || firstRowStr.includes('jumlah') || firstRowStr.includes('category') || firstRowStr.includes('kategori') || firstRowStr.includes('id') || firstRowStr.includes('date')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < txRows.length; i++) {
      const r = txRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;

      const col0 = String(r[0] || '').trim();
      const col1 = String(r[1] || '').trim();
      const col2 = String(r[2] || '').trim();

      if (!col0 && !col1 && !r[3]) continue;
      if (col0.toLowerCase() === 'id' || col1.toLowerCase() === 'date' || col2.toLowerCase() === 'type') continue;

      const txId = col0 && col0.length > 2 ? col0 : `tx_${i}_${Date.now()}`;
      const amount = Math.abs(parseNumber(r[3]));
      if (amount === 0 && !r[4] && !r[6]) continue;

      const accRef = String(r[5] || '').trim();
      const matchedAcc = accounts.find((a) => a.id === accRef || a.name === accRef);
      const accId = matchedAcc ? matchedAcc.id : (accounts[0]?.id || 'acc_default');

      const toAccRef = r[7] ? String(r[7]).trim() : undefined;
      const matchedTo = toAccRef ? accounts.find((a) => a.id === toAccRef || a.name === toAccRef) : undefined;
      const toAccountId = matchedTo ? matchedTo.id : toAccRef;

      let type: 'expense' | 'income' | 'transfer' = 'expense';
      const rawType = col2.toLowerCase();
      if (rawType.includes('in') || rawType.includes('pemasukan') || rawType.includes('income')) type = 'income';
      else if (rawType.includes('tr') || rawType.includes('transfer')) type = 'transfer';

      transactions.push({
        id: txId,
        userId,
        date: col1 ? col1.split('T')[0] : new Date().toISOString().split('T')[0],
        type,
        amount,
        category: r[4] ? String(r[4]).trim() : 'General',
        accountId: accId,
        toAccountId,
        notes: r[6] ? String(r[6]).trim() : '',
        createdAt: col1 || new Date().toISOString(),
      });
    }
  }

  // Parse Investments
  if (invRows.length > 0) {
    let startIdx = 0;
    const firstRowStr = (invRows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('asset') || firstRowStr.includes('name') || firstRowStr.includes('category') || firstRowStr.includes('id')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < invRows.length; i++) {
      const r = invRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;

      const col0 = String(r[0] || '').trim();
      const col1 = String(r[1] || '').trim();

      if (!col0 && !col1 && !r[5]) continue;
      if (col0.toLowerCase() === 'id' || col1.toLowerCase() === 'asset name' || col1.toLowerCase() === 'nama aset') continue;

      const invName = col1 || col0 || `Investment ${i}`;
      const invId = col0 && col0.length > 2 ? col0 : `inv_${i}_${Date.now()}`;

      investments.push({
        id: invId,
        userId,
        name: invName,
        category: r[2] ? String(r[2]).trim() : 'Other',
        currency: (String(r[3]).toUpperCase() === 'USD' ? 'USD' : 'IDR'),
        platform: r[4] ? String(r[4]).trim() : 'General',
        amountInvested: parseNumber(r[5]),
        currentValue: parseNumber(r[6]),
        units: r[9] ? parseNumber(r[9]) : undefined,
        customExchangeRate: r[10] ? parseNumber(r[10]) : undefined,
        notes: r[11] ? String(r[11]).trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Parse Budgets
  if (bgtRows.length > 0) {
    let startIdx = 0;
    const firstRowStr = (bgtRows[0] || []).join(' ').toLowerCase();
    if (firstRowStr.includes('category') || firstRowStr.includes('kategori')) {
      startIdx = 1;
    }

    for (let i = startIdx; i < bgtRows.length; i++) {
      const r = bgtRows[i];
      if (!r || !Array.isArray(r) || r.length === 0) continue;
      const cat = String(r[0]).trim();
      if (!cat || cat.toLowerCase() === 'category' || cat.toLowerCase() === 'kategori') continue;

      budgets.push({
        id: `bgt_${cat}`,
        userId,
        category: cat,
        monthlyLimit: parseNumber(r[1]),
        month: r[5] ? String(r[5]) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    accounts,
    transactions,
    investments,
    budgets,
    spreadsheetId: json.spreadsheetId,
    spreadsheetUrl: json.spreadsheetUrl,
    lastSynced: new Date().toLocaleString(),
  };
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * WEALTHTRACK PRO - 24/7 REAL-TIME TWO-WAY GOOGLE SHEETS STORAGE & SYNC
 * Acts as your cloud database: stores and syncs Summary, Accounts, Transactions,
 * Investments & Budgets across all your devices (PC, Laptop & Android Phone)!
 *
 * SETUP (Takes 30 Seconds):
 * 1. Open your Google Sheet -> Click "Extensions" > "Apps Script"
 * 2. Delete any code there and paste this entire script, then click Save (💾)
 * 3. Click "Deploy" (top right) > "New deployment"
 * 4. Select type: "Web app"
 * 5. Set "Who has access" to: "Anyone"
 * 6. Click "Deploy", copy the "Web app URL", and paste it into WealthTrack Pro!
 */

function readAllTabs(ss) {
  var result = {};
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow > 0 && lastCol > 0) {
      result[name] = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    } else {
      result[name] = [];
    }
  }
  return result;
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Two-Way Pull: Read all tabs and return JSON to sync across devices
    if (payload.action === 'fetch_all' || payload.action === 'get_all') {
      var sheetsData = readAllTabs(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        sheets: sheetsData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Real-Time Push: Write and style all 5 tabs
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
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsData = readAllTabs(ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ready',
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      title: ss.getName(),
      sheets: sheetsData
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
