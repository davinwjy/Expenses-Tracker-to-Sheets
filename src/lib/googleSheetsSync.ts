import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { firebaseApp } from './firebase';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

let cachedAccessToken: string | null = null;

export async function authenticateGoogleSheets(): Promise<string> {
  const auth = getAuth(firebaseApp!);
  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `WealthTrack Pro - ${userEmail}`,
      },
      sheets: [
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

export async function syncFinancialDataToSheet(
  token: string,
  spreadsheetId: string,
  payload: {
    accounts: any[];
    transactions: any[];
    investments: any[];
    budgets?: any[];
  }
): Promise<void> {
  // 1. Accounts
  const accountRows = [
    ['Account Name', 'Type', 'Balance (IDR)', 'Account Number'],
    ...(payload.accounts || []).map((a: any) => [
      a.name,
      a.type,
      a.balance,
      a.accountNumber || a.last4Digits || '',
    ]),
  ];
  await updateRange(token, spreadsheetId, 'Accounts!A1', accountRows);

  // 2. Transactions
  const txRows = [
    ['Date', 'Type', 'Category', 'Amount (IDR)', 'Account ID', 'Notes'],
    ...(payload.transactions || []).map((t: any) => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.accountId,
      t.notes || '',
    ]),
  ];
  await updateRange(token, spreadsheetId, 'Transactions!A1', txRows);

  // 3. Investments
  const invRows = [
    ['Name', 'Category', 'Currency', 'Amount Invested', 'Current Value', 'Units', 'Platform'],
    ...(payload.investments || []).map((i: any) => [
      i.name,
      i.category,
      i.currency || 'IDR',
      i.amountInvested,
      i.currentValue || 0,
      i.units || 0,
      i.platform || '',
    ]),
  ];
  await updateRange(token, spreadsheetId, 'Investments!A1', invRows);

  // 4. Budgets
  if (payload.budgets && payload.budgets.length > 0) {
    const budgetRows = [
      ['Category', 'Monthly Limit (IDR)'],
      ...payload.budgets.map((b: any) => [b.category, b.limit]),
    ];
    await updateRange(token, spreadsheetId, 'Budgets!A1', budgetRows);
  }
}

async function updateRange(token: string, spreadsheetId: string, range: string, values: any[][]) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
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
