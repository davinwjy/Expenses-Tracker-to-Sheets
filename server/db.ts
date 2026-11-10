import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'wealthtrack.json');

export type AccountType = 'bank' | 'cash' | 'credit_card' | 'paylater' | 'ewallet';
export type InvestmentCategory = string;
export type Currency = 'IDR' | 'USD';

export interface HoldingType {
  id: string;
  label: string;
  defaultCurrency: 'IDR' | 'USD';
  badgeColor?: string;
  example?: string;
  isSystem?: boolean;
  createdAt?: string;
}

export const DEFAULT_HOLDING_TYPES: HoldingType[] = [
  { id: 'Saham', label: 'Indonesian Stocks', defaultCurrency: 'IDR', badgeColor: '#10b981', example: 'e.g. BBCA, BBRI, ASII', isSystem: true },
  { id: 'ETF USA', label: 'US Stocks & ETFs', defaultCurrency: 'USD', badgeColor: '#6366f1', example: 'e.g. VOO, QQQ, SCHD, SPY', isSystem: true },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', defaultCurrency: 'IDR', badgeColor: '#f59e0b', example: 'e.g. BTC, Cold storage', isSystem: true },
  { id: 'RDPU', label: 'Money Market (RDPU)', defaultCurrency: 'IDR', badgeColor: '#06b6d4', example: 'e.g. Sucorinvest Stable Fund', isSystem: true },
  { id: 'USD', label: 'USD Cash Buffer', defaultCurrency: 'USD', badgeColor: '#8b5cf6', example: 'e.g. Broker cash, Wise USD', isSystem: true },
];

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: 'admin' | 'user';
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number; // in IDR
  accountNumber?: string;
  color?: string;
  creditLimit?: number;
  billingDate?: number;
  dueDate?: number;
  cardNetwork?: string;
  last4Digits?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'expense' | 'income' | 'transfer' | 'bank_to_investment';
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
  amountInvested: number; // Cost basis in asset currency (IDR for Saham/RDPU, USD for USD/Bitcoin/ETF USA)
  currentValue: number; // Current value in asset currency
  customExchangeRate?: number; // Custom broker exchange rate
  units?: number; // e.g. shares, lots, crypto amount
  platform?: string; // e.g. GoTrade, Bibit, Ajaib, Indodax, etc.
  notes?: string;
  updatedAt: string;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  usdIdrRate: number; // e.g. 15850
  autoUpdateRate?: boolean;
  rateLastUpdated?: string;
  rateSource?: string;
  privacyModeDefault: boolean;
  theme: 'dark' | 'light';
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

export interface CategoryBudget {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  settings: UserSettings[];
  holdingTypes?: HoldingType[];
  budgets?: CategoryBudget[];
  systemSettings?: SystemSettings;
}

// In-memory cache synced with JSON file
let dbData: DatabaseSchema = {
  users: [],
  accounts: [],
  transactions: [],
  investments: [],
  settings: [],
  holdingTypes: [...DEFAULT_HOLDING_TYPES],
  budgets: [],
  systemSettings: {
    announcement: {
      id: 'ann_default',
      message: 'System running normally. All wealth tracking modules active.',
      type: 'info',
      enabled: false,
      updatedAt: new Date().toISOString(),
    },
    maintenanceMode: false,
    allowNewRegistrations: true,
    adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
    defaultUsdIdrRate: 15850,
  },
};

// Initialize data directory and file
export function initDB(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      dbData = JSON.parse(raw);
      if (!dbData.systemSettings) {
        dbData.systemSettings = {
          announcement: {
            id: 'ann_default',
            message: 'System running normally. All wealth tracking modules active.',
            type: 'info',
            enabled: false,
            updatedAt: new Date().toISOString(),
          },
          maintenanceMode: false,
          allowNewRegistrations: true,
          adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
          defaultUsdIdrRate: 15850,
        };
        persistDB();
      } else {
        // Ensure davinwijaya16@gmail.com is in adminEmails
        if (!dbData.systemSettings.adminEmails.includes('davinwijaya16@gmail.com')) {
          dbData.systemSettings.adminEmails.push('davinwijaya16@gmail.com');
          persistDB();
        }
      }

      if (!dbData.holdingTypes || dbData.holdingTypes.length === 0) {
        dbData.holdingTypes = [...DEFAULT_HOLDING_TYPES];
        persistDB();
      }
    } catch (e) {
      console.error('Error reading db file, re-initializing:', e);
      persistDB();
    }
  } else {
    persistDB();
  }
}

export function persistDB(): void {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export const db = {
  get data() {
    return dbData;
  },
  save() {
    persistDB();
  },
};
