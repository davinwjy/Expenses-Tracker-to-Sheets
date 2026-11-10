import {
  User,
  Account,
  Transaction,
  Investment,
  UserSettings,
  DashboardStats,
  AdminOverviewStats,
  AdminUserListItem,
  SystemSettings,
  SystemAnnouncement,
  HoldingType,
  InvestmentCategory,
  CategoryBudget,
} from '../types';

export const DEFAULT_BUDGETS: Array<{ category: string; monthlyLimit: number }> = [
  { category: 'Food & Dining', monthlyLimit: 3000000 },
  { category: 'Groceries', monthlyLimit: 2500000 },
  { category: 'Transportation', monthlyLimit: 1500000 },
  { category: 'Bills & Utilities', monthlyLimit: 1200000 },
  { category: 'Shopping', monthlyLimit: 1000000 },
  { category: 'Entertainment', monthlyLimit: 800000 },
];

export const DEFAULT_HOLDING_TYPES: HoldingType[] = [
  { id: 'Saham', label: 'Indonesian Stocks', defaultCurrency: 'IDR', example: 'e.g. BBCA, BBRI, ASII', badgeColor: 'blue', isSystem: true },
  { id: 'RDPU', label: 'Money Market (RDPU)', defaultCurrency: 'IDR', example: 'e.g. Sucorinvest Stable Fund', badgeColor: 'teal', isSystem: true },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', defaultCurrency: 'IDR', example: 'e.g. BTC, Indodax, Pintu', badgeColor: 'amber', isSystem: true },
  { id: 'ETF USA', label: 'US Stocks & ETFs', defaultCurrency: 'USD', example: 'e.g. VOO, QQQ, SCHD, SPY', badgeColor: 'purple', isSystem: true },
  { id: 'USD', label: 'USD Holdings & Cash', defaultCurrency: 'USD', example: 'e.g. Wise USD balance, Broker cash', badgeColor: 'emerald', isSystem: true },
];

interface LocalStorageSchema {
  users: Array<User & { password?: string }>;
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  settings: UserSettings[];
  holdingTypes?: HoldingType[];
  budgets?: CategoryBudget[];
  currentUserId: string | null;
}

const LOCAL_STORAGE_KEY = 'wealthtrack_offline_db';

function getStore(): LocalStorageSchema {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const data: LocalStorageSchema = JSON.parse(raw);
      // Migrate Bitcoin currency to IDR if previously stored as USD
      let modified = false;
      data.investments?.forEach((inv) => {
        if (inv.category === 'Bitcoin' && inv.currency !== 'IDR') {
          inv.currency = 'IDR';
          if (inv.amountInvested === 1200) {
            inv.amountInvested = 18500000;
            inv.currentValue = 24800000;
          }
          modified = true;
        }
      });
      if (!data.holdingTypes || data.holdingTypes.length === 0) {
        data.holdingTypes = [...DEFAULT_HOLDING_TYPES];
        modified = true;
      }
      if (!data.budgets || data.budgets.length === 0) {
        const targetUserId = data.currentUserId || 'usr_default';
        data.budgets = DEFAULT_BUDGETS.map((b, idx) => ({
          id: `bgt_default_${idx + 1}`,
          userId: targetUserId,
          category: b.category,
          monthlyLimit: b.monthlyLimit,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        modified = true;
      }
      if (modified) {
        saveStore(data);
      }
      return data;
    }
  } catch (err) {
    console.warn('Error reading local database:', err);
  }

  // Initial seed
  const defaultUser: User = {
    id: 'usr_default',
    email: 'davin@wealthtrack.app',
    name: 'Davin Wijaya',
    createdAt: new Date().toISOString(),
  };

  const initialAccounts: Account[] = [
    {
      id: 'acc_local_1',
      userId: defaultUser.id,
      name: 'BCA Main',
      type: 'bank',
      balance: 12500000,
      accountNumber: '•••• 4821',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc_local_2',
      userId: defaultUser.id,
      name: 'Mandiri Payroll',
      type: 'bank',
      balance: 8000000,
      accountNumber: '•••• 9102',
      color: '#0284c7',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc_local_3',
      userId: defaultUser.id,
      name: 'Physical Cash',
      type: 'cash',
      balance: 850000,
      color: '#10b981',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialInvestments: Investment[] = [
    {
      id: 'inv_local_1',
      userId: defaultUser.id,
      name: 'BBCA (Bank Central Asia)',
      category: 'Saham',
      currency: 'IDR',
      amountInvested: 15000000,
      currentValue: 17200000,
      units: 17,
      platform: 'Ajaib',
      notes: 'Blue chip banking stock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv_local_2',
      userId: defaultUser.id,
      name: 'Sucorinvest Stable Fund',
      category: 'RDPU',
      currency: 'IDR',
      amountInvested: 10000000,
      currentValue: 10520000,
      platform: 'Bibit',
      notes: 'Low risk emergency fund asset',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv_local_3',
      userId: defaultUser.id,
      name: 'Bitcoin (BTC)',
      category: 'Bitcoin',
      currency: 'IDR',
      amountInvested: 18500000,
      currentValue: 24800000,
      units: 0.0165,
      platform: 'Indodax',
      notes: 'Digital store of value',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv_local_4',
      userId: defaultUser.id,
      name: 'VOO - Vanguard S&P 500',
      category: 'ETF USA',
      currency: 'USD',
      amountInvested: 1500,
      currentValue: 1740,
      units: 3.2,
      platform: 'GoTrade',
      notes: 'Broad market US index ETF',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inv_local_5',
      userId: defaultUser.id,
      name: 'USD Savings / Cash',
      category: 'USD',
      currency: 'USD',
      amountInvested: 600,
      currentValue: 600,
      units: 600,
      platform: 'Wise',
      notes: 'Foreign currency liquid buffer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const initialTransactions: Transaction[] = [
    {
      id: 'tx_local_1',
      userId: defaultUser.id,
      type: 'expense',
      amount: 85000,
      accountId: initialAccounts[0].id,
      category: 'Food & Dining',
      date: todayStr,
      notes: 'Lunch with team',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_local_2',
      userId: defaultUser.id,
      type: 'expense',
      amount: 45000,
      accountId: initialAccounts[2].id,
      category: 'Transportation',
      date: todayStr,
      notes: 'Taxi ride to station',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_local_3',
      userId: defaultUser.id,
      type: 'transfer',
      amount: 500000,
      accountId: initialAccounts[0].id,
      toAccountId: initialAccounts[2].id,
      category: 'Transfer to Cash',
      date: todayStr,
      notes: 'ATM Cash withdrawal',
      createdAt: new Date().toISOString(),
    },
  ];

  const initialSettings: UserSettings = {
    userId: defaultUser.id,
    usdIdrRate: 15850,
    privacyModeDefault: false,
    theme: 'dark',
  };

  const initialBudgets: CategoryBudget[] = DEFAULT_BUDGETS.map((b, idx) => ({
    id: `bgt_default_${idx + 1}`,
    userId: defaultUser.id,
    category: b.category,
    monthlyLimit: b.monthlyLimit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const initialData: LocalStorageSchema = {
    users: [{ ...defaultUser, password: 'password123' }],
    accounts: initialAccounts,
    transactions: initialTransactions,
    investments: initialInvestments,
    settings: [initialSettings],
    holdingTypes: [...DEFAULT_HOLDING_TYPES],
    budgets: initialBudgets,
    currentUserId: defaultUser.id,
  };

  saveStore(initialData);
  return initialData;
}

function saveStore(store: LocalStorageSchema): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to save local store:', err);
  }
}

export const localDb = {
  // Auth
  register(email: string, password: string, name?: string): { token: string; user: User } {
    const store = getStore();
    const cleanEmail = email.trim().toLowerCase();
    const existing = store.users.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const userId = 'usr_loc_' + Date.now();
    const newUser: User = {
      id: userId,
      email: cleanEmail,
      name: name ? name.trim() : cleanEmail.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    store.users.push({ ...newUser, password });
    store.currentUserId = userId;

    // Create starter accounts
    store.accounts.push(
      {
        id: 'acc_' + Date.now() + '_1',
        userId,
        name: 'BCA Main',
        type: 'bank',
        balance: 10000000,
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc_' + Date.now() + '_2',
        userId,
        name: 'Cash Wallet',
        type: 'cash',
        balance: 500000,
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Create starter settings
    store.settings.push({
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
    });

    saveStore(store);
    return { token: 'loc_token_' + userId, user: newUser };
  },

  login(email: string, password: string): { token: string; user: User } {
    const store = getStore();
    const cleanEmail = email.trim().toLowerCase();
    const found = store.users.find(u => u.email === cleanEmail);

    if (!found) {
      throw new Error('Invalid email or password');
    }

    if (found.password && found.password !== password) {
      throw new Error('Invalid email or password');
    }

    store.currentUserId = found.id;
    saveStore(store);

    const user: User = {
      id: found.id,
      email: found.email,
      name: found.name,
      createdAt: found.createdAt,
    };

    return { token: 'loc_token_' + found.id, user };
  },

  getCurrentUser(): { user: User } {
    const store = getStore();
    if (!store.currentUserId) {
      // Pick first user if exists
      if (store.users.length > 0) {
        store.currentUserId = store.users[0].id;
        saveStore(store);
      } else {
        throw new Error('No user logged in');
      }
    }

    const found = store.users.find(u => u.id === store.currentUserId);
    if (!found) {
      throw new Error('User not found');
    }

    return {
      user: {
        id: found.id,
        email: found.email,
        name: found.name,
        createdAt: found.createdAt,
      },
    };
  },

  getUserId(): string {
    const store = getStore();
    return store.currentUserId || 'usr_default';
  },

  // Accounts
  getAccounts(): { accounts: Account[] } {
    const store = getStore();
    const userId = this.getUserId();
    const userAccounts = store.accounts.filter(a => a.userId === userId);
    return { accounts: userAccounts };
  },

  createAccount(data: {
    name: string;
    type: 'bank' | 'cash' | 'credit_card' | 'paylater';
    balance: number;
    accountNumber?: string;
    color?: string;
    creditLimit?: number;
    billingDate?: number;
    dueDate?: number;
    cardNetwork?: string;
    last4Digits?: string;
  }): { account: Account } {
    const store = getStore();
    const userId = this.getUserId();

    const newAcc: Account = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: data.name.trim(),
      type: data.type,
      balance: Number(data.balance) || 0,
      accountNumber: data.accountNumber?.trim() || undefined,
      color: data.color || '#3b82f6',
      creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : undefined,
      billingDate: data.billingDate !== undefined ? Number(data.billingDate) : undefined,
      dueDate: data.dueDate !== undefined ? Number(data.dueDate) : undefined,
      cardNetwork: data.cardNetwork?.trim() || undefined,
      last4Digits: data.last4Digits?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.accounts.push(newAcc);
    saveStore(store);
    return { account: newAcc };
  },

  updateAccount(id: string, data: Partial<Account>): { account: Account } {
    const store = getStore();
    const userId = this.getUserId();
    const acc = store.accounts.find(a => a.id === id && a.userId === userId);
    if (!acc) throw new Error('Account not found');

    if (data.name !== undefined) acc.name = data.name.trim();
    if (data.type !== undefined) acc.type = data.type;
    if (data.balance !== undefined) acc.balance = Number(data.balance);
    if (data.accountNumber !== undefined) acc.accountNumber = data.accountNumber.trim();
    if (data.color !== undefined) acc.color = data.color;
    if (data.creditLimit !== undefined) acc.creditLimit = Number(data.creditLimit);
    if (data.billingDate !== undefined) acc.billingDate = Number(data.billingDate);
    if (data.dueDate !== undefined) acc.dueDate = Number(data.dueDate);
    if (data.cardNetwork !== undefined) acc.cardNetwork = data.cardNetwork.trim();
    if (data.last4Digits !== undefined) acc.last4Digits = data.last4Digits.trim();
    acc.updatedAt = new Date().toISOString();

    saveStore(store);
    return { account: acc };
  },

  deleteAccount(id: string): { success: boolean } {
    const store = getStore();
    const userId = this.getUserId();
    const idx = store.accounts.findIndex(a => a.id === id && a.userId === userId);
    if (idx === -1) throw new Error('Account not found');

    store.accounts.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // Transactions
  getTransactions(params?: { type?: string; accountId?: string; limit?: number }): { transactions: Transaction[] } {
    const store = getStore();
    const userId = this.getUserId();
    let txs = store.transactions.filter(t => t.userId === userId);

    if (params?.type && params.type !== 'all') {
      txs = txs.filter(t => t.type === params.type);
    }
    if (params?.accountId && params.accountId !== 'all') {
      txs = txs.filter(t => t.accountId === params.accountId || t.toAccountId === params.accountId);
    }

    txs.sort((a, b) => new Date(b.date + ' ' + b.createdAt).getTime() - new Date(a.date + ' ' + a.createdAt).getTime());

    if (params?.limit) {
      txs = txs.slice(0, params.limit);
    }

    return { transactions: txs };
  },

  createTransaction(data: {
    type: 'expense' | 'income';
    amount: number;
    accountId: string;
    category: string;
    date: string;
    notes?: string;
  }): { transaction: Transaction; updatedAccount: Account } {
    const store = getStore();
    const userId = this.getUserId();
    const acc = store.accounts.find(a => a.id === data.accountId && a.userId === userId);
    if (!acc) throw new Error('Account not found');

    const amount = Math.abs(Number(data.amount));

    if (data.type === 'expense') {
      if (acc.type === 'credit_card' || acc.type === 'paylater') {
        if (acc.creditLimit !== undefined && acc.balance + amount > acc.creditLimit) {
          const avail = Math.max(0, acc.creditLimit - acc.balance);
          throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      } else {
        if (amount > acc.balance) {
          throw new Error(`Insufficient balance (${acc.balance.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    if (acc.type === 'credit_card' || acc.type === 'paylater') {
      if (data.type === 'expense') {
        acc.balance += amount; // spending increases debt
      } else {
        acc.balance -= amount; // credit/income decreases debt
      }
    } else {
      if (data.type === 'expense') {
        acc.balance -= amount;
      } else {
        acc.balance += amount;
      }
    }
    acc.updatedAt = new Date().toISOString();

    const newTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      type: data.type,
      amount,
      accountId: data.accountId,
      category: data.category.trim(),
      date: data.date,
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    store.transactions.push(newTx);
    saveStore(store);
    return { transaction: newTx, updatedAccount: acc };
  },

  updateTransaction(id: string, data: Partial<Transaction>): { transaction: Transaction } {
    const store = getStore();
    const userId = this.getUserId();
    const tx = store.transactions.find(t => t.id === id && t.userId === userId);
    if (!tx) throw new Error('Transaction not found');

    const newAmount = data.amount !== undefined ? Math.abs(Number(data.amount)) : tx.amount;
    const newType = data.type || tx.type;
    const targetAccId = data.accountId || tx.accountId;
    const oldAcc = store.accounts.find(a => a.id === tx.accountId && a.userId === userId);
    const targetAcc = store.accounts.find(a => a.id === targetAccId && a.userId === userId);
    if (!targetAcc) throw new Error('Target account not found');

    // Validate available balance/credit for updated expense
    if (newType === 'expense') {
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        if (targetAcc.creditLimit !== undefined) {
          let revertedDebt = targetAcc.balance;
          if (oldAcc && oldAcc.id === targetAcc.id && tx.type === 'expense') {
            revertedDebt = Math.max(0, revertedDebt - tx.amount);
          }
          if (revertedDebt + newAmount > targetAcc.creditLimit) {
            const avail = Math.max(0, targetAcc.creditLimit - revertedDebt);
            throw new Error(`Insufficient credit limit (${avail.toLocaleString('en-US')}). Spending cannot be submitted.`);
          }
        }
      } else {
        let revertedBal = targetAcc.balance;
        if (oldAcc && oldAcc.id === targetAcc.id && tx.type === 'expense') {
          revertedBal += tx.amount;
        }
        if (newAmount > revertedBal) {
          throw new Error(`Insufficient balance (${revertedBal.toLocaleString('en-US')}). Spending cannot be submitted.`);
        }
      }
    }

    // Revert old effect
    if (oldAcc) {
      if (oldAcc.type === 'credit_card' || oldAcc.type === 'paylater') {
        if (tx.type === 'expense') oldAcc.balance -= tx.amount;
        else if (tx.type === 'income') oldAcc.balance += tx.amount;
      } else {
        if (tx.type === 'expense') oldAcc.balance += tx.amount;
        else if (tx.type === 'income') oldAcc.balance -= tx.amount;
      }
      oldAcc.updatedAt = new Date().toISOString();
    }

    // Apply new effect
    if (targetAcc) {
      if (targetAcc.type === 'credit_card' || targetAcc.type === 'paylater') {
        if (newType === 'expense') targetAcc.balance += newAmount;
        else if (newType === 'income') targetAcc.balance -= newAmount;
      } else {
        if (newType === 'expense') targetAcc.balance -= newAmount;
        else if (newType === 'income') targetAcc.balance += newAmount;
      }
      targetAcc.updatedAt = new Date().toISOString();
    }

    tx.amount = newAmount;
    tx.type = newType;
    tx.accountId = targetAccId;
    if (data.category !== undefined) tx.category = data.category;
    if (data.date !== undefined) tx.date = data.date;
    if (data.notes !== undefined) tx.notes = data.notes;

    saveStore(store);
    return { transaction: tx };
  },

  deleteTransaction(id: string): { success: boolean } {
    const store = getStore();
    const userId = this.getUserId();
    const idx = store.transactions.findIndex(t => t.id === id && t.userId === userId);
    if (idx === -1) throw new Error('Transaction not found');

    const tx = store.transactions[idx];
    const acc = store.accounts.find(a => a.id === tx.accountId && a.userId === userId);
    if (acc) {
      if (acc.type === 'credit_card' || acc.type === 'paylater') {
        if (tx.type === 'expense') acc.balance -= tx.amount;
        else if (tx.type === 'income') acc.balance += tx.amount;
      } else {
        if (tx.type === 'expense') acc.balance += tx.amount;
        else if (tx.type === 'income') acc.balance -= tx.amount;
      }
      acc.updatedAt = new Date().toISOString();
    }

    if (tx.type === 'transfer' && tx.toAccountId) {
      const dest = store.accounts.find(a => a.id === tx.toAccountId && a.userId === userId);
      if (dest) dest.balance -= tx.amount;
    }

    store.transactions.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // Transfers
  executeTransfer(data: {
    type: 'account_to_account' | 'bank_to_investment';
    fromAccountId: string;
    toAccountId?: string;
    toInvestmentId?: string;
    amountIdr: number;
    amountUsd?: number;
    exchangeRate?: number;
    date?: string;
    notes?: string;
  }): { success: boolean; transaction: Transaction } {
    const store = getStore();
    const userId = this.getUserId();
    const fromAcc = store.accounts.find(a => a.id === data.fromAccountId && a.userId === userId);
    if (!fromAcc) throw new Error('Source account not found');

    const amount = Math.abs(Number(data.amountIdr));
    const txDate = data.date || new Date().toISOString().split('T')[0];

    if (data.type === 'bank_to_investment') {
      const inv = store.investments.find(i => i.id === data.toInvestmentId && i.userId === userId);
      if (!inv) throw new Error('Target investment not found');

      fromAcc.balance -= amount;
      let rate = data.exchangeRate || inv.customExchangeRate || 15850;
      let amountUsd = undefined;

      if (inv.currency === 'USD') {
        const parsedUsd = Number(data.amountUsd);
        if (!isNaN(parsedUsd) && parsedUsd > 0) {
          amountUsd = Number(parsedUsd.toFixed(2));
          if (amount > 0) {
            rate = data.exchangeRate || Number((amount / amountUsd).toFixed(2));
          }
        } else {
          amountUsd = Number((amount / rate).toFixed(2));
        }
        inv.amountInvested += amountUsd;
        inv.currentValue += amountUsd;
        inv.customExchangeRate = rate;
      } else {
        inv.amountInvested += amount;
        inv.currentValue += amount;
      }
      inv.updatedAt = new Date().toISOString();

      const tx: Transaction = {
        id: 'tx_inv_' + Date.now(),
        userId,
        type: 'bank_to_investment',
        amount,
        accountId: data.fromAccountId,
        toInvestmentId: data.toInvestmentId,
        amountUsd,
        exchangeRate: inv.currency === 'USD' ? rate : undefined,
        category: `Investment: ${inv.category}`,
        date: txDate,
        notes: data.notes || `Funded ${inv.name} from ${fromAcc.name}`,
        createdAt: new Date().toISOString(),
      };

      store.transactions.push(tx);
      saveStore(store);
      return { success: true, transaction: tx };
    }

    // Account to Account
    const toAcc = store.accounts.find(a => a.id === data.toAccountId && a.userId === userId);
    if (!toAcc) throw new Error('Destination account not found');

    fromAcc.balance -= amount;
    toAcc.balance += amount;

    const tx: Transaction = {
      id: 'tx_trf_' + Date.now(),
      userId,
      type: 'transfer',
      amount,
      accountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      category: `Transfer to ${toAcc.name}`,
      date: txDate,
      notes: data.notes || `Transfer from ${fromAcc.name} to ${toAcc.name}`,
      createdAt: new Date().toISOString(),
    };

    store.transactions.push(tx);
    saveStore(store);
    return { success: true, transaction: tx };
  },

  payCreditCardBill(data: {
    creditCardAccountId: string;
    sourceAccountId: string;
    amountIdr: number;
    adminFee?: number;
    date?: string;
    notes?: string;
  }): { success: boolean; transaction: Transaction } {
    const store = getStore();
    const userId = this.getUserId();
    const sourceAcc = store.accounts.find(a => a.id === data.sourceAccountId && a.userId === userId);
    const ccAcc = store.accounts.find(a => a.id === data.creditCardAccountId && a.userId === userId);

    if (!sourceAcc) throw new Error('Source bank/cash account not found');
    if (!ccAcc) throw new Error('Credit card account not found');

    const amount = Math.abs(Number(data.amountIdr));
    const adminFee = Math.abs(Number(data.adminFee || 0));
    const totalDeduction = amount + adminFee;
    const txDate = data.date || new Date().toISOString().split('T')[0];

    sourceAcc.balance -= totalDeduction;
    ccAcc.balance = Math.max(0, ccAcc.balance - amount);
    sourceAcc.updatedAt = new Date().toISOString();
    ccAcc.updatedAt = new Date().toISOString();

    const tx: Transaction = {
      id: 'tx_cc_' + Date.now(),
      userId,
      type: 'transfer',
      amount,
      accountId: data.sourceAccountId,
      toAccountId: data.creditCardAccountId,
      category: `Credit Card Payment (${ccAcc.name})`,
      date: txDate,
      notes: data.notes || `Paid credit card bill for ${ccAcc.name} from ${sourceAcc.name}${adminFee > 0 ? ` (Admin Fee: Rp ${adminFee.toLocaleString()})` : ''}`,
      createdAt: new Date().toISOString(),
    };

    store.transactions.push(tx);

    if (adminFee > 0) {
      const feeTx: Transaction = {
        id: 'tx_fee_' + Date.now(),
        userId,
        type: 'expense',
        amount: adminFee,
        accountId: data.sourceAccountId,
        category: 'Admin / Settlement Fee',
        date: txDate,
        notes: `Admin settlement fee for ${ccAcc.name} bill payment`,
        createdAt: new Date().toISOString(),
      };
      store.transactions.push(feeTx);
    }

    saveStore(store);
    return { success: true, transaction: tx };
  },

  // Investments
  getInvestments(): { investments: Investment[] } {
    const store = getStore();
    const userId = this.getUserId();
    const invs = store.investments.filter(i => i.userId === userId);
    return { investments: invs };
  },

  createInvestment(data: {
    name: string;
    category: InvestmentCategory;
    currency?: 'IDR' | 'USD';
    amountInvested: number;
    currentValue?: number;
    customExchangeRate?: number;
    units?: number;
    platform?: string;
    notes?: string;
  }): { investment: Investment } {
    const store = getStore();
    const userId = this.getUserId();
    const currency = data.currency || ((data.category === 'Saham' || data.category === 'RDPU' || data.category === 'Bitcoin') ? 'IDR' : 'USD');
    const invested = Number(data.amountInvested) || 0;
    const current = data.currentValue !== undefined ? Number(data.currentValue) : invested;

    const newInv: Investment = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: data.name.trim(),
      category: data.category,
      currency,
      amountInvested: invested,
      currentValue: current,
      customExchangeRate: data.customExchangeRate ? Number(data.customExchangeRate) : undefined,
      units: data.units !== undefined && data.units !== ('' as any) ? Number(data.units) : undefined,
      platform: data.platform?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.investments.push(newInv);
    saveStore(store);
    return { investment: newInv };
  },

  updateInvestment(id: string, data: Partial<Investment>): { investment: Investment } {
    const store = getStore();
    const userId = this.getUserId();
    const inv = store.investments.find(i => i.id === id && i.userId === userId);
    if (!inv) throw new Error('Investment not found');

    if (data.name !== undefined) inv.name = data.name.trim();
    if (data.category !== undefined) inv.category = data.category;
    if (data.currency !== undefined) {
      inv.currency = data.currency;
    } else if (data.category !== undefined && !inv.currency) {
      inv.currency = (data.category === 'Saham' || data.category === 'RDPU' || data.category === 'Bitcoin') ? 'IDR' : 'USD';
    }
    if (data.amountInvested !== undefined) inv.amountInvested = Number(data.amountInvested);
    if (data.currentValue !== undefined) inv.currentValue = Number(data.currentValue);
    if (data.customExchangeRate !== undefined) inv.customExchangeRate = data.customExchangeRate ? Number(data.customExchangeRate) : undefined;
    if (data.units !== undefined) inv.units = data.units !== ('' as any) ? Number(data.units) : undefined;
    if (data.platform !== undefined) inv.platform = data.platform.trim();
    if (data.notes !== undefined) inv.notes = data.notes.trim();
    inv.updatedAt = new Date().toISOString();

    saveStore(store);
    return { investment: inv };
  },

  deleteInvestment(id: string): { success: boolean } {
    const store = getStore();
    const userId = this.getUserId();
    const idx = store.investments.findIndex(i => i.id === id && i.userId === userId);
    if (idx === -1) throw new Error('Investment not found');

    store.investments.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // Holding Types (Master Data)
  getHoldingTypes(): { holdingTypes: HoldingType[] } {
    const store = getStore();
    if (!store.holdingTypes || store.holdingTypes.length === 0) {
      store.holdingTypes = [...DEFAULT_HOLDING_TYPES];
      saveStore(store);
    }
    return { holdingTypes: store.holdingTypes };
  },

  addHoldingType(data: {
    id?: string;
    label: string;
    defaultCurrency: 'IDR' | 'USD';
    example?: string;
    badgeColor?: string;
  }): { holdingType: HoldingType } {
    const store = getStore();
    if (!store.holdingTypes) store.holdingTypes = [...DEFAULT_HOLDING_TYPES];

    const cleanLabel = data.label.trim();
    if (!cleanLabel) throw new Error('Holding type name is required');

    // Create a clean slug ID
    const rawId = data.id?.trim() || cleanLabel;
    const cleanId = rawId.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');

    // Check duplication
    const existing = store.holdingTypes.find(
      h => h.id.toLowerCase() === cleanId.toLowerCase() || h.label.toLowerCase() === cleanLabel.toLowerCase()
    );
    if (existing) {
      throw new Error(`A holding type with name "${cleanLabel}" already exists`);
    }

    const newType: HoldingType = {
      id: cleanId,
      label: cleanLabel,
      defaultCurrency: data.defaultCurrency || 'IDR',
      example: data.example?.trim() || undefined,
      badgeColor: data.badgeColor || (data.defaultCurrency === 'USD' ? 'purple' : 'blue'),
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    store.holdingTypes.push(newType);
    saveStore(store);
    return { holdingType: newType };
  },

  updateHoldingType(id: string, data: Partial<HoldingType>): { holdingType: HoldingType } {
    const store = getStore();
    if (!store.holdingTypes) store.holdingTypes = [...DEFAULT_HOLDING_TYPES];

    const item = store.holdingTypes.find(h => h.id === id);
    if (!item) throw new Error('Holding type not found');

    if (data.label !== undefined) item.label = data.label.trim();
    if (data.defaultCurrency !== undefined) item.defaultCurrency = data.defaultCurrency;
    if (data.example !== undefined) item.example = data.example.trim();
    if (data.badgeColor !== undefined) item.badgeColor = data.badgeColor;

    saveStore(store);
    return { holdingType: item };
  },

  deleteHoldingType(id: string): { success: boolean } {
    const store = getStore();
    if (!store.holdingTypes) store.holdingTypes = [...DEFAULT_HOLDING_TYPES];

    const idx = store.holdingTypes.findIndex(h => h.id === id);
    if (idx === -1) throw new Error('Holding type not found');

    if (store.holdingTypes[idx].isSystem) {
      throw new Error('Default system holding types cannot be deleted');
    }

    // Check if any existing investment uses this category
    const inUse = store.investments.some(inv => inv.category === id);
    if (inUse) {
      throw new Error('Cannot delete a holding type that currently has active positions');
    }

    store.holdingTypes.splice(idx, 1);
    saveStore(store);
    return { success: true };
  },

  // Budgets
  getBudgets(userIdOverride?: string): { budgets: CategoryBudget[] } {
    const store = getStore();
    const userId = userIdOverride || this.getUserId();
    const list = (store.budgets || []).filter(b => b.userId === userId);
    return { budgets: list };
  },

  saveBudget(data: {
    id?: string;
    category: string;
    monthlyLimit: number;
    month?: string;
  }): { budget: CategoryBudget } {
    const store = getStore();
    const userId = this.getUserId();
    if (!store.budgets) store.budgets = [];

    const category = data.category.trim();
    if (!category) throw new Error('Category is required');
    const monthlyLimit = Math.max(0, Number(data.monthlyLimit) || 0);

    let existingIndex = -1;
    if (data.id) {
      existingIndex = store.budgets.findIndex(b => b.id === data.id && b.userId === userId);
    } else {
      existingIndex = store.budgets.findIndex(
        b => b.userId === userId && b.category.toLowerCase() === category.toLowerCase() && (b.month || '') === (data.month || '')
      );
    }

    if (existingIndex >= 0) {
      const b = store.budgets[existingIndex];
      b.category = category;
      b.monthlyLimit = monthlyLimit;
      b.month = data.month?.trim() || undefined;
      b.updatedAt = new Date().toISOString();
      saveStore(store);
      return { budget: b };
    } else {
      const newBudget: CategoryBudget = {
        id: data.id || 'bgt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        category,
        monthlyLimit,
        month: data.month?.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.budgets.push(newBudget);
      saveStore(store);
      return { budget: newBudget };
    }
  },

  deleteBudget(id: string): { success: boolean } {
    const store = getStore();
    const userId = this.getUserId();
    if (!store.budgets) return { success: true };
    const idx = store.budgets.findIndex(b => b.id === id && b.userId === userId);
    if (idx !== -1) {
      store.budgets.splice(idx, 1);
      saveStore(store);
    }
    return { success: true };
  },

  // Settings
  getSettings(): { settings: UserSettings } {
    const store = getStore();
    const userId = this.getUserId();
    let s = store.settings.find(setting => setting.userId === userId);
    if (!s) {
      s = {
        userId,
        usdIdrRate: 15850,
        privacyModeDefault: false,
        theme: 'dark',
      };
      store.settings.push(s);
      saveStore(store);
    }
    return { settings: s };
  },

  updateSettings(data: Partial<UserSettings>): { settings: UserSettings } {
    const store = getStore();
    const userId = this.getUserId();
    let s = store.settings.find(setting => setting.userId === userId);
    if (!s) {
      s = {
        userId,
        usdIdrRate: 15850,
        privacyModeDefault: false,
        theme: 'dark',
      };
      store.settings.push(s);
    }

    if (data.usdIdrRate !== undefined) s.usdIdrRate = Number(data.usdIdrRate);
    if (data.autoUpdateRate !== undefined) s.autoUpdateRate = Boolean(data.autoUpdateRate);
    if (data.rateLastUpdated !== undefined) s.rateLastUpdated = String(data.rateLastUpdated);
    if (data.rateSource !== undefined) s.rateSource = String(data.rateSource);
    if (data.privacyModeDefault !== undefined) s.privacyModeDefault = data.privacyModeDefault;
    if (data.theme !== undefined) s.theme = data.theme;

    saveStore(store);
    return { settings: s };
  },

  // Stats
  getDashboardStats(): DashboardStats {
    const store = getStore();
    const userId = this.getUserId();
    const userSetting = store.settings.find(s => s.userId === userId);
    const rate = userSetting ? userSetting.usdIdrRate : 15850;

    const userAccounts = store.accounts.filter(a => a.userId === userId);
    const userInvestments = store.investments.filter(i => i.userId === userId);
    const userTransactions = store.transactions.filter(t => t.userId === userId);

    const totalLiquidCashIdr = userAccounts.reduce(
      (sum, acc) => ((acc.type === 'credit_card' || acc.type === 'paylater') ? sum - (Number(acc.balance) || 0) : sum + (Number(acc.balance) || 0)),
      0
    );

    let totalInvestedCostIdr = 0;
    let totalInvestmentValueIdr = 0;
    let totalInvestmentValueUsd = 0;

    const categoryAllocations: Record<string, { idrValue: number; usdValue: number; count: number }> = {
      'Saham': { idrValue: 0, usdValue: 0, count: 0 },
      'RDPU': { idrValue: 0, usdValue: 0, count: 0 },
      'Bitcoin': { idrValue: 0, usdValue: 0, count: 0 },
      'ETF USA': { idrValue: 0, usdValue: 0, count: 0 },
      'USD': { idrValue: 0, usdValue: 0, count: 0 },
    };

    userInvestments.forEach(inv => {
      let valIdr = 0;
      let valUsd = 0;
      let costIdr = 0;

      if (inv.currency === 'USD') {
        valUsd = inv.currentValue || 0;
        valIdr = valUsd * rate;
        costIdr = (inv.amountInvested || 0) * rate;
        totalInvestmentValueUsd += valUsd;
      } else {
        valIdr = inv.currentValue || 0;
        valUsd = valIdr / rate;
        costIdr = inv.amountInvested || 0;
      }

      totalInvestedCostIdr += costIdr;
      totalInvestmentValueIdr += valIdr;

      if (categoryAllocations[inv.category]) {
        categoryAllocations[inv.category].idrValue += valIdr;
        categoryAllocations[inv.category].usdValue += valUsd;
        categoryAllocations[inv.category].count += 1;
      }
    });

    const totalNetWorthIdr = totalLiquidCashIdr + totalInvestmentValueIdr;

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthTxs = userTransactions.filter(t => t.date && t.date.startsWith(currentMonthPrefix));

    const monthlyExpenses = thisMonthTxs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncomes = thisMonthTxs
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyTransfersToInv = thisMonthTxs
      .filter(t => t.type === 'bank_to_investment')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseByCategory: Record<string, number> = {};
    thisMonthTxs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
      });

    const expenseByAccount: Record<string, { name: string; amount: number; type: string }> = {};
    thisMonthTxs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const acc = userAccounts.find(a => a.id === t.accountId);
        const accName = acc ? acc.name : 'Unknown Account';
        const accType = acc ? acc.type : 'bank';
        if (!expenseByAccount[t.accountId]) {
          expenseByAccount[t.accountId] = { name: accName, amount: 0, type: accType };
        }
        expenseByAccount[t.accountId].amount += t.amount;
      });

    return {
      rate,
      totalNetWorthIdr,
      totalLiquidCashIdr,
      totalInvestmentValueIdr,
      totalInvestmentValueUsd,
      totalInvestedCostIdr,
      unrealizedPnlIdr: totalInvestmentValueIdr - totalInvestedCostIdr,
      unrealizedPnlPercentage: totalInvestedCostIdr > 0 ? ((totalInvestmentValueIdr - totalInvestedCostIdr) / totalInvestedCostIdr) * 100 : 0,
      monthlyExpenses,
      monthlyIncomes,
      monthlyTransfersToInv,
      categoryAllocations,
      expenseByCategory,
      expenseByAccount,
    };
  },

  // Public Announcement
  async getPublicAnnouncement(): Promise<{ announcement: SystemAnnouncement; maintenanceMode: boolean }> {
    const rawAnn = localStorage.getItem('wealthtrack_system_announcement');
    let announcement: SystemAnnouncement = {
      id: 'default',
      message: '',
      type: 'info',
      enabled: false,
      updatedAt: new Date().toISOString(),
    };
    if (rawAnn) {
      try {
        announcement = JSON.parse(rawAnn);
      } catch {}
    }
    const maintenanceMode = localStorage.getItem('wealthtrack_maintenance_mode') === 'true';
    return { announcement, maintenanceMode };
  },

  // Admin Overview
  async getAdminOverview(): Promise<AdminOverviewStats> {
    const store = getStore();
    const totalUsers = store.users.length;
    const totalAccounts = store.accounts.length;
    const totalTransactions = store.transactions.length;
    const totalInvestments = store.investments.length;
    const totalVolumeIdr = store.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalCashIdr = store.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalInvestmentsIdr = store.investments.reduce((sum, inv) => {
      const val = inv.currentValue || 0;
      return sum + (inv.currency === 'USD' ? val * 15850 : val);
    }, 0);

    return {
      totalUsers,
      totalAccounts,
      totalTransactions,
      totalInvestments,
      totalVolumeIdr,
      totalTrackedAssetsIdr: totalCashIdr + totalInvestmentsIdr,
      serverStatus: 'online',
      dbType: 'Local Indexed Database (Synced)',
      uptimeSeconds: 3600,
      currentUsdRate: 15850,
      adminCount: 1,
      registeredAdmins: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com'],
    };
  },

  async getAdminUsers(): Promise<{ users: AdminUserListItem[] }> {
    const store = getStore();
    const list: AdminUserListItem[] = store.users.map(u => {
      const userAccounts = store.accounts.filter(a => a.userId === u.id);
      const userTxs = store.transactions.filter(t => t.userId === u.id);
      const userInvs = store.investments.filter(i => i.userId === u.id);

      const cashIdr = userAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const invIdr = userInvs.reduce((sum, inv) => {
        const val = inv.currentValue || 0;
        return sum + (inv.currency === 'USD' ? val * 15850 : val);
      }, 0);

      const isAdm = u.email === 'davinwijaya16@gmail.com' || u.email === 'davinwijaya1996@gmail.com' || u.role === 'admin';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: isAdm ? 'admin' : 'user',
        createdAt: u.createdAt || new Date().toISOString(),
        accountsCount: userAccounts.length,
        transactionsCount: userTxs.length,
        investmentsCount: userInvs.length,
        totalNetWorthIdr: cashIdr + invIdr,
      };
    });

    return { users: list };
  },

  async setAdminUserRole(id: string, role: 'admin' | 'user'): Promise<{ success: boolean; user: any }> {
    const store = getStore();
    const user = store.users.find(u => u.id === id);
    if (user) {
      user.role = role;
      saveStore(store);
    }
    return { success: true, user };
  },

  async addAdminEmail(email: string): Promise<{ success: boolean; adminEmails: string[] }> {
    const clean = email.toLowerCase().trim();
    const list = ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com'];
    if (!list.includes(clean)) list.push(clean);
    return { success: true, adminEmails: list };
  },

  async removeAdminEmail(email: string): Promise<{ success: boolean; adminEmails: string[] }> {
    const clean = email.toLowerCase().trim();
    const list = ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com'].filter(e => e !== clean);
    return { success: true, adminEmails: list };
  },

  async deleteAdminUser(id: string): Promise<{ success: boolean; message: string }> {
    const store = getStore();
    store.users = store.users.filter(u => u.id !== id);
    store.accounts = store.accounts.filter(a => a.userId !== id);
    store.transactions = store.transactions.filter(t => t.userId !== id);
    store.investments = store.investments.filter(i => i.userId !== id);
    saveStore(store);
    return { success: true, message: 'User deleted' };
  },

  async getAdminTransactions(limit: number = 100): Promise<{ transactions: any[] }> {
    const store = getStore();
    const list = store.transactions.map(t => {
      const user = store.users.find(u => u.id === t.userId);
      const acc = store.accounts.find(a => a.id === t.accountId);
      return {
        ...t,
        userName: user?.name || 'Local User',
        userEmail: user?.email || 'user@example.com',
        accountName: acc?.name || 'Account',
      };
    });
    list.sort((a, b) => new Date(b.date + ' ' + b.createdAt).getTime() - new Date(a.date + ' ' + a.createdAt).getTime());
    return { transactions: list.slice(0, limit) };
  },

  async getAdminSystemSettings(): Promise<{ settings: SystemSettings }> {
    const { announcement, maintenanceMode } = await this.getPublicAnnouncement();
    return {
      settings: {
        announcement,
        maintenanceMode,
        allowNewRegistrations: true,
        adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
        defaultUsdIdrRate: 15850,
      },
    };
  },

  async updateAdminSystemSettings(data: Partial<SystemSettings>): Promise<{ success: boolean; settings: SystemSettings }> {
    if (data.announcement) {
      localStorage.setItem('wealthtrack_system_announcement', JSON.stringify(data.announcement));
    }
    if (data.maintenanceMode !== undefined) {
      localStorage.setItem('wealthtrack_maintenance_mode', String(data.maintenanceMode));
    }
    const current = await this.getAdminSystemSettings();
    return { success: true, settings: { ...current.settings, ...data } };
  },

  async exportDatabase(): Promise<any> {
    const store = getStore();
    return {
      exportTimestamp: new Date().toISOString(),
      platform: 'WealthTrack Pro',
      stats: {
        users: store.users.length,
        accounts: store.accounts.length,
        transactions: store.transactions.length,
        investments: store.investments.length,
      },
      ...store,
    };
  },
};
