export type AccountType = 'bank' | 'cash' | 'credit_card' | 'paylater';
export type InvestmentCategory = string;
export type Currency = 'IDR' | 'USD';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'bank_to_investment';

export interface HoldingType {
  id: string;
  label: string;
  defaultCurrency: 'IDR' | 'USD';
  badgeColor?: string;
  example?: string;
  isSystem?: boolean;
  createdAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'user';
  createdAt?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalInvestments: number;
  totalVolumeIdr: number;
  totalTrackedAssetsIdr: number;
  serverStatus: 'online' | 'degraded';
  dbType: string;
  uptimeSeconds: number;
  currentUsdRate: number;
  adminCount: number;
  registeredAdmins: string[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  accountsCount: number;
  transactionsCount: number;
  investmentsCount: number;
  totalNetWorthIdr?: number;
}

export interface SystemAnnouncement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  enabled: boolean;
  updatedAt: string;
}

export interface SystemSettings {
  announcement: SystemAnnouncement;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  adminEmails: string[];
  defaultUsdIdrRate: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number; // in IDR (for credit cards, represents current outstanding debt)
  accountNumber?: string;
  color?: string;
  creditLimit?: number;
  billingDate?: number; // e.g. 25
  dueDate?: number; // e.g. 10
  cardNetwork?: string; // 'Visa' | 'Mastercard' | 'JCB' | 'Amex'
  last4Digits?: string; // '4821'
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // in IDR
  accountId: string; // source account
  toAccountId?: string; // for transfer
  toInvestmentId?: string; // for bank_to_investment
  amountUsd?: number; // for USD investments
  exchangeRate?: number;
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  name: string;
  category: InvestmentCategory;
  currency: Currency;
  amountInvested: number; // Cost basis in asset currency
  currentValue: number; // Current value in asset currency
  customExchangeRate?: number; // Custom broker exchange rate to avoid system USD mismatch
  units?: number; // e.g. shares, lots, crypto amount
  platform?: string; // e.g. GoTrade, Bibit, Ajaib, Indodax
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  usdIdrRate: number;
  autoUpdateRate?: boolean;
  rateLastUpdated?: string;
  rateSource?: string;
  privacyModeDefault: boolean;
  theme: 'dark' | 'light';
  googleSpreadsheetId?: string;
  googleSheetWebhookUrl?: string;
  googleSheetLastSynced?: string;
  googleSheetAutoSync?: boolean;
}

export interface DashboardStats {
  rate: number;
  totalNetWorthIdr: number;
  totalLiquidCashIdr: number;
  totalInvestmentValueIdr: number;
  totalInvestmentValueUsd: number;
  totalInvestedCostIdr: number;
  unrealizedPnlIdr: number;
  unrealizedPnlPercentage: number;
  monthlyExpenses: number;
  monthlyIncomes: number;
  monthlyTransfersToInv: number;
  categoryAllocations: Record<string, { idrValue: number; usdValue: number; count: number }>;
  expenseByCategory: Record<string, number>;
  expenseByAccount: Record<string, { name: string; amount: number; type: string }>;
  incomeByCategory?: Record<string, number>;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number; // in IDR
  month?: string; // Optional target month e.g. "2026-11". If omitted, applies as default recurring limit
  createdAt: string;
  updatedAt: string;
}

export interface BudgetProgress {
  category: string;
  budgetId?: string;
  monthlyLimit: number;
  actualSpent: number;
  remaining: number;
  percentUsed: number;
  status: 'safe' | 'warning' | 'danger'; // safe (<75%), warning (75-99%), danger (>=100%)
  transactionCount: number;
  color?: string;
}

export type ActiveTab = 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin';

export interface NotificationPopupItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  amount?: number;
  txType?: 'expense' | 'income' | 'transfer' | 'bill_pay';
  category?: string;
  accountName?: string;
  date?: string;
  durationMs?: number;
}
