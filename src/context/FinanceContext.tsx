import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import {
  Account,
  AccountType,
  Transaction,
  Investment,
  DashboardStats,
  UserSettings,
  SystemAnnouncement,
  HoldingType,
  InvestmentCategory,
  CategoryBudget,
  BudgetProgress,
  NotificationPopupItem,
} from '../types';
import { api } from '../lib/api';
import { localDb, DEFAULT_HOLDING_TYPES } from '../lib/localDb';
import { useAuth } from './AuthContext';
import { isFirebaseActive, syncFirestoreOnline } from '../lib/firebase';
import { computeStats } from '../lib/statsHelper';
import { exchangeRateService } from '../lib/exchangeRateService';
import { offlineSyncManager, FinancialSnapshot } from '../lib/offlineSync';
import {
  syncFinancialDataViaWebhook,
  fetchFinancialDataFromWebhook,
  getStoredSheetConfig,
  saveStoredSheetConfig,
} from '../lib/googleSheetsSync';

interface FinanceContextType {
  // Offline & Synchronization Status
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  triggerManualSync: () => Promise<void>;

  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  stats: DashboardStats | null;
  settings: UserSettings | null;
  usdIdrRate: number;
  rateSource: string;
  rateLastUpdated: string | null;
  isRateAutoUpdate: boolean;
  setIsRateAutoUpdate: (enabled: boolean) => Promise<void>;
  isRateFetching: boolean;
  fetchLatestRate: (options?: { silent?: boolean }) => Promise<{ success: boolean; rate?: number }>;
  isLoading: boolean;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  activeTab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin') => void;
  tabHistory: Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>;
  goBack: () => boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  isMobileQuickMenuOpen: boolean;
  setIsMobileQuickMenuOpen: (v: boolean) => void;
  announcement: SystemAnnouncement | null;
  refreshAnnouncement: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Account Operations
  addAccount: (data: {
    name: string;
    type: AccountType;
    balance: number;
    accountNumber?: string;
    color?: string;
    creditLimit?: number;
    billingDate?: number;
    dueDate?: number;
    cardNetwork?: string;
    last4Digits?: string;
  }) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  payCreditCardBill: (data: {
    creditCardAccountId: string;
    sourceAccountId: string;
    amountIdr: number;
    adminFee?: number;
    date?: string;
    notes?: string;
  }) => Promise<void>;

  // Transaction Operations
  addTransaction: (data: {
    type: 'expense' | 'income';
    amount: number;
    accountId: string;
    category: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Transfer Operations
  transferFunds: (data: {
    type: 'account_to_account' | 'bank_to_investment';
    fromAccountId: string;
    toAccountId?: string;
    toInvestmentId?: string;
    newInvestment?: {
      name: string;
      category: InvestmentCategory;
      currency?: 'IDR' | 'USD';
      platform?: string;
      units?: number;
      notes?: string;
    };
    amountIdr: number;
    amountUsd?: number;
    exchangeRate?: number;
    date?: string;
    notes?: string;
  }) => Promise<void>;

  // Investment Operations
  addInvestment: (data: {
    name: string;
    category: InvestmentCategory;
    currency?: 'IDR' | 'USD';
    amountInvested: number;
    currentValue?: number;
    customExchangeRate?: number;
    units?: number;
    platform?: string;
    notes?: string;
  }) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  // Holding Types (Master Data)
  holdingTypes: HoldingType[];
  addHoldingType: (data: {
    id?: string;
    label: string;
    defaultCurrency: 'IDR' | 'USD';
    example?: string;
    badgeColor?: string;
  }) => Promise<void>;
  updateHoldingType: (id: string, data: Partial<HoldingType>) => Promise<void>;
  deleteHoldingType: (id: string) => Promise<void>;

  // Settings
  updateRate: (newRate: number, source?: string) => Promise<void>;

  // Modal states
  isHoldingTypesModalOpen: boolean;
  setIsHoldingTypesModalOpen: (v: boolean) => void;
  isAddExpenseOpen: boolean;
  setIsAddExpenseOpen: (v: boolean) => void;
  transactionInitialType: 'expense' | 'income';
  setTransactionInitialType: (type: 'expense' | 'income') => void;
  isTransferOpen: boolean;
  setIsTransferOpen: (v: boolean) => void;
  transferInitialMode: 'account_to_account' | 'bank_to_investment';
  setTransferInitialMode: (mode: 'account_to_account' | 'bank_to_investment') => void;
  isAddAccountOpen: boolean;
  setIsAddAccountOpen: (v: boolean) => void;
  isAddInvestmentOpen: boolean;
  setIsAddInvestmentOpen: (v: boolean) => void;
  editingAccount: Account | null;
  setEditingAccount: (a: Account | null) => void;
  editingInvestment: Investment | null;
  setEditingInvestment: (i: Investment | null) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (t: Transaction | null) => void;
  isFirebaseSetupOpen: boolean;
  setIsFirebaseSetupOpen: (v: boolean) => void;
  isMobileAppModalOpen: boolean;
  setIsMobileAppModalOpen: (v: boolean) => void;
  isPayBillOpen: boolean;
  setIsPayBillOpen: (v: boolean) => void;
  payBillCard: Account | null;
  setPayBillCard: (a: Account | null) => void;
  isGoogleSheetsModalOpen: boolean;
  setIsGoogleSheetsModalOpen: (v: boolean) => void;
  pullFromGoogleSheet: (opts?: { silent?: boolean }) => Promise<boolean>;
  saveGoogleSheetSettings: (cfg: {
    spreadsheetId?: string;
    webhookUrl?: string;
    autoSync?: boolean;
    lastSynced?: string;
  }) => Promise<void>;

  // Budgeting Operations
  budgets: CategoryBudget[];
  saveBudget: (category: string, monthlyLimit: number, month?: string, id?: string) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  isBudgetModalOpen: boolean;
  setIsBudgetModalOpen: (v: boolean) => void;
  editingBudget: CategoryBudget | null;
  setEditingBudget: (b: CategoryBudget | null) => void;
  getBudgetProgressForMonth: (targetMonthStr?: string) => {
    items: BudgetProgress[];
    unbudgetedItems: Array<{ category: string; actualSpent: number; transactionCount: number }>;
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    overallPercent: number;
    isOverBudget: boolean;
    overBudgetCount: number;
  };

  // Popup Notification
  notification: NotificationPopupItem | null;
  showNotification: (item: Omit<NotificationPopupItem, 'id'>) => void;
  closeNotification: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isFirebase } = useAuth();

  // Load cached snapshot for immediate 0ms offline dashboard availability
  const cachedSnapshot = offlineSyncManager.getSnapshot();

  const [accounts, setAccounts] = useState<Account[]>(() => cachedSnapshot?.accounts || []);
  const [transactions, setTransactions] = useState<Transaction[]>(() => cachedSnapshot?.transactions || []);
  const [investments, setInvestments] = useState<Investment[]>(() => cachedSnapshot?.investments || []);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => cachedSnapshot?.budgets || []);
  const [stats, setStats] = useState<DashboardStats | null>(() => cachedSnapshot?.stats || null);
  const [settings, setSettings] = useState<UserSettings | null>(() => cachedSnapshot?.settings || null);
  const [usdIdrRate, setUsdIdrRate] = useState<number>(() => cachedSnapshot?.usdIdrRate || 15850);
  const [rateSource, setRateSource] = useState<string>(() => {
    return cachedSnapshot?.rateSource || exchangeRateService.getLastRateInfo().source;
  });
  const [rateLastUpdated, setRateLastUpdated] = useState<string | null>(() => {
    return cachedSnapshot?.rateLastUpdated || exchangeRateService.getLastRateInfo().timestamp;
  });
  const [isRateAutoUpdate, setIsRateAutoUpdateState] = useState<boolean>(() => {
    return exchangeRateService.getAutoUpdateEnabled();
  });
  const [isRateFetching, setIsRateFetching] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  // Connectivity & Background Sync Status
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => offlineSyncManager.getPendingQueue().length);
  const lastSheetPayloadHashRef = useRef<string>('');

  const [announcement, setAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>('dashboard');
  const [tabHistory, setTabHistory] = useState<Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>>(['dashboard']);

  const setActiveTab = useCallback((tab: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin') => {
    setActiveTabState((prevTab) => {
      if (prevTab === tab) return prevTab;
      setTabHistory((prevHist) => {
        if (prevHist[prevHist.length - 1] === tab) return prevHist;
        return [...prevHist, tab].slice(-30);
      });
      return tab;
    });

    try {
      window.history.pushState({ tab }, '', '#' + tab);
    } catch {}

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<CategoryBudget | null>(null);

  const refreshAnnouncement = useCallback(async () => {
    try {
      const res = await api.getPublicAnnouncement();
      if (res.announcement && res.announcement.enabled && res.announcement.message) {
        setAnnouncement(res.announcement);
      } else {
        setAnnouncement(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshAnnouncement();
  }, [refreshAnnouncement]);

  // Theme mode: 'dark' | 'light'
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('wealthtrack_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  const applyTheme = useCallback((targetTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('wealthtrack_theme', newTheme);
    } catch {}
    applyTheme(newTheme);
    if (user?.email) {
      offlineSyncManager.saveSnapshot(
        { settings: { ...(settings || { userId: user.id, usdIdrRate: 15850, privacyModeDefault: false }), theme: newTheme } },
        user.email
      );
    }
  }, [applyTheme, user, settings]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Privacy mode persistent in localStorage
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('wealthtrack_privacy_mode') === 'true';
  });

  // Holding Types state
  const [holdingTypes, setHoldingTypes] = useState<HoldingType[]>(DEFAULT_HOLDING_TYPES);
  const [isHoldingTypesModalOpen, setIsHoldingTypesModalOpen] = useState(false);

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [transactionInitialType, setTransactionInitialType] = useState<'expense' | 'income'>('expense');
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferInitialMode, setTransferInitialMode] = useState<'account_to_account' | 'bank_to_investment'>('account_to_account');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isFirebaseSetupOpen, setIsFirebaseSetupOpen] = useState(false);
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState(false);
  const [isPayBillOpen, setIsPayBillOpen] = useState(false);
  const [payBillCard, setPayBillCard] = useState<Account | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileQuickMenuOpen, setIsMobileQuickMenuOpen] = useState(false);

  // Popup Notification State
  const [notification, setNotification] = useState<NotificationPopupItem | null>(null);

  const showNotification = useCallback((item: Omit<NotificationPopupItem, 'id'>) => {
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setNotification({ ...item, id });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const duration = notification.durationMs || 4500;
    const timer = setTimeout(() => {
      setNotification(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [notification]);

  // Ref trackers to avoid stale closures and infinite re-render loops in callbacks
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const usdIdrRateRef = useRef(usdIdrRate);
  useEffect(() => { usdIdrRateRef.current = usdIdrRate; }, [usdIdrRate]);

  const accountsRef = useRef(accounts);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);

  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  const investmentsRef = useRef(investments);
  useEffect(() => { investmentsRef.current = investments; }, [investments]);

  const budgetsRef = useRef(budgets);
  useEffect(() => { budgetsRef.current = budgets; }, [budgets]);

  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const initialPulledUserRef = useRef<string | null>(null);

  // Ref trackers to guarantee zero stale closure issues in hardware/gesture back handlers
  const isMobileQuickMenuOpenRef = useRef(false);
  const isMobileMenuOpenRef = useRef(false);
  const isAddExpenseOpenRef = useRef(false);
  const isTransferOpenRef = useRef(false);
  const isAddAccountOpenRef = useRef(false);
  const isAddInvestmentOpenRef = useRef(false);
  const isBudgetModalOpenRef = useRef(false);
  const isPayBillOpenRef = useRef(false);
  const isHoldingTypesModalOpenRef = useRef(false);
  const isFirebaseSetupOpenRef = useRef(false);
  const isMobileAppModalOpenRef = useRef(false);
  const activeTabRef = useRef<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>('dashboard');
  const tabHistoryRef = useRef<Array<'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin'>>(['dashboard']);
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => { isMobileQuickMenuOpenRef.current = isMobileQuickMenuOpen; }, [isMobileQuickMenuOpen]);
  useEffect(() => { isMobileMenuOpenRef.current = isMobileMenuOpen; }, [isMobileMenuOpen]);
  useEffect(() => { isAddExpenseOpenRef.current = isAddExpenseOpen; }, [isAddExpenseOpen]);
  useEffect(() => { isTransferOpenRef.current = isTransferOpen; }, [isTransferOpen]);
  useEffect(() => { isAddAccountOpenRef.current = isAddAccountOpen; }, [isAddAccountOpen]);
  useEffect(() => { isAddInvestmentOpenRef.current = isAddInvestmentOpen; }, [isAddInvestmentOpen]);
  useEffect(() => { isBudgetModalOpenRef.current = isBudgetModalOpen; }, [isBudgetModalOpen]);
  useEffect(() => { isPayBillOpenRef.current = isPayBillOpen; }, [isPayBillOpen]);
  useEffect(() => { isHoldingTypesModalOpenRef.current = isHoldingTypesModalOpen; }, [isHoldingTypesModalOpen]);
  useEffect(() => { isFirebaseSetupOpenRef.current = isFirebaseSetupOpen; }, [isFirebaseSetupOpen]);
  useEffect(() => { isMobileAppModalOpenRef.current = isMobileAppModalOpen; }, [isMobileAppModalOpen]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { tabHistoryRef.current = tabHistory; }, [tabHistory]);

  const goBack = useCallback((): boolean => {
    // 1. If any modal / quick action / drawer is open, close it first
    if (isMobileQuickMenuOpenRef.current) {
      setIsMobileQuickMenuOpen(false);
      return true;
    }
    if (isMobileMenuOpenRef.current) {
      setIsMobileMenuOpen(false);
      return true;
    }
    if (isAddExpenseOpenRef.current) {
      setIsAddExpenseOpen(false);
      setEditingTransaction(null);
      return true;
    }
    if (isTransferOpenRef.current) {
      setIsTransferOpen(false);
      return true;
    }
    if (isAddAccountOpenRef.current) {
      setIsAddAccountOpen(false);
      setEditingAccount(null);
      return true;
    }
    if (isAddInvestmentOpenRef.current) {
      setIsAddInvestmentOpen(false);
      setEditingInvestment(null);
      return true;
    }
    if (isBudgetModalOpenRef.current) {
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
      return true;
    }
    if (isPayBillOpenRef.current) {
      setIsPayBillOpen(false);
      setPayBillCard(null);
      return true;
    }
    if (isHoldingTypesModalOpenRef.current) {
      setIsHoldingTypesModalOpen(false);
      return true;
    }
    if (isFirebaseSetupOpenRef.current) {
      setIsFirebaseSetupOpen(false);
      return true;
    }
    if (isMobileAppModalOpenRef.current) {
      setIsMobileAppModalOpen(false);
      return true;
    }

    // 2. Check tab history stack: navigate to previous menu/page
    const history = tabHistoryRef.current;
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // remove current active tab
      const previousTab = nextHistory[nextHistory.length - 1];
      tabHistoryRef.current = nextHistory;
      setTabHistory(nextHistory);
      activeTabRef.current = previousTab;
      setActiveTabState(previousTab);
      try {
        window.history.replaceState({ tab: previousTab }, '', '#' + previousTab);
      } catch {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      return true;
    }

    // 3. If currently not on root dashboard, return to dashboard
    if (activeTabRef.current !== 'dashboard') {
      tabHistoryRef.current = ['dashboard'];
      setTabHistory(['dashboard']);
      activeTabRef.current = 'dashboard';
      setActiveTabState('dashboard');
      try {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } catch {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
      return true;
    }

    // 4. At root dashboard with nothing open to dismiss
    return false;
  }, []);

  // Hardware Back Button and Browser Popstate Handler
  useEffect(() => {
    let removeCapacitorListener: (() => void) | null = null;

    const handleBackEvent = async () => {
      const handled = goBack();
      if (handled) {
        return;
      }

      // Root level with no open modals: Exit app directly
      try {
        await CapApp.exitApp();
      } catch (err) {
        console.warn('exitApp error', err);
      }
    };

    // 1. Capacitor Native Android Back Button Listener (Android APK)
    try {
      CapApp.addListener('backButton', () => {
        handleBackEvent();
      }).then((handle) => {
        removeCapacitorListener = () => {
          handle.remove();
        };
      }).catch(() => {});
    } catch {}

    // 2. Browser / PWA popstate listener
    const onPopState = () => {
      handleBackEvent();
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
      window.removeEventListener('popstate', onPopState);
    };
  }, [goBack, showNotification]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      localStorage.setItem('wealthtrack_privacy_mode', String(next));
      return next;
    });
  };

  // 1. PULL FINANCIAL DATA FROM GOOGLE SHEETS
  const pullFromGoogleSheet = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      const currentUser = userRef.current;
      if (!currentUser?.email) return false;
      const sheetCfg = getStoredSheetConfig(currentUser.email, settingsRef.current);
      if (!sheetCfg.webhookUrl || !sheetCfg.webhookUrl.startsWith('https://')) {
        if (!opts?.silent) {
          showNotification({
            title: 'Google Sheet Belum Terhubung',
            message: 'Harap masukkan Webhook URL Google Apps Script di menu Integrasi Google Sheets.',
            type: 'warning',
          });
        }
        return false;
      }

      setIsSyncing(true);
      try {
        const result = await fetchFinancialDataFromWebhook(sheetCfg.webhookUrl, currentUser.id || currentUser.email);
        const { accounts: fetchedAccs, transactions: fetchedTxs, investments: fetchedInvs, budgets: fetchedBudgets } =
          result;

        // Auto-seed if sheet is fresh/empty but we have existing local data
        const currentAccs = accountsRef.current;
        const currentTxs = transactionsRef.current;
        const currentInvs = investmentsRef.current;
        const currentBudgets = budgetsRef.current;
        const currentStats = statsRef.current;
        const currentRate = usdIdrRateRef.current;

        if (
          fetchedAccs.length === 0 &&
          fetchedTxs.length === 0 &&
          fetchedInvs.length === 0 &&
          (currentAccs.length > 0 || currentTxs.length > 0 || currentInvs.length > 0)
        ) {
          console.log('Google Sheet is empty. Seeding local snapshot to sheet...');
          await syncFinancialDataViaWebhook(sheetCfg.webhookUrl, {
            userEmail: currentUser.email,
            usdIdrRate: currentRate,
            stats: currentStats,
            accounts: currentAccs,
            transactions: currentTxs,
            investments: currentInvs,
            budgets: currentBudgets,
          }).catch((e) => console.warn('Auto-seed to Google Sheet failed:', e));

          if (!opts?.silent) {
            showNotification({
              title: 'Data Lokal Disinkron ke Google Sheets',
              message: 'Google Sheet kosong telah diisi dengan data portofolio lokal Anda.',
              type: 'success',
            });
          }
          return true;
        }

        const normalizedInvestments: Investment[] = fetchedInvs.map((inv: Investment) =>
          inv.category === 'Bitcoin' && inv.currency !== 'IDR'
            ? { ...inv, currency: 'IDR' as const }
            : inv
        );

        setAccounts(fetchedAccs);
        setTransactions(fetchedTxs);
        setInvestments(normalizedInvestments);
        if (fetchedBudgets && fetchedBudgets.length > 0) {
          setBudgets(fetchedBudgets);
        }

        const nextStats = computeStats(fetchedAccs, fetchedTxs, normalizedInvestments, currentRate);
        setStats(nextStats);

        offlineSyncManager.saveSnapshot(
          {
            accounts: fetchedAccs,
            transactions: fetchedTxs,
            investments: normalizedInvestments,
            budgets: fetchedBudgets,
            stats: nextStats,
            usdIdrRate: currentRate,
          },
          currentUser.email
        );

        const nowStr = new Date().toLocaleString();
        saveStoredSheetConfig(currentUser.email, {
          lastSynced: nowStr,
        });

        // Update signature so auto-sync doesn't immediately post back the exact data we just pulled
        const signature = JSON.stringify({
          u: currentUser.email,
          a: fetchedAccs.map((x: Account) => [x.id, x.name, x.balance, x.updatedAt]),
          t: fetchedTxs.map((x: Transaction) => [x.id, x.amount, x.date, x.category, x.notes]),
          i: normalizedInvestments.map((x: Investment) => [x.id, x.amountInvested, x.currentValue, x.units, x.updatedAt]),
          b: (fetchedBudgets || []).map((x: CategoryBudget) => [x.id, x.category, x.monthlyLimit, x.month]),
        });
        lastSheetPayloadHashRef.current = signature;

        if (!opts?.silent) {
          showNotification({
            title: 'Data Google Sheets Berhasil Dimuat',
            message: `${fetchedAccs.length} Akun, ${fetchedTxs.length} Transaksi, dan ${normalizedInvestments.length} Investasi berhasil disinkronkan.`,
            type: 'success',
          });
        }
        return true;
      } catch (err: any) {
        console.error('Pull from Google Sheet error:', err);
        if (!opts?.silent) {
          showNotification({
            title: 'Gagal Menarik Data',
            message: err.message || 'Periksa koneksi internet atau Webhook URL Apps Script Anda.',
            type: 'error',
          });
        }
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [showNotification]
  );

  // 2. USER AUTHENTICATION & DATA HYDRATION
  // Firebase handles login/identity. Google Sheets + local snapshot handles all financial records.
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setIsLoading(true);
      // Load user-specific cached snapshot for instant 0ms access
      const userSnapshot = offlineSyncManager.getSnapshot(user.email);
      if (userSnapshot) {
        const normalizedInvs = (userSnapshot.investments || []).map((inv) =>
          inv.category === 'Bitcoin' && inv.currency !== 'IDR'
            ? { ...inv, currency: 'IDR' as const }
            : inv
        );
        setAccounts(userSnapshot.accounts || []);
        setTransactions(userSnapshot.transactions || []);
        setInvestments(normalizedInvs);
        setBudgets(userSnapshot.budgets || []);
        setSettings(userSnapshot.settings || null);
        const rate = userSnapshot.usdIdrRate || 15850;
        setUsdIdrRate(rate);
        if (userSnapshot.rateSource) setRateSource(userSnapshot.rateSource);
        if (userSnapshot.rateLastUpdated) setRateLastUpdated(userSnapshot.rateLastUpdated);
        const computed =
          userSnapshot.stats ||
          computeStats(userSnapshot.accounts || [], userSnapshot.transactions || [], normalizedInvs, rate);
        setStats(computed);
      }
      setIsLoading(false);

      // Auto-pull fresh data from Google Sheet if connected (runs once per user login session)
      if (initialPulledUserRef.current !== user.email) {
        initialPulledUserRef.current = user.email;
        const sheetCfg = getStoredSheetConfig(user.email);
        if (sheetCfg.webhookUrl && sheetCfg.webhookUrl.startsWith('https://')) {
          pullFromGoogleSheet({ silent: true }).catch(() => {});
        }
      }
    } else if (!isAuthenticated) {
      initialPulledUserRef.current = null;
      setAccounts([]);
      setTransactions([]);
      setInvestments([]);
      setBudgets([]);
      setStats(null);
    }
  }, [isAuthenticated, user?.email, pullFromGoogleSheet]);

  // Standard Server / Local Refresh fallback
  const refreshData = useCallback(async () => {
    if (!isAuthenticated) return;
    const currentUser = userRef.current;
    if (currentUser?.email) {
      const sheetCfg = getStoredSheetConfig(currentUser.email);
      if (sheetCfg.webhookUrl && sheetCfg.webhookUrl.startsWith('https://')) {
        await pullFromGoogleSheet({ silent: true });
        return;
      }
    }
    try {
      const [accRes, txRes, invRes, statsRes, setRes, htRes, bgtRes] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getInvestments(),
        api.getDashboardStats(),
        api.getSettings(),
        api.getHoldingTypes(),
        api.getBudgets(),
      ]);

      const normalizedInvestments = invRes.investments.map((inv) =>
        inv.category === 'Bitcoin' && inv.currency !== 'IDR'
          ? { ...inv, currency: 'IDR' as const }
          : inv
      );

      setAccounts(accRes.accounts);
      setTransactions(txRes.transactions);
      setInvestments(normalizedInvestments);
      if (htRes?.holdingTypes && htRes.holdingTypes.length > 0) {
        setHoldingTypes(htRes.holdingTypes);
      }
      if (bgtRes?.budgets) {
        setBudgets(bgtRes.budgets);
      }
      setStats(statsRes);
      setSettings(setRes.settings);
      if (setRes.settings?.usdIdrRate) {
        setUsdIdrRate(setRes.settings.usdIdrRate);
      }
      if (setRes.settings?.rateSource) setRateSource(setRes.settings.rateSource);
      if (setRes.settings?.rateLastUpdated) setRateLastUpdated(setRes.settings.rateLastUpdated);

      if (currentUser?.email) {
        offlineSyncManager.saveSnapshot(
          {
            accounts: accRes.accounts,
            transactions: txRes.transactions,
            investments: normalizedInvestments,
            budgets: bgtRes?.budgets,
            holdingTypes: htRes?.holdingTypes,
            stats: statsRes,
            settings: setRes.settings,
            usdIdrRate: setRes.settings?.usdIdrRate,
          },
          currentUser.email
        );
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    }
  }, [isAuthenticated, pullFromGoogleSheet]);

  // ---------------- OPERATIONS ----------------

  // Accounts
  const addAccount = async (data: {
    name: string;
    type: AccountType;
    balance: number;
    accountNumber?: string;
    color?: string;
    creditLimit?: number;
    billingDate?: number;
    dueDate?: number;
    cardNetwork?: string;
    last4Digits?: string;
  }) => {
    const now = new Date().toISOString();
    const newAccount: Account = {
      id: 'acc_' + Date.now(),
      userId: user?.id || 'usr_local',
      name: data.name.trim(),
      type: data.type,
      balance: Number(data.balance) || 0,
      color: data.color || '#3b82f6',
      createdAt: now,
      updatedAt: now,
      ...(data.accountNumber?.trim() ? { accountNumber: data.accountNumber.trim() } : {}),
      ...(data.creditLimit !== undefined ? { creditLimit: Number(data.creditLimit) } : {}),
      ...(data.billingDate !== undefined ? { billingDate: Number(data.billingDate) } : {}),
      ...(data.dueDate !== undefined ? { dueDate: Number(data.dueDate) } : {}),
      ...(data.cardNetwork?.trim() ? { cardNetwork: data.cardNetwork.trim() } : {}),
      ...(data.last4Digits?.trim() ? { last4Digits: data.last4Digits.trim() } : {}),
    };

    const nextAccs = [...accounts, newAccount];
    setAccounts(nextAccs);
    const nextStats = computeStats(nextAccs, transactions, investments, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts: nextAccs,
        transactions,
        investments,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.createAccount(data).catch(() => {});
    }
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    const target = accounts.find((a) => a.id === id);
    if (target) {
      const updated: Account = {
        ...target,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      const nextAccs = accounts.map((a) => (a.id === id ? updated : a));
      setAccounts(nextAccs);
      const nextStats = computeStats(nextAccs, transactions, investments, usdIdrRate);
      setStats(nextStats);

      offlineSyncManager.saveSnapshot(
        {
          accounts: nextAccs,
          transactions,
          investments,
          budgets,
          stats: nextStats,
          usdIdrRate,
        },
        user?.email
      );

      if (!isFirebase) {
        api.updateAccount(id, data).catch(() => {});
      }
    }
  };

  const deleteAccount = async (id: string) => {
    const nextAccs = accounts.filter((a) => a.id !== id);
    setAccounts(nextAccs);
    const nextStats = computeStats(nextAccs, transactions, investments, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts: nextAccs,
        transactions,
        investments,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.deleteAccount(id).catch(() => {});
    }
  };

  // Transactions
  const addTransaction = async (data: {
    type: 'expense' | 'income';
    amount: number;
    accountId: string;
    category: string;
    date: string;
    notes?: string;
  }) => {
    const parsedAmount = Math.abs(Number(data.amount));
    const now = new Date().toISOString();
    const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const targetAcc = accounts.find((a) => a.id === data.accountId);
    if (!targetAcc) throw new Error('Funding account not found');

    if (data.type === 'expense') {
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        if (targetAcc.creditLimit !== undefined && targetAcc.balance + parsedAmount > targetAcc.creditLimit) {
          const avail = Math.max(0, targetAcc.creditLimit - targetAcc.balance);
          throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      } else {
        if (parsedAmount > targetAcc.balance) {
          throw new Error(`Insufficient balance (${targetAcc.balance.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    let updatedAccounts = [...accounts];
    let updatedAcc: Account | null = null;

    if (targetAcc) {
      let newBal = targetAcc.balance;
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        newBal = data.type === 'expense' ? targetAcc.balance + parsedAmount : targetAcc.balance - parsedAmount;
      } else {
        newBal = data.type === 'expense' ? targetAcc.balance - parsedAmount : targetAcc.balance + parsedAmount;
      }
      updatedAcc = {
        ...targetAcc,
        balance: newBal,
        updatedAt: now,
      };
      updatedAccounts = updatedAccounts.map((a) => (a.id === updatedAcc!.id ? updatedAcc! : a));
    }

    const newTx: Transaction = {
      id: txId,
      userId: user?.id || 'usr_local',
      type: data.type,
      amount: parsedAmount,
      accountId: data.accountId,
      category: data.category,
      date: data.date,
      createdAt: now,
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    };

    // Immediate optimistic state update
    const nextTxs = [newTx, ...transactions];
    setAccounts(updatedAccounts);
    setTransactions(nextTxs);
    const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
    setStats(nextStats);

    // Save to snapshot immediately for instant offline dashboard access
    offlineSyncManager.saveSnapshot(
      {
        accounts: updatedAccounts,
        transactions: nextTxs,
        investments,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.createTransaction(data).catch(() => {});
    }
  };

  const payCreditCardBill = async (data: {
    creditCardAccountId: string;
    sourceAccountId: string;
    amountIdr: number;
    adminFee?: number;
    date?: string;
    notes?: string;
  }) => {
    const sourceAcc = accounts.find((a) => a.id === data.sourceAccountId);
    const ccAcc = accounts.find((a) => a.id === data.creditCardAccountId);
    if (!sourceAcc || !ccAcc) throw new Error('Accounts not found');

    const amount = Math.abs(Number(data.amountIdr));
    const adminFee = Math.abs(Number(data.adminFee || 0));
    const totalDeduction = amount + adminFee;
    const now = new Date().toISOString();
    const txId = 'tx_cc_' + Date.now();
    const txDate = data.date || now.split('T')[0];

    const updatedSource = {
      ...sourceAcc,
      balance: sourceAcc.balance - totalDeduction,
      updatedAt: now,
    };
    const updatedCc = {
      ...ccAcc,
      balance: Math.max(0, ccAcc.balance - amount),
      updatedAt: now,
    };

    const updatedAccounts = accounts.map((a) =>
      a.id === updatedSource.id ? updatedSource : a.id === updatedCc.id ? updatedCc : a
    );

    const tx: Transaction = {
      id: txId,
      userId: user?.id || 'usr_local',
      type: 'transfer',
      amount,
      accountId: data.sourceAccountId,
      toAccountId: data.creditCardAccountId,
      category: `Credit Card Payment (${ccAcc.name})`,
      date: txDate,
      notes: data.notes || `Paid credit card bill for ${ccAcc.name} from ${sourceAcc.name}${adminFee > 0 ? ` (Admin Fee: Rp ${adminFee.toLocaleString()})` : ''}`,
      createdAt: now,
    };

    const createdTxs = [tx];
    if (adminFee > 0) {
      createdTxs.push({
        id: 'tx_fee_' + Date.now(),
        userId: user?.id || 'usr_local',
        type: 'expense',
        amount: adminFee,
        accountId: data.sourceAccountId,
        category: 'Admin / Settlement Fee',
        date: txDate,
        notes: `Admin settlement fee for ${ccAcc.name} bill payment`,
        createdAt: now,
      });
    }

    const nextTxs = [...createdTxs, ...transactions];
    setAccounts(updatedAccounts);
    setTransactions(nextTxs);
    const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts: updatedAccounts,
        transactions: nextTxs,
        investments,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.payCreditCardBill(data).catch(() => {});
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const newAmount = data.amount !== undefined ? Math.abs(Number(data.amount)) : oldTx.amount;
    const newType = (data.type || oldTx.type) as 'expense' | 'income';
    const newAccountId = data.accountId || oldTx.accountId;
    const now = new Date().toISOString();

    const oldAcc = accounts.find((a) => a.id === oldTx.accountId);
    const newAcc = accounts.find((a) => a.id === newAccountId);
    if (!newAcc) throw new Error('Target account not found');

    // Validate available balance/credit for updated expense
    if (newType === 'expense') {
      if (newAcc.type === 'credit_card' || newAcc.type === 'paylater') {
        if (newAcc.creditLimit !== undefined) {
          let revertedDebt = newAcc.balance;
          if (oldAcc && oldAcc.id === newAcc.id && oldTx.type === 'expense') {
            revertedDebt = Math.max(0, revertedDebt - oldTx.amount);
          }
          if (revertedDebt + newAmount > newAcc.creditLimit) {
            const avail = Math.max(0, newAcc.creditLimit - revertedDebt);
            throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
          }
        }
      } else {
        let revertedBal = newAcc.balance;
        if (oldAcc && oldAcc.id === newAcc.id && oldTx.type === 'expense') {
          revertedBal += oldTx.amount;
        }
        if (newAmount > revertedBal) {
          throw new Error(`Insufficient balance (${revertedBal.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    const updatedTx: Transaction = {
      ...oldTx,
      ...data,
      amount: newAmount,
      type: newType,
      accountId: newAccountId,
    };

    let updatedAccounts = [...accounts];

    if (oldAcc && newAcc && oldAcc.id === newAcc.id) {
      // Modifying transaction within the same account
      let bal = oldAcc.balance;

      // 1. Revert previous transaction effect
      if (oldAcc.type === 'credit_card' || oldAcc.type === 'paylater') {
        if (oldTx.type === 'expense') bal -= oldTx.amount;
        else if (oldTx.type === 'income') bal += oldTx.amount;
      } else {
        if (oldTx.type === 'expense') bal += oldTx.amount;
        else if (oldTx.type === 'income') bal -= oldTx.amount;
      }

      // 2. Apply new transaction effect
      if (oldAcc.type === 'credit_card' || oldAcc.type === 'paylater') {
        if (newType === 'expense') bal += newAmount;
        else if (newType === 'income') bal -= newAmount;
      } else {
        if (newType === 'expense') bal -= newAmount;
        else if (newType === 'income') bal += newAmount;
      }

      const modAcc = { ...oldAcc, balance: bal, updatedAt: now };
      updatedAccounts = updatedAccounts.map((a) => (a.id === modAcc.id ? modAcc : a));

      // Immediate optimistic update
      const nextTxs = transactions.map((t) => (t.id === id ? updatedTx : t));
      setAccounts(updatedAccounts);
      setTransactions(nextTxs);
      const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
      setStats(nextStats);

      offlineSyncManager.saveSnapshot(
        {
          accounts: updatedAccounts,
          transactions: nextTxs,
          investments,
          budgets,
          stats: nextStats,
          usdIdrRate,
        },
        user?.email
      );

      if (!isFirebase) {
        api.updateTransaction(id, data).catch(() => {});
      }
    } else {
      // Account was changed to a different one
      let modOldAcc = oldAcc ? { ...oldAcc } : null;
      let modNewAcc = newAcc ? { ...newAcc } : null;

      if (modOldAcc) {
        let bal = modOldAcc.balance;
        if (modOldAcc.type === 'credit_card' || modOldAcc.type === 'paylater') {
          if (oldTx.type === 'expense') bal -= oldTx.amount;
          else if (oldTx.type === 'income') bal += oldTx.amount;
        } else {
          if (oldTx.type === 'expense') bal += oldTx.amount;
          else if (oldTx.type === 'income') bal += oldTx.amount;
        }
        modOldAcc.balance = bal;
        modOldAcc.updatedAt = now;
      }

      if (modNewAcc) {
        let bal = modNewAcc.balance;
        if (modNewAcc.type === 'credit_card' || modNewAcc.type === 'paylater') {
          if (newType === 'expense') bal += newAmount;
          else if (newType === 'income') bal -= newAmount;
        } else {
          if (newType === 'expense') bal -= newAmount;
          else if (newType === 'income') bal += newAmount;
        }
        modNewAcc.balance = bal;
        modNewAcc.updatedAt = now;
      }

      if (modOldAcc) {
        updatedAccounts = updatedAccounts.map((a) => (a.id === modOldAcc!.id ? modOldAcc! : a));
      }
      if (modNewAcc) {
        updatedAccounts = updatedAccounts.map((a) => (a.id === modNewAcc!.id ? modNewAcc! : a));
      }

      // Immediate optimistic update
      const nextTxs = transactions.map((t) => (t.id === id ? updatedTx : t));
      setAccounts(updatedAccounts);
      setTransactions(nextTxs);
      const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
      setStats(nextStats);

      offlineSyncManager.saveSnapshot(
        {
          accounts: updatedAccounts,
          transactions: nextTxs,
          investments,
          budgets,
          stats: nextStats,
          usdIdrRate,
        },
        user?.email
      );

      if (!isFirebase) {
        api.updateTransaction(id, data).catch(() => {});
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    const targetAcc = accounts.find((a) => a.id === target.accountId);
    let updatedAccounts = [...accounts];
    let modAcc: Account | null = null;

    if (targetAcc) {
      let newBal = targetAcc.balance;
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        newBal = target.type === 'expense' ? targetAcc.balance - target.amount : targetAcc.balance + target.amount;
      } else {
        newBal = target.type === 'expense' ? targetAcc.balance + target.amount : targetAcc.balance - target.amount;
      }
      modAcc = {
        ...targetAcc,
        balance: newBal,
        updatedAt: new Date().toISOString(),
      };
      updatedAccounts = updatedAccounts.map((a) => (a.id === modAcc!.id ? modAcc! : a));
    }

    // Immediate optimistic update
    const nextTxs = transactions.filter((t) => t.id !== id);
    setAccounts(updatedAccounts);
    setTransactions(nextTxs);
    const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts: updatedAccounts,
        transactions: nextTxs,
        investments,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.deleteTransaction(id).catch(() => {});
    }
  };

  // Transfers
  const transferFunds = async (data: {
    type: 'account_to_account' | 'bank_to_investment';
    fromAccountId: string;
    toAccountId?: string;
    toInvestmentId?: string;
    newInvestment?: {
      name: string;
      category: InvestmentCategory;
      currency?: 'IDR' | 'USD';
      platform?: string;
      units?: number;
      notes?: string;
    };
    amountIdr: number;
    amountUsd?: number;
    exchangeRate?: number;
    date?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const txId = 'tx_' + Date.now();

    if (data.type === 'account_to_account' && data.toAccountId) {
      const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
      const toAcc = accounts.find((a) => a.id === data.toAccountId);
      if (fromAcc && toAcc) {
        const updatedFrom = {
          ...fromAcc,
          balance: fromAcc.balance - data.amountIdr,
          updatedAt: now,
        };
        const updatedTo = {
          ...toAcc,
          balance: toAcc.balance + data.amountIdr,
          updatedAt: now,
        };
        const updatedAccounts = accounts.map((a) =>
          a.id === updatedFrom.id ? updatedFrom : a.id === updatedTo.id ? updatedTo : a
        );

        const tx: Transaction = {
          id: txId,
          userId: user?.id || 'usr_local',
          type: 'transfer',
          amount: data.amountIdr,
          accountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          category: `Transfer to ${toAcc.name}`,
          date: data.date || now.split('T')[0],
          notes: data.notes,
          createdAt: now,
        };

        const nextTxs = [tx, ...transactions];
        setAccounts(updatedAccounts);
        setTransactions(nextTxs);
        const nextStats = computeStats(updatedAccounts, nextTxs, investments, usdIdrRate);
        setStats(nextStats);

        offlineSyncManager.saveSnapshot(
          {
            accounts: updatedAccounts,
            transactions: nextTxs,
            investments,
            budgets,
            stats: nextStats,
            usdIdrRate,
          },
          user?.email
        );
      }
    } else if (data.type === 'bank_to_investment') {
      const fromAcc = accounts.find((a) => a.id === data.fromAccountId);
      if (!fromAcc) throw new Error('Source account not found');

      let targetInv = data.toInvestmentId ? investments.find((i) => i.id === data.toInvestmentId) : undefined;
      let targetInvId = data.toInvestmentId;
      let updatedInvestments = [...investments];

      if (!targetInv && data.newInvestment) {
        const targetCurrency =
          data.newInvestment.currency ||
          (data.newInvestment.category === 'USD' || data.newInvestment.category === 'ETF USA' ? 'USD' : 'IDR');
        const isUsd = targetCurrency === 'USD';
        let rate = data.exchangeRate || usdIdrRate;
        let initialCost = data.amountIdr;
        let amountUsd = undefined;

        if (isUsd) {
          const parsedUsd = Number(data.amountUsd);
          if (!isNaN(parsedUsd) && parsedUsd > 0) {
            initialCost = Number(parsedUsd.toFixed(2));
            amountUsd = initialCost;
            if (data.amountIdr > 0) {
              rate = data.exchangeRate || Number((data.amountIdr / initialCost).toFixed(2));
            }
          } else {
            initialCost = Number((data.amountIdr / rate).toFixed(2));
            amountUsd = initialCost;
          }
        }

        targetInvId = 'inv_' + Date.now();
        targetInv = {
          id: targetInvId,
          userId: user?.id || 'usr_local',
          name: data.newInvestment.name.trim(),
          category: data.newInvestment.category,
          currency: targetCurrency,
          amountInvested: initialCost,
          currentValue: initialCost,
          customExchangeRate: isUsd ? rate : undefined,
          createdAt: now,
          updatedAt: now,
          ...(data.newInvestment.units !== undefined ? { units: data.newInvestment.units } : {}),
          ...(data.newInvestment.platform?.trim() ? { platform: data.newInvestment.platform.trim() } : {}),
          ...(data.newInvestment.notes?.trim() ? { notes: data.newInvestment.notes.trim() } : {}),
        };
        updatedInvestments = [...updatedInvestments, targetInv];
      } else if (targetInv) {
        const isUsd = targetInv.currency === 'USD';
        let rate = data.exchangeRate || targetInv.customExchangeRate || usdIdrRate;
        let addedCost = data.amountIdr;
        let addedVal = data.amountIdr;
        let amountUsd = undefined;

        if (isUsd) {
          const parsedUsd = Number(data.amountUsd);
          if (!isNaN(parsedUsd) && parsedUsd > 0) {
            addedCost = Number(parsedUsd.toFixed(2));
            addedVal = addedCost;
            amountUsd = addedCost;
            if (data.amountIdr > 0) {
              rate = data.exchangeRate || Number((data.amountIdr / addedCost).toFixed(2));
            }
          } else {
            addedCost = Number((data.amountIdr / rate).toFixed(2));
            addedVal = addedCost;
            amountUsd = addedCost;
          }
        }

        const modInv = {
          ...targetInv,
          amountInvested: targetInv.amountInvested + addedCost,
          currentValue: targetInv.currentValue + addedVal,
          customExchangeRate: isUsd ? rate : targetInv.customExchangeRate,
          updatedAt: now,
        };
        updatedInvestments = updatedInvestments.map((i) => (i.id === modInv.id ? modInv : i));
        targetInv = modInv;
      }

      const updatedFrom = {
        ...fromAcc,
        balance: fromAcc.balance - data.amountIdr,
        updatedAt: now,
      };
      const updatedAccounts = accounts.map((a) => (a.id === updatedFrom.id ? updatedFrom : a));

      const tx: Transaction = {
        id: txId,
        userId: user?.id || 'usr_local',
        type: 'bank_to_investment',
        amount: data.amountIdr,
        accountId: data.fromAccountId,
        toInvestmentId: targetInvId,
        category: `Funded ${targetInv?.name || 'Investment'}`,
        date: data.date || now.split('T')[0],
        notes: data.notes || `Initial funding for ${targetInv?.name || 'Investment'} from ${fromAcc.name}`,
        createdAt: now,
      };

      const nextTxs = [tx, ...transactions];
      setAccounts(updatedAccounts);
      setInvestments(updatedInvestments);
      setTransactions(nextTxs);
      const nextStats = computeStats(updatedAccounts, nextTxs, updatedInvestments, usdIdrRate);
      setStats(nextStats);

      offlineSyncManager.saveSnapshot(
        {
          accounts: updatedAccounts,
          transactions: nextTxs,
          investments: updatedInvestments,
          budgets,
          stats: nextStats,
          usdIdrRate,
        },
        user?.email
      );
    }

    if (!isFirebase) {
      api.executeTransfer(data).catch(() => {});
    }
  };

  // Investments
  const addInvestment = async (data: {
    name: string;
    category: InvestmentCategory;
    currency?: 'IDR' | 'USD';
    amountInvested: number;
    currentValue?: number;
    customExchangeRate?: number;
    units?: number;
    platform?: string;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const chosenCurrency = data.currency || (data.category === 'USD' || data.category === 'ETF USA' ? 'USD' : 'IDR');
    const newInv: Investment = {
      id: 'inv_' + Date.now(),
      userId: user?.id || 'usr_local',
      name: data.name,
      category: data.category,
      currency: chosenCurrency,
      amountInvested: data.amountInvested,
      currentValue: data.currentValue ?? data.amountInvested,
      customExchangeRate: data.customExchangeRate,
      createdAt: now,
      updatedAt: now,
      ...(data.units !== undefined ? { units: data.units } : {}),
      ...(data.platform?.trim() ? { platform: data.platform.trim() } : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    };

    const nextInvs = [...investments, newInv];
    setInvestments(nextInvs);
    const nextStats = computeStats(accounts, transactions, nextInvs, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts,
        transactions,
        investments: nextInvs,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.createInvestment(data).catch(() => {});
    }
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    const target = investments.find((i) => i.id === id);
    if (!target) return;
    const nextCategory = data.category || target.category;
    const nextCurrency =
      data.currency ??
      target.currency ??
      (nextCategory === 'USD' || nextCategory === 'ETF USA' ? 'USD' : 'IDR');

    const updated: Investment = {
      ...target,
      ...data,
      currency: nextCurrency,
      updatedAt: new Date().toISOString(),
    };
    const nextInvs = investments.map((i) => (i.id === id ? updated : i));
    setInvestments(nextInvs);
    const nextStats = computeStats(accounts, transactions, nextInvs, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts,
        transactions,
        investments: nextInvs,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.updateInvestment(id, data).catch(() => {});
    }
  };

  const deleteInvestment = async (id: string) => {
    const nextInvs = investments.filter((i) => i.id !== id);
    setInvestments(nextInvs);
    const nextStats = computeStats(accounts, transactions, nextInvs, usdIdrRate);
    setStats(nextStats);

    offlineSyncManager.saveSnapshot(
      {
        accounts,
        transactions,
        investments: nextInvs,
        budgets,
        stats: nextStats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.deleteInvestment(id).catch(() => {});
    }
  };

  // Holding Types Operations
  const addHoldingType = async (data: {
    id?: string;
    label: string;
    defaultCurrency: 'IDR' | 'USD';
    example?: string;
    badgeColor?: string;
  }) => {
    const res = await api.addHoldingType(data);
    setHoldingTypes((prev) => [...prev.filter((h) => h.id !== res.holdingType.id), res.holdingType]);
    await refreshData();
  };

  const updateHoldingType = async (id: string, data: Partial<HoldingType>) => {
    const res = await api.updateHoldingType(id, data);
    setHoldingTypes((prev) => prev.map((h) => (h.id === id ? res.holdingType : h)));
    await refreshData();
  };

  const deleteHoldingType = async (id: string) => {
    await api.deleteHoldingType(id);
    setHoldingTypes((prev) => prev.filter((h) => h.id !== id));
    await refreshData();
  };

  // ---------------- BUDGETING OPERATIONS ----------------
  const saveBudget = async (category: string, monthlyLimit: number, month?: string, id?: string) => {
    const budgetId = id || 'bgt_' + Date.now();
    const now = new Date().toISOString();
    const budgetItem: CategoryBudget = {
      id: budgetId,
      userId: user?.id || 'usr_local',
      category: category.trim(),
      monthlyLimit: Number(monthlyLimit) || 0,
      month: month || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const idx = budgets.findIndex((b) => b.id === budgetId);
    const next = idx >= 0 ? [...budgets] : [...budgets, budgetItem];
    if (idx >= 0) next[idx] = budgetItem;
    setBudgets(next);

    offlineSyncManager.saveSnapshot(
      {
        accounts,
        transactions,
        investments,
        budgets: next,
        stats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.saveBudget({ id, category, monthlyLimit, month }).catch(() => {});
    }
  };

  const deleteBudget = async (id: string) => {
    const next = budgets.filter((b) => b.id !== id);
    setBudgets(next);

    offlineSyncManager.saveSnapshot(
      {
        accounts,
        transactions,
        investments,
        budgets: next,
        stats,
        usdIdrRate,
      },
      user?.email
    );

    if (!isFirebase) {
      api.deleteBudget(id).catch(() => {});
    }
  };

  const getBudgetProgressForMonth = useCallback(
    (targetMonthStr?: string) => {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = targetMonthStr || defaultMonth;

      // Group actual expenses for this month by category
      const monthlyExpenses = transactions.filter(
        (tx) => tx.type === 'expense' && tx.date && tx.date.startsWith(month)
      );

      const spentByCat: Record<string, { total: number; count: number }> = {};
      monthlyExpenses.forEach((tx) => {
        const cat = tx.category || 'Other Expense';
        if (!spentByCat[cat]) spentByCat[cat] = { total: 0, count: 0 };
        spentByCat[cat].total += tx.amount;
        spentByCat[cat].count += 1;
      });

      // Filter budgets that apply to this month
      const activeBudgets: CategoryBudget[] = [];
      const categorySeen = new Set<string>();

      // Month-specific budgets first
      budgets
        .filter((b) => b.month === month)
        .forEach((b) => {
          activeBudgets.push(b);
          categorySeen.add(b.category.toLowerCase());
        });

      // Generic recurring budgets if not overridden for this month
      budgets
        .filter((b) => !b.month)
        .forEach((b) => {
          if (!categorySeen.has(b.category.toLowerCase())) {
            activeBudgets.push(b);
            categorySeen.add(b.category.toLowerCase());
          }
        });

      let totalBudgeted = 0;
      let totalSpent = 0;
      let overBudgetCount = 0;

      const items: BudgetProgress[] = activeBudgets.map((b) => {
        const catData = spentByCat[b.category] || { total: 0, count: 0 };
        const spent = catData.total;
        const limit = b.monthlyLimit;
        const remaining = limit - spent;
        const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;
        const status: 'safe' | 'warning' | 'danger' =
          spent > limit ? 'danger' : percentUsed >= 75 ? 'warning' : 'safe';

        if (status === 'danger') {
          overBudgetCount++;
        }

        totalBudgeted += limit;
        totalSpent += spent;

        return {
          category: b.category,
          budgetId: b.id,
          monthlyLimit: limit,
          actualSpent: spent,
          remaining,
          percentUsed,
          status,
          transactionCount: catData.count,
        };
      });

      // Any categories with expenses that do not have a budget limit configured
      const unbudgetedItems: Array<{ category: string; actualSpent: number; transactionCount: number }> = [];
      Object.entries(spentByCat).forEach(([cat, data]) => {
        if (!categorySeen.has(cat.toLowerCase())) {
          unbudgetedItems.push({
            category: cat,
            actualSpent: data.total,
            transactionCount: data.count,
          });
          totalSpent += data.total;
        }
      });

      // Sort items: danger first, then warning, then highest percentage
      items.sort((a, b) => {
        const order = { danger: 0, warning: 1, safe: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return b.percentUsed - a.percentUsed;
      });

      const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
      const overallPercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
      const isOverBudget = totalSpent > totalBudgeted;

      return {
        items,
        unbudgetedItems,
        totalBudgeted,
        totalSpent,
        totalRemaining,
        overallPercent,
        isOverBudget,
        overBudgetCount,
      };
    },
    [budgets, transactions]
  );

  // Fetch latest rate from Google Finance / market feeds
  const fetchLatestRate = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsRateFetching(true);
    }
    try {
      const res = await exchangeRateService.fetchUsdIdrRate();
      const newRate = res.rate;
      const src = res.source;
      const ts = res.timestamp;

      setUsdIdrRate(newRate);
      setRateSource(src);
      setRateLastUpdated(ts);

      // Recompute stats with new rate
      setStats((prevStats) => {
        if (!prevStats && accounts.length === 0 && investments.length === 0) return prevStats;
        return computeStats(accounts, transactions, investments, newRate);
      });

      if (user?.email) {
        offlineSyncManager.saveSnapshot(
          {
            usdIdrRate: newRate,
            rateSource: src,
            rateLastUpdated: ts,
            settings: { ...(settings || { userId: user.id, usdIdrRate: newRate, privacyModeDefault: false, theme }), usdIdrRate: newRate, rateSource: src, rateLastUpdated: ts },
          },
          user.email
        );
      }
      if (!isFirebase) {
        await api.updateSettings({
          usdIdrRate: newRate,
          rateSource: src,
          rateLastUpdated: ts,
          autoUpdateRate: isRateAutoUpdate,
        }).catch(() => {});
      }

      return { success: true, rate: newRate };
    } catch (err: any) {
      console.warn('Failed to fetch latest exchange rate:', err);
      return { success: false, error: err?.message || 'Failed to fetch rate' };
    } finally {
      setIsRateFetching(false);
    }
  }, [accounts, transactions, investments, isFirebase, user, settings, isRateAutoUpdate, theme]);

  // Auto update every 12 hours from Google Finance / market feeds
  useEffect(() => {
    if (!isRateAutoUpdate) return;
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours

    // Check on mount if never fetched or older than 12 hours
    const checkOnMount = () => {
      const last = rateLastUpdated ? new Date(rateLastUpdated).getTime() : 0;
      const now = Date.now();
      if (now - last >= TWELVE_HOURS_MS) {
        fetchLatestRate({ silent: true });
      }
    };
    checkOnMount();

    // Set recurring 12-hour timer (43,200,000 ms)
    const intervalId = setInterval(() => {
      fetchLatestRate({ silent: true });
    }, TWELVE_HOURS_MS);

    // Refresh when tab gains focus if stale (> 12 hours)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const last = rateLastUpdated ? new Date(rateLastUpdated).getTime() : 0;
        if (Date.now() - last >= TWELVE_HOURS_MS) {
          fetchLatestRate({ silent: true });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isRateAutoUpdate, rateLastUpdated, fetchLatestRate]);

  const setIsRateAutoUpdate = async (enabled: boolean) => {
    setIsRateAutoUpdateState(enabled);
    exchangeRateService.setAutoUpdateEnabled(enabled);

    if (user?.email) {
      offlineSyncManager.saveSnapshot(
        {
          settings: { ...(settings || { userId: user.id, usdIdrRate, privacyModeDefault: false, theme }), autoUpdateRate: enabled },
        },
        user.email
      );
    }
    if (!isFirebase) {
      await api.updateSettings({ autoUpdateRate: enabled }).catch(() => {});
    }

    if (enabled) {
      fetchLatestRate();
    }
  };

  const updateRate = async (newRate: number, source: string = 'Manual Custom') => {
    const ts = new Date().toISOString();
    setUsdIdrRate(newRate);
    setRateSource(source);
    setRateLastUpdated(ts);
    exchangeRateService.saveLastRateInfo({ source, timestamp: ts });

    setStats((prevStats) => {
      if (!prevStats && accounts.length === 0 && investments.length === 0) return prevStats;
      return computeStats(accounts, transactions, investments, newRate);
    });

    if (user?.email) {
      offlineSyncManager.saveSnapshot(
        {
          usdIdrRate: newRate,
          rateSource: source,
          rateLastUpdated: ts,
          settings: { ...(settings || { userId: user.id, usdIdrRate: newRate, privacyModeDefault: false, theme }), usdIdrRate: newRate, rateSource: source, rateLastUpdated: ts },
        },
        user.email
      );
    }

    if (!isFirebase) {
      await api.updateSettings({
        usdIdrRate: newRate,
        rateSource: source,
        rateLastUpdated: ts,
      }).catch(() => {});
    }
  };

  // ---------------- AUTOMATIC OFFLINE TO GOOGLE SHEETS SYNCHRONIZATION ----------------
  const triggerManualSync = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      const sheetCfg = getStoredSheetConfig(user.email, settings);
      if (sheetCfg.webhookUrl && sheetCfg.webhookUrl.startsWith('https://')) {
        await pullFromGoogleSheet({ silent: false });
      } else {
        await refreshData();
      }
      fetchLatestRate({ silent: true }).catch(() => {});
    } catch (err) {
      console.warn('Manual sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, settings, pullFromGoogleSheet, refreshData, fetchLatestRate]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncFirestoreOnline();
      if (user?.email) {
        const sheetCfg = getStoredSheetConfig(user.email, settings);
        if (sheetCfg.webhookUrl && sheetCfg.webhookUrl.startsWith('https://')) {
          pullFromGoogleSheet({ silent: true }).catch(() => {});
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, settings, pullFromGoogleSheet]);

  // Save Google Sheets configuration to localStorage and snapshot
  const saveGoogleSheetSettings = useCallback(
    async (cfg: {
      spreadsheetId?: string;
      webhookUrl?: string;
      autoSync?: boolean;
      lastSynced?: string;
    }) => {
      if (!user) return;
      const saved = saveStoredSheetConfig(user.email, cfg);
      const nextSettings: UserSettings = {
        userId: user.id,
        usdIdrRate,
        privacyModeDefault: isPrivacyMode,
        theme,
        ...(settings || {}),
        googleSpreadsheetId: saved.spreadsheetId || undefined,
        googleSheetWebhookUrl: saved.webhookUrl || undefined,
        googleSheetAutoSync: saved.autoSync,
        googleSheetLastSynced: saved.lastSynced || undefined,
      };
      setSettings(nextSettings);
      offlineSyncManager.saveSnapshot({ settings: nextSettings }, user.email);
    },
    [user, usdIdrRate, isPrivacyMode, theme, settings]
  );

  // Automatic Real-Time Google Sheets Background Sync on any data change (Accounts, Transactions, Investments, Budgets)
  useEffect(() => {
    if (!user || isLoading || !isOnline) return;

    const sheetCfg = getStoredSheetConfig(user.email, settings);
    if (!sheetCfg.autoSync) return;

    const hasWebhook = Boolean(sheetCfg.webhookUrl && sheetCfg.webhookUrl.startsWith('https://'));
    if (!hasWebhook) return;

    const signature = JSON.stringify({
      u: user.email,
      a: accounts.map((x) => [x.id, x.name, x.balance, x.updatedAt]),
      t: transactions.map((x) => [x.id, x.amount, x.date, x.category, x.notes]),
      i: investments.map((x) => [x.id, x.amountInvested, x.currentValue, x.units, x.updatedAt]),
      b: budgets.map((x) => [x.id, x.category, x.monthlyLimit, x.month]),
    });

    if (signature === lastSheetPayloadHashRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await syncFinancialDataViaWebhook(sheetCfg.webhookUrl, {
          userEmail: user.email,
          usdIdrRate,
          stats,
          accounts,
          transactions,
          investments,
          budgets,
        });
        const nowStr = new Date().toLocaleString();
        saveStoredSheetConfig(user.email, {
          spreadsheetId: res.spreadsheetId || sheetCfg.spreadsheetId,
          lastSynced: nowStr,
        });
        lastSheetPayloadHashRef.current = signature;
      } catch (err) {
        console.warn('Background Google Sheets auto-sync warning:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, accounts, transactions, investments, budgets, usdIdrRate, stats, settings, isLoading, isOnline]);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        investments,
        stats,
        settings,
        usdIdrRate,
        rateSource,
        rateLastUpdated,
        isRateAutoUpdate,
        setIsRateAutoUpdate,
        isRateFetching,
        fetchLatestRate,
        isLoading,
        isPrivacyMode,
        togglePrivacyMode,
        theme,
        toggleTheme,
        setTheme,
        isOnline,
        isSyncing,
        pendingSyncCount,
        triggerManualSync,
        activeTab,
        setActiveTab,
        tabHistory,
        goBack,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isMobileQuickMenuOpen,
        setIsMobileQuickMenuOpen,
        announcement,
        refreshAnnouncement,
        refreshData,
        addAccount,
        updateAccount,
        deleteAccount,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        transferFunds,
        addInvestment,
        updateInvestment,
        deleteInvestment,
        updateRate,
        payCreditCardBill,

        // Holding Types (Master Data)
        holdingTypes,
        addHoldingType,
        updateHoldingType,
        deleteHoldingType,

        // Modal states
        isHoldingTypesModalOpen,
        setIsHoldingTypesModalOpen,
        isAddExpenseOpen,
        setIsAddExpenseOpen,
        transactionInitialType,
        setTransactionInitialType,
        isTransferOpen,
        setIsTransferOpen,
        transferInitialMode,
        setTransferInitialMode,
        isAddAccountOpen,
        setIsAddAccountOpen,
        isAddInvestmentOpen,
        setIsAddInvestmentOpen,
        editingAccount,
        setEditingAccount,
        editingInvestment,
        setEditingInvestment,
        editingTransaction,
        setEditingTransaction,
        isFirebaseSetupOpen,
        setIsFirebaseSetupOpen,
        isMobileAppModalOpen,
        setIsMobileAppModalOpen,
        isPayBillOpen,
        setIsPayBillOpen,
        payBillCard,
        setPayBillCard,
        isGoogleSheetsModalOpen,
        setIsGoogleSheetsModalOpen,
        pullFromGoogleSheet,
        saveGoogleSheetSettings,

        // Budgeting
        budgets,
        saveBudget,
        deleteBudget,
        isBudgetModalOpen,
        setIsBudgetModalOpen,
        editingBudget,
        setEditingBudget,
        getBudgetProgressForMonth,

        // Popup Notification
        notification,
        showNotification,
        closeNotification,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
