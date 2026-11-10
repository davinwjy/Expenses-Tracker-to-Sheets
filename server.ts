import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import {
  initDB,
  db,
  type User,
  type Account,
  type Transaction,
  type Investment,
  type UserSettings,
  type HoldingType,
  DEFAULT_HOLDING_TYPES,
} from './server/db.ts';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'wealthtrack-secret-key-prod-2026';
const isProduction = process.env.NODE_ENV === 'production';

// Initialize persistent JSON database
initDB();

const app = express();
app.use(cors());
app.use(express.json());

// Extend express Request for user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: 'admin' | 'user';
  };
}

// Check if email has admin privileges
function isUserAdminEmail(email?: string): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  const configured = db.data.systemSettings?.adminEmails || ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'];
  return configured.map(e => e.toLowerCase().trim()).includes(clean);
}

// Authentication middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const userInDb = db.data.users.find(u => u.id === decoded.id);
    const role = (userInDb?.role === 'admin' || isUserAdminEmail(decoded.email)) ? 'admin' : 'user';
    req.user = { ...decoded, role };
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Admin-only middleware
function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    const userInDb = db.data.users.find(u => u.id === req.user?.id);
    const email = req.user?.email || userInDb?.email;
    const hasAdminRole = userInDb?.role === 'admin' || isUserAdminEmail(email);

    if (hasAdminRole) {
      next();
    } else {
      res.status(403).json({
        error: 'Forbidden: Admin access required. Only authorized administrators (such as davinwijaya16@gmail.com) can manage this platform.',
      });
    }
  });
}

// Helper to get exchange rate for user
function getUserRate(userId: string): number {
  const userSetting = db.data.settings.find(s => s.userId === userId);
  return userSetting ? userSetting.usdIdrRate : 15850;
}

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

app.post('/api/auth/register', (req: Request, res: Response): void => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.data.users.find(u => u.email === cleanEmail);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const role = isUserAdminEmail(cleanEmail) ? 'admin' : 'user';

    const newUser: User = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      name: name ? String(name).trim() : cleanEmail.split('@')[0],
      role,
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(newUser);

    // Initial default accounts
    const initialAccounts: Account[] = [
      {
        id: 'acc_' + Date.now() + '_1',
        userId,
        name: 'BCA Main',
        type: 'bank',
        balance: 12500000,
        accountNumber: '•••• 4821',
        color: '#3b82f6', // blue
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc_' + Date.now() + '_2',
        userId,
        name: 'Mandiri Payroll',
        type: 'bank',
        balance: 8000000,
        accountNumber: '•••• 9102',
        color: '#0284c7', // sky
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'acc_' + Date.now() + '_3',
        userId,
        name: 'Physical Cash',
        type: 'cash',
        balance: 850000,
        color: '#10b981', // emerald
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    db.data.accounts.push(...initialAccounts);

    // Initial default investments (covering the 5 requested categories)
    const initialInvestments: Investment[] = [
      {
        id: 'inv_' + Date.now() + '_1',
        userId,
        name: 'BBCA (Bank Central Asia)',
        category: 'Saham',
        currency: 'IDR',
        amountInvested: 15000000,
        currentValue: 17200000,
        units: 17,
        platform: 'Ajaib / Sekuritas',
        notes: 'Blue chip banking stock',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inv_' + Date.now() + '_2',
        userId,
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
        id: 'inv_' + Date.now() + '_3',
        userId,
        name: 'Bitcoin (BTC)',
        category: 'Bitcoin',
        currency: 'IDR',
        amountInvested: 18500000,
        currentValue: 24800000,
        units: 0.0165,
        platform: 'Indodax / Tokocrypto',
        notes: 'Digital store of value',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inv_' + Date.now() + '_4',
        userId,
        name: 'VOO - Vanguard S&P 500',
        category: 'ETF USA',
        currency: 'USD',
        amountInvested: 1500,
        currentValue: 1740,
        units: 3.2,
        platform: 'GoTrade / IBKR',
        notes: 'Broad market US index ETF',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inv_' + Date.now() + '_5',
        userId,
        name: 'USD Savings / Cash',
        category: 'USD',
        currency: 'USD',
        amountInvested: 600,
        currentValue: 600,
        units: 600,
        platform: 'Wise / Multi-currency',
        notes: 'Foreign currency liquid buffer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    db.data.investments.push(...initialInvestments);

    // Initial starter transactions
    const todayStr = new Date().toISOString().split('T')[0];
    const initialTransactions: Transaction[] = [
      {
        id: 'tx_' + Date.now() + '_1',
        userId,
        type: 'expense',
        amount: 85000,
        accountId: initialAccounts[0].id,
        category: 'Food & Dining',
        date: todayStr,
        notes: 'Lunch with team',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx_' + Date.now() + '_2',
        userId,
        type: 'expense',
        amount: 45000,
        accountId: initialAccounts[2].id,
        category: 'Transportation',
        date: todayStr,
        notes: 'Taxi ride to station',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'tx_' + Date.now() + '_3',
        userId,
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
    db.data.transactions.push(...initialTransactions);

    // Initial user settings
    db.data.settings.push({
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
    });

    db.save();

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register account' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response): void => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.data.users.find(u => u.email === cleanEmail);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Automatically ensure davinwijaya16@gmail.com and configured emails have role admin
    const role = (user.role === 'admin' || isUserAdminEmail(user.email)) ? 'admin' : 'user';
    if (user.role !== role) {
      user.role = role;
      db.save();
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const user = db.data.users.find(u => u.id === req.user?.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const role = (user.role === 'admin' || isUserAdminEmail(user.email)) ? 'admin' : 'user';
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
      createdAt: user.createdAt,
    },
  });
});

// -------------------------------------------------------------
// ACCOUNTS ROUTES (Banks & Cash & E-wallets)
// -------------------------------------------------------------

app.get('/api/accounts', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const accounts = db.data.accounts.filter(a => a.userId === userId);
  res.json({ accounts });
});

app.post('/api/accounts', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { name, type, balance, accountNumber, color } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'Account name and type are required' });
      return;
    }

    const newAccount: Account = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: String(name).trim(),
      type: type === 'cash' ? 'cash' : type === 'ewallet' ? 'ewallet' : 'bank',
      balance: Number(balance) || 0,
      accountNumber: accountNumber ? String(accountNumber).trim() : undefined,
      color: color || '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.accounts.push(newAccount);
    db.save();

    res.status(201).json({ account: newAccount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.put('/api/accounts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, type, balance, accountNumber, color } = req.body;

    const account = db.data.accounts.find(a => a.id === id && a.userId === userId);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (name !== undefined) account.name = String(name).trim();
    if (type !== undefined) account.type = type;
    if (balance !== undefined) account.balance = Number(balance);
    if (accountNumber !== undefined) account.accountNumber = String(accountNumber).trim();
    if (color !== undefined) account.color = color;
    account.updatedAt = new Date().toISOString();

    db.save();
    res.json({ account });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

app.delete('/api/accounts/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const index = db.data.accounts.findIndex(a => a.id === id && a.userId === userId);
    if (index === -1) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    db.data.accounts.splice(index, 1);
    db.save();
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// -------------------------------------------------------------
// TRANSACTIONS (Expenses & Incomes)
// -------------------------------------------------------------

app.get('/api/transactions', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { type, accountId, limit } = req.query;

  let txs = db.data.transactions.filter(t => t.userId === userId);

  if (type) {
    txs = txs.filter(t => t.type === type);
  }
  if (accountId) {
    txs = txs.filter(t => t.accountId === accountId || t.toAccountId === accountId);
  }

  // Sort descending by date and createdAt
  txs.sort((a, b) => new Date(b.date + ' ' + b.createdAt).getTime() - new Date(a.date + ' ' + a.createdAt).getTime());

  if (limit) {
    txs = txs.slice(0, Number(limit));
  }

  res.json({ transactions: txs });
});

// AI Auto-Categorize endpoint
app.post('/api/ai/categorize', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { description, type } = req.body;
    if (!description || !String(description).trim()) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    const categories = type === 'income' ? [
      'Salary / Wages',
      'Business / Freelance',
      'Investment Returns',
      'Gifts / Bonus',
      'Other Income'
    ] : [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Bills & Utilities',
      'Entertainment',
      'Health & Fitness',
      'Travel',
      'Education',
      'Subscriptions',
      'Other Expense'
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Classify the following transaction description into one of the provided categories. 
Transaction Type: ${type || 'expense'}
Description: "${String(description).trim()}"
Available Categories: ${JSON.stringify(categories)}

Return ONLY the category name as plain text (exact match from the list).`,
    });

    const suggestedCategory = (response.text || '').trim();
    res.json({ category: suggestedCategory });
  } catch (err: any) {
    console.error('AI Categorization error:', err);
    res.status(500).json({ error: err.message || 'Failed to auto-categorize' });
  }
});

app.post('/api/transactions', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { type, amount, accountId, category, date, notes } = req.body;

    const parsedAmount = Math.abs(Number(amount));
    if (!parsedAmount || isNaN(parsedAmount)) {
      res.status(400).json({ error: 'Valid transaction amount is required' });
      return;
    }

    if (!accountId) {
      res.status(400).json({ error: 'Funding account is required' });
      return;
    }

    const account = db.data.accounts.find(a => a.id === accountId && a.userId === userId);
    if (!account) {
      res.status(404).json({ error: 'Funding account not found' });
      return;
    }

    const txType = type === 'income' ? 'income' : 'expense';

    // Validate available balance/credit for expense
    if (txType === 'expense') {
      if (account.type === 'credit_card' || account.type === 'paylater') {
        if (account.creditLimit !== undefined && account.balance + parsedAmount > account.creditLimit) {
          const availLimit = Math.max(0, account.creditLimit - account.balance);
          res.status(400).json({
            error: `Insufficient credit limit. Available: ${availLimit}`,
          });
          return;
        }
      } else {
        if (parsedAmount > account.balance) {
          res.status(400).json({
            error: `Insufficient balance. Available balance: ${account.balance}`,
          });
          return;
        }
      }
    }

    // Update account balance
    if (account.type === 'credit_card' || account.type === 'paylater') {
      if (txType === 'expense') {
        account.balance += parsedAmount;
      } else {
        account.balance -= parsedAmount;
      }
    } else {
      if (txType === 'expense') {
        account.balance -= parsedAmount;
      } else {
        account.balance += parsedAmount;
      }
    }
    account.updatedAt = new Date().toISOString();

    const newTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      type: txType,
      amount: parsedAmount,
      accountId,
      category: category ? String(category).trim() : 'General',
      date: date || new Date().toISOString().split('T')[0],
      notes: notes ? String(notes).trim() : '',
      createdAt: new Date().toISOString(),
    };

    db.data.transactions.push(newTx);
    db.save();

    res.status(201).json({ transaction: newTx, updatedAccount: account });
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).json({ error: 'Failed to record transaction' });
  }
});

app.put('/api/transactions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { type, amount, accountId, category, date, notes } = req.body;

    const tx = db.data.transactions.find(t => t.id === id && t.userId === userId);
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const newAmount = amount !== undefined ? Math.abs(Number(amount)) : tx.amount;
    const newType = type || tx.type;
    const targetAccountId = accountId || tx.accountId;

    const oldAccount = db.data.accounts.find(a => a.id === tx.accountId && a.userId === userId);
    const targetAccount = db.data.accounts.find(a => a.id === targetAccountId && a.userId === userId);

    if (!targetAccount) {
      res.status(404).json({ error: 'Target account not found' });
      return;
    }

    // Validate available balance/credit for updated expense
    if (newType === 'expense') {
      if (targetAccount.type === 'credit_card' || targetAccount.type === 'paylater') {
        if (targetAccount.creditLimit !== undefined) {
          let revertedDebt = targetAccount.balance;
          if (oldAccount && oldAccount.id === targetAccount.id && tx.type === 'expense') {
            revertedDebt = Math.max(0, revertedDebt - tx.amount);
          }
          if (revertedDebt + newAmount > targetAccount.creditLimit) {
            const avail = Math.max(0, targetAccount.creditLimit - revertedDebt);
            res.status(400).json({ error: `Insufficient credit limit. Available: ${avail}` });
            return;
          }
        }
      } else {
        let revertedBal = targetAccount.balance;
        if (oldAccount && oldAccount.id === targetAccount.id && tx.type === 'expense') {
          revertedBal += tx.amount;
        }
        if (newAmount > revertedBal) {
          res.status(400).json({ error: `Insufficient balance. Available: ${revertedBal}` });
          return;
        }
      }
    }

    // Revert old transaction effect on original account
    if (oldAccount) {
      if (oldAccount.type === 'credit_card' || oldAccount.type === 'paylater') {
        if (tx.type === 'expense') {
          oldAccount.balance -= tx.amount;
        } else if (tx.type === 'income') {
          oldAccount.balance += tx.amount;
        }
      } else {
        if (tx.type === 'expense') {
          oldAccount.balance += tx.amount;
        } else if (tx.type === 'income') {
          oldAccount.balance -= tx.amount;
        }
      }
      oldAccount.updatedAt = new Date().toISOString();
    }

    // Apply new values to target account
    if (targetAccount) {
      if (targetAccount.type === 'credit_card' || targetAccount.type === 'paylater') {
        if (newType === 'expense') {
          targetAccount.balance += newAmount;
        } else if (newType === 'income') {
          targetAccount.balance -= newAmount;
        }
      } else {
        if (newType === 'expense') {
          targetAccount.balance -= newAmount;
        } else if (newType === 'income') {
          targetAccount.balance += newAmount;
        }
      }
      targetAccount.updatedAt = new Date().toISOString();
    }

    tx.amount = newAmount;
    tx.type = newType;
    tx.accountId = targetAccountId;
    if (category !== undefined) tx.category = String(category).trim();
    if (date !== undefined) tx.date = date;
    if (notes !== undefined) tx.notes = String(notes).trim();

    db.save();
    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const txIndex = db.data.transactions.findIndex(t => t.id === id && t.userId === userId);
    if (txIndex === -1) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const tx = db.data.transactions[txIndex];

    // Revert account balance
    const account = db.data.accounts.find(a => a.id === tx.accountId && a.userId === userId);
    if (account) {
      if (account.type === 'credit_card' || account.type === 'paylater') {
        if (tx.type === 'expense') {
          account.balance -= tx.amount;
        } else if (tx.type === 'income') {
          account.balance += tx.amount;
        }
      } else {
        if (tx.type === 'expense') {
          account.balance += tx.amount;
        } else if (tx.type === 'income') {
          account.balance -= tx.amount;
        }
      }
      account.updatedAt = new Date().toISOString();
    }

    // If it was transfer to account
    if (tx.type === 'transfer' && tx.toAccountId) {
      const toAccount = db.data.accounts.find(a => a.id === tx.toAccountId && a.userId === userId);
      if (toAccount) {
        toAccount.balance -= tx.amount;
      }
    }

    db.data.transactions.splice(txIndex, 1);
    db.save();

    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// -------------------------------------------------------------
// TRANSFERS (Bank to Cash, Cash to Bank, Bank to Investment)
// -------------------------------------------------------------

app.post('/api/transfers', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const {
      type, // 'account_to_account' | 'bank_to_investment'
      fromAccountId,
      toAccountId,
      toInvestmentId,
      amountIdr,
      amountUsd: rawAmountUsd,
      exchangeRate,
      date,
      notes,
    } = req.body;

    const amount = Math.abs(Number(amountIdr));
    if (!amount || isNaN(amount)) {
      res.status(400).json({ error: 'Valid transfer amount in IDR is required' });
      return;
    }

    const sourceAccount = db.data.accounts.find(a => a.id === fromAccountId && a.userId === userId);
    if (!sourceAccount) {
      res.status(404).json({ error: 'Source account not found' });
      return;
    }

    const txDate = date || new Date().toISOString().split('T')[0];

    // Scenario 1: Bank to Investment
    if (type === 'bank_to_investment') {
      let investment = toInvestmentId
        ? db.data.investments.find(inv => inv.id === toInvestmentId && inv.userId === userId)
        : null;

      if (!investment && req.body.newInvestment) {
        const { name, category, currency: reqCur, platform, units, notes: invNotes } = req.body.newInvestment;
        if (!name || !category) {
          res.status(400).json({ error: 'New investment name and category are required' });
          return;
        }
        const createdInv: Investment = {
          id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId,
          name: String(name).trim(),
          category: String(category).trim(),
          currency: (reqCur === 'USD' || reqCur === 'IDR') ? reqCur : ((category === 'ETF USA' || category === 'USD') ? 'USD' : 'IDR'),
          amountInvested: 0,
          currentValue: 0,
          customExchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
          units: units ? Number(units) : undefined,
          platform: platform ? String(platform).trim() : undefined,
          notes: invNotes ? String(invNotes).trim() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.data.investments.push(createdInv);
        investment = createdInv;
      }

      if (!investment) {
        res.status(404).json({ error: 'Target investment not found or missing new asset details' });
        return;
      }

      // Deduct source bank/cash account
      sourceAccount.balance -= amount;
      sourceAccount.updatedAt = new Date().toISOString();

      let rate = Number(exchangeRate) || investment.customExchangeRate || getUserRate(userId);
      let amountUsd = undefined;

      if (investment.currency === 'USD') {
        const parsedUsd = Number(rawAmountUsd);
        if (!isNaN(parsedUsd) && parsedUsd > 0) {
          amountUsd = Number(parsedUsd.toFixed(2));
          if (amount > 0) {
            rate = Number(exchangeRate) || Number((amount / amountUsd).toFixed(2));
          }
        } else {
          amountUsd = Number((amount / rate).toFixed(2));
        }
        investment.amountInvested += amountUsd;
        investment.currentValue += amountUsd;
        investment.customExchangeRate = rate;
      } else {
        investment.amountInvested += amount;
        investment.currentValue += amount;
      }
      investment.updatedAt = new Date().toISOString();

      const transferTx: Transaction = {
        id: 'tx_inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        userId,
        type: 'bank_to_investment',
        amount,
        accountId: fromAccountId,
        toInvestmentId: investment.id,
        amountUsd,
        exchangeRate: investment.currency === 'USD' ? rate : undefined,
        category: `Investment: ${investment.category}`,
        date: txDate,
        notes: notes ? String(notes).trim() : `Funded ${investment.name} from ${sourceAccount.name}`,
        createdAt: new Date().toISOString(),
      };

      db.data.transactions.push(transferTx);
      db.save();

      res.status(201).json({
        success: true,
        transaction: transferTx,
        sourceAccount,
        investment,
      });
      return;
    }

    // Scenario 2: Account to Account (e.g. Bank to Cash, Cash to Bank, Bank to Bank)
    if (!toAccountId) {
      res.status(400).json({ error: 'Destination account is required' });
      return;
    }

    if (fromAccountId === toAccountId) {
      res.status(400).json({ error: 'Source and destination accounts must be different' });
      return;
    }

    const destAccount = db.data.accounts.find(a => a.id === toAccountId && a.userId === userId);
    if (!destAccount) {
      res.status(404).json({ error: 'Destination account not found' });
      return;
    }

    // Transfer balances
    sourceAccount.balance -= amount;
    destAccount.balance += amount;
    sourceAccount.updatedAt = new Date().toISOString();
    destAccount.updatedAt = new Date().toISOString();

    const transferTx: Transaction = {
      id: 'tx_trf_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      type: 'transfer',
      amount,
      accountId: fromAccountId,
      toAccountId,
      category: `Transfer to ${destAccount.name}`,
      date: txDate,
      notes: notes ? String(notes).trim() : `Transfer from ${sourceAccount.name} to ${destAccount.name}`,
      createdAt: new Date().toISOString(),
    };

    db.data.transactions.push(transferTx);
    db.save();

    res.status(201).json({
      success: true,
      transaction: transferTx,
      sourceAccount,
      destAccount,
    });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ error: 'Failed to complete transfer' });
  }
});

// -------------------------------------------------------------
// INVESTMENTS (USD, Bitcoin, Saham, RDPU, ETF USA)
// -------------------------------------------------------------

app.get('/api/investments', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const investments = db.data.investments.filter(inv => inv.userId === userId);
  res.json({ investments });
});

app.post('/api/investments', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { name, category, currency: reqCurrency, amountInvested, currentValue, customExchangeRate, units, platform, notes } = req.body;

    if (!name || !category) {
      res.status(400).json({ error: 'Investment name and category are required' });
      return;
    }

    const trimmedCategory = String(category).trim();
    if (!trimmedCategory) {
      res.status(400).json({ error: 'Valid category is required' });
      return;
    }

    const matchedHoldingType = (db.data.holdingTypes || []).find(h => h.id.toLowerCase() === trimmedCategory.toLowerCase());
    const currency = (reqCurrency === 'USD' || reqCurrency === 'IDR')
      ? reqCurrency
      : (matchedHoldingType?.defaultCurrency || ((trimmedCategory === 'Saham' || trimmedCategory === 'RDPU' || trimmedCategory === 'Bitcoin') ? 'IDR' : 'USD'));

    const invested = Number(amountInvested) || 0;
    const current = currentValue !== undefined ? Number(currentValue) : invested;

    const newInvestment: Investment = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: String(name).trim(),
      category,
      currency,
      amountInvested: invested,
      currentValue: current,
      customExchangeRate: customExchangeRate ? Number(customExchangeRate) : undefined,
      units: units !== undefined && units !== '' ? Number(units) : undefined,
      platform: platform ? String(platform).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.investments.push(newInvestment);
    db.save();

    res.status(201).json({ investment: newInvestment });
  } catch (err) {
    console.error('Create investment error:', err);
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

app.put('/api/investments/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, category, currency, amountInvested, currentValue, customExchangeRate, units, platform, notes } = req.body;

    const inv = db.data.investments.find(i => i.id === id && i.userId === userId);
    if (!inv) {
      res.status(404).json({ error: 'Investment not found' });
      return;
    }

    if (name !== undefined) inv.name = String(name).trim();
    if (category !== undefined) inv.category = category;
    if (currency !== undefined && (currency === 'IDR' || currency === 'USD')) {
      inv.currency = currency;
    } else if (category !== undefined && !currency) {
      // only fallback if currency wasn't already set
      if (!inv.currency) {
        inv.currency = (category === 'Saham' || category === 'RDPU' || category === 'Bitcoin') ? 'IDR' : 'USD';
      }
    }
    if (amountInvested !== undefined) inv.amountInvested = Number(amountInvested);
    if (currentValue !== undefined) inv.currentValue = Number(currentValue);
    if (customExchangeRate !== undefined) inv.customExchangeRate = customExchangeRate ? Number(customExchangeRate) : undefined;
    if (units !== undefined) inv.units = units !== '' ? Number(units) : undefined;
    if (platform !== undefined) inv.platform = String(platform).trim();
    if (notes !== undefined) inv.notes = String(notes).trim();
    inv.updatedAt = new Date().toISOString();

    db.save();
    res.json({ investment: inv });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

app.delete('/api/investments/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const index = db.data.investments.findIndex(i => i.id === id && i.userId === userId);
    if (index === -1) {
      res.status(404).json({ error: 'Investment not found' });
      return;
    }

    db.data.investments.splice(index, 1);
    db.save();
    res.json({ success: true, message: 'Investment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

// -------------------------------------------------------------
// MASTER JENIS HOLDINGS (Holding Types)
// -------------------------------------------------------------

app.get('/api/holding-types', (_req: Request, res: Response): void => {
  if (!db.data.holdingTypes || db.data.holdingTypes.length === 0) {
    db.data.holdingTypes = [...DEFAULT_HOLDING_TYPES];
    db.save();
  }
  res.json({ holdingTypes: db.data.holdingTypes });
});

app.post('/api/holding-types', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { label, defaultCurrency, badgeColor, example } = req.body;
    if (!label || !String(label).trim()) {
      res.status(400).json({ error: 'Label / Nama jenis holding wajib diisi' });
      return;
    }
    const cleanLabel = String(label).trim();
    const cleanCurrency: 'IDR' | 'USD' = defaultCurrency === 'USD' ? 'USD' : 'IDR';

    if (!db.data.holdingTypes) {
      db.data.holdingTypes = [...DEFAULT_HOLDING_TYPES];
    }

    const existing = db.data.holdingTypes.find(
      (h) => h.label.toLowerCase() === cleanLabel.toLowerCase() || h.id.toLowerCase() === cleanLabel.toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: `Jenis holding "${cleanLabel}" sudah ada.` });
      return;
    }

    const newHoldingType: HoldingType = {
      id: cleanLabel,
      label: cleanLabel,
      defaultCurrency: cleanCurrency,
      badgeColor: badgeColor || (cleanCurrency === 'USD' ? '#6366f1' : '#10b981'),
      example: example ? String(example).trim() : undefined,
      isSystem: false,
      createdAt: new Date().toISOString(),
    };

    db.data.holdingTypes.push(newHoldingType);
    db.save();

    res.status(201).json({ holdingType: newHoldingType });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal menambahkan jenis holding' });
  }
});

app.put('/api/holding-types/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { label, defaultCurrency, badgeColor, example } = req.body;

    if (!db.data.holdingTypes) {
      db.data.holdingTypes = [...DEFAULT_HOLDING_TYPES];
    }

    const index = db.data.holdingTypes.findIndex((h) => h.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Jenis holding tidak ditemukan' });
      return;
    }

    const current = db.data.holdingTypes[index];
    const updated: HoldingType = {
      ...current,
      label: label ? String(label).trim() : current.label,
      defaultCurrency: defaultCurrency ? (defaultCurrency === 'USD' ? 'USD' : 'IDR') : current.defaultCurrency,
      badgeColor: badgeColor || current.badgeColor,
      example: example !== undefined ? String(example).trim() : current.example,
    };

    db.data.holdingTypes[index] = updated;
    db.save();

    res.json({ holdingType: updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal mengubah jenis holding' });
  }
});

app.delete('/api/holding-types/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    if (!db.data.holdingTypes) {
      db.data.holdingTypes = [...DEFAULT_HOLDING_TYPES];
    }

    const item = db.data.holdingTypes.find((h) => h.id === id);
    if (!item) {
      res.status(404).json({ error: 'Jenis holding tidak ditemukan' });
      return;
    }

    if (item.isSystem) {
      res.status(400).json({ error: 'Jenis holding default sistem tidak dapat dihapus' });
      return;
    }

    const inUse = db.data.investments.some((inv) => inv.category === id);
    if (inUse) {
      res.status(400).json({ error: 'Tidak dapat menghapus jenis holding yang masih memiliki aset investasi aktif' });
      return;
    }

    db.data.holdingTypes = db.data.holdingTypes.filter((h) => h.id !== id);
    db.save();

    res.json({ success: true, message: 'Jenis holding berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gagal menghapus jenis holding' });
  }
});

// -------------------------------------------------------------
// BUDGETS (Monthly Category Spending Limits)
// -------------------------------------------------------------

app.get('/api/budgets', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  if (!db.data.budgets) db.data.budgets = [];
  const budgets = db.data.budgets.filter(b => b.userId === userId);
  res.json({ budgets });
});

app.post('/api/budgets', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id, category, monthlyLimit, month } = req.body;

    if (!category || !String(category).trim()) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    if (!db.data.budgets) db.data.budgets = [];

    const cleanCategory = String(category).trim();
    const cleanLimit = Math.max(0, Number(monthlyLimit) || 0);
    const cleanMonth = month ? String(month).trim() : undefined;

    let existingIdx = -1;
    if (id) {
      existingIdx = db.data.budgets.findIndex(b => b.id === id && b.userId === userId);
    } else {
      existingIdx = db.data.budgets.findIndex(
        b => b.userId === userId && b.category.toLowerCase() === cleanCategory.toLowerCase() && (b.month || '') === (cleanMonth || '')
      );
    }

    if (existingIdx >= 0) {
      const current = db.data.budgets[existingIdx];
      current.category = cleanCategory;
      current.monthlyLimit = cleanLimit;
      current.month = cleanMonth;
      current.updatedAt = new Date().toISOString();
      db.save();
      res.json({ budget: current });
      return;
    }

    const newBudget = {
      id: id || 'bgt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      category: cleanCategory,
      monthlyLimit: cleanLimit,
      month: cleanMonth,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.budgets.push(newBudget);
    db.save();
    res.status(201).json({ budget: newBudget });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to save budget' });
  }
});

app.delete('/api/budgets/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!db.data.budgets) db.data.budgets = [];
    db.data.budgets = db.data.budgets.filter(b => !(b.id === id && b.userId === userId));
    db.save();
    res.json({ success: true, message: 'Budget removed' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete budget' });
  }
});

// -------------------------------------------------------------
// SETTINGS (USD/IDR exchange rate, etc.)
// -------------------------------------------------------------

app.get('/api/settings', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  let setting = db.data.settings.find(s => s.userId === userId);
  if (!setting) {
    setting = {
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
    };
    db.data.settings.push(setting);
    db.save();
  }
  res.json({ settings: setting });
});

app.put('/api/settings', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { usdIdrRate, autoUpdateRate, rateLastUpdated, rateSource, privacyModeDefault, theme } = req.body;

    let setting = db.data.settings.find(s => s.userId === userId);
    if (!setting) {
      setting = {
        userId,
        usdIdrRate: 15850,
        privacyModeDefault: false,
        theme: 'dark',
      };
      db.data.settings.push(setting);
    }

    if (usdIdrRate !== undefined && !isNaN(Number(usdIdrRate)) && Number(usdIdrRate) > 0) {
      setting.usdIdrRate = Number(usdIdrRate);
    }
    if (autoUpdateRate !== undefined) {
      setting.autoUpdateRate = Boolean(autoUpdateRate);
    }
    if (rateLastUpdated !== undefined) {
      setting.rateLastUpdated = String(rateLastUpdated);
    }
    if (rateSource !== undefined) {
      setting.rateSource = String(rateSource);
    }
    if (privacyModeDefault !== undefined) {
      setting.privacyModeDefault = Boolean(privacyModeDefault);
    }
    if (theme !== undefined) {
      setting.theme = theme;
    }

    db.save();
    res.json({ settings: setting });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Live USD/IDR exchange rate from Google Finance
app.get('/api/exchange-rate/usd-idr', async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch live quote from Google Finance
    try {
      const gRes = await fetch('https://www.google.com/finance/quote/USD-IDR', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (gRes.ok) {
        const html = await gRes.text();
        const match = html.match(/\"USD \/ IDR\",\s*\d+,\s*null,\s*\[([0-9.]+)/);
        if (match && match[1]) {
          const parsedRate = parseFloat(match[1]);
          if (!isNaN(parsedRate) && parsedRate > 0) {
            res.json({
              rate: parsedRate,
              source: 'Google Finance',
              timestamp: new Date().toISOString(),
              success: true,
            });
            return;
          }
        }
      }
    } catch (gErr) {
      console.warn('Google Finance direct fetch warning:', gErr);
    }

    // 2. Resilient fallback to open exchange rate API
    const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (fallbackRes.ok) {
      const data = (await fallbackRes.json()) as any;
      if (data && data.rates && typeof data.rates.IDR === 'number') {
        res.json({
          rate: Number(data.rates.IDR),
          source: 'Google / Live Market (ER-API)',
          timestamp: new Date().toISOString(),
          success: true,
        });
        return;
      }
    }

    res.status(500).json({ error: 'Could not fetch live rate' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Exchange rate fetch error' });
  }
});

// -------------------------------------------------------------
// DASHBOARD STATS
// -------------------------------------------------------------

app.get('/api/stats/dashboard', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const rate = getUserRate(userId);

    const userAccounts = db.data.accounts.filter(a => a.userId === userId);
    const userInvestments = db.data.investments.filter(i => i.userId === userId);
    const userTransactions = db.data.transactions.filter(t => t.userId === userId);

    // Calculate total liquid cash & bank in IDR
    const totalLiquidCashIdr = userAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Calculate investments breakdown
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

    // Total Net Worth in IDR
    const totalNetWorthIdr = totalLiquidCashIdr + totalInvestmentValueIdr;

    // Current month calculations
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

    // Expenses by category
    const expenseByCategory: Record<string, number> = {};
    thisMonthTxs
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
      });

    // Expenses by funding account
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

    res.json({
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
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// -------------------------------------------------------------
// PUBLIC SYSTEM ANNOUNCEMENTS & STATUS
// -------------------------------------------------------------

app.get('/api/public/announcement', (_req: Request, res: Response): void => {
  const settings = db.data.systemSettings;
  res.json({
    announcement: settings?.announcement || {
      id: 'default',
      message: '',
      type: 'info',
      enabled: false,
      updatedAt: new Date().toISOString(),
    },
    maintenanceMode: settings?.maintenanceMode || false,
  });
});

// -------------------------------------------------------------
// ADMIN MANAGEMENT CONSOLE ROUTES
// -------------------------------------------------------------

app.get('/api/admin/overview', authenticateAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const totalUsers = db.data.users.length;
    const totalAccounts = db.data.accounts.length;
    const totalTransactions = db.data.transactions.length;
    const totalInvestments = db.data.investments.length;

    const totalVolumeIdr = db.data.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Calculate total net worth tracked across all platform users
    const defaultRate = db.data.systemSettings?.defaultUsdIdrRate || 15850;
    const totalCashIdr = db.data.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalInvestmentsIdr = db.data.investments.reduce((sum, inv) => {
      const val = inv.currentValue || 0;
      return sum + (inv.currency === 'USD' ? val * defaultRate : val);
    }, 0);
    const totalTrackedAssetsIdr = totalCashIdr + totalInvestmentsIdr;

    const registeredAdmins = db.data.systemSettings?.adminEmails || ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'];
    const adminCount = db.data.users.filter(u => u.role === 'admin' || isUserAdminEmail(u.email)).length;

    res.json({
      totalUsers,
      totalAccounts,
      totalTransactions,
      totalInvestments,
      totalVolumeIdr,
      totalTrackedAssetsIdr,
      serverStatus: 'online',
      dbType: 'JSON Persistent Store (server/db.ts)',
      uptimeSeconds: Math.floor(process.uptime()),
      currentUsdRate: defaultRate,
      adminCount: Math.max(adminCount, registeredAdmins.length),
      registeredAdmins,
    });
  } catch (err: any) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to fetch admin overview' });
  }
});

app.get('/api/admin/users', authenticateAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const defaultRate = db.data.systemSettings?.defaultUsdIdrRate || 15850;

    const usersList = db.data.users.map(u => {
      const userAccounts = db.data.accounts.filter(a => a.userId === u.id);
      const userTxs = db.data.transactions.filter(t => t.userId === u.id);
      const userInvs = db.data.investments.filter(i => i.userId === u.id);

      const cashIdr = userAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const invIdr = userInvs.reduce((sum, inv) => {
        const val = inv.currentValue || 0;
        return sum + (inv.currency === 'USD' ? val * defaultRate : val);
      }, 0);

      const role = (u.role === 'admin' || isUserAdminEmail(u.email)) ? 'admin' : 'user';

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role,
        createdAt: u.createdAt,
        accountsCount: userAccounts.length,
        transactionsCount: userTxs.length,
        investmentsCount: userInvs.length,
        totalNetWorthIdr: cashIdr + invIdr,
      };
    });

    res.json({ users: usersList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list' });
  }
});

app.post('/api/admin/users/:id/role', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ error: "Role must be 'admin' or 'user'" });
      return;
    }

    const user = db.data.users.find(u => u.id === id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.role = role;

    // If making admin, ensure email is in adminEmails list too
    if (role === 'admin' && db.data.systemSettings) {
      if (!db.data.systemSettings.adminEmails.includes(user.email)) {
        db.data.systemSettings.adminEmails.push(user.email);
      }
    }

    db.save();
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.post('/api/admin/add-admin-email', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();

    if (!db.data.systemSettings) {
      db.data.systemSettings = {
        announcement: { id: 'default', message: '', type: 'info', enabled: false, updatedAt: new Date().toISOString() },
        maintenanceMode: false,
        allowNewRegistrations: true,
        adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
        defaultUsdIdrRate: 15850,
      };
    }

    if (!db.data.systemSettings.adminEmails.includes(cleanEmail)) {
      db.data.systemSettings.adminEmails.push(cleanEmail);
    }

    // Also update user record if user already exists
    const existing = db.data.users.find(u => u.email === cleanEmail);
    if (existing) {
      existing.role = 'admin';
    }

    db.save();
    res.json({ success: true, adminEmails: db.data.systemSettings.adminEmails });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add admin email' });
  }
});

app.delete('/api/admin/remove-admin-email', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();

    // Prevent removing the primary master admin davinwijaya16@gmail.com
    if (cleanEmail === 'davinwijaya16@gmail.com') {
      res.status(400).json({ error: 'Cannot remove primary super admin davinwijaya16@gmail.com' });
      return;
    }

    if (db.data.systemSettings) {
      db.data.systemSettings.adminEmails = db.data.systemSettings.adminEmails.filter(e => e.toLowerCase() !== cleanEmail);
    }

    const existing = db.data.users.find(u => u.email === cleanEmail);
    if (existing) {
      existing.role = 'user';
    }

    db.save();
    res.json({ success: true, adminEmails: db.data.systemSettings?.adminEmails || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove admin email' });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { id } = req.params;
    const userIndex = db.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const targetUser = db.data.users[userIndex];
    if (targetUser.email === 'davinwijaya16@gmail.com') {
      res.status(400).json({ error: 'Cannot delete master super admin account' });
      return;
    }

    // Delete user's accounts, transactions, investments, settings
    db.data.users.splice(userIndex, 1);
    db.data.accounts = db.data.accounts.filter(a => a.userId !== id);
    db.data.transactions = db.data.transactions.filter(t => t.userId !== id);
    db.data.investments = db.data.investments.filter(i => i.userId !== id);
    db.data.settings = db.data.settings.filter(s => s.userId !== id);

    db.save();
    res.json({ success: true, message: `User ${targetUser.email} and all related records deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.get('/api/admin/transactions', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const limit = Number(req.query.limit) || 100;

    const list = db.data.transactions.map(t => {
      const user = db.data.users.find(u => u.id === t.userId);
      const acc = db.data.accounts.find(a => a.id === t.accountId);
      return {
        ...t,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'Unknown',
        accountName: acc?.name || 'Account',
      };
    });

    list.sort((a, b) => new Date(b.date + ' ' + b.createdAt).getTime() - new Date(a.date + ' ' + a.createdAt).getTime());

    res.json({ transactions: list.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global transactions' });
  }
});

app.get('/api/admin/system-settings', authenticateAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const settings = db.data.systemSettings || {
      announcement: { id: 'default', message: '', type: 'info', enabled: false, updatedAt: new Date().toISOString() },
      maintenanceMode: false,
      allowNewRegistrations: true,
      adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
      defaultUsdIdrRate: 15850,
    };
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

app.put('/api/admin/system-settings', authenticateAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { announcement, maintenanceMode, allowNewRegistrations, adminEmails, defaultUsdIdrRate } = req.body;

    if (!db.data.systemSettings) {
      db.data.systemSettings = {
        announcement: { id: 'default', message: '', type: 'info', enabled: false, updatedAt: new Date().toISOString() },
        maintenanceMode: false,
        allowNewRegistrations: true,
        adminEmails: ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com', 'davin@wealthtrack.app'],
        defaultUsdIdrRate: 15850,
      };
    }

    if (announcement !== undefined) {
      db.data.systemSettings.announcement = {
        id: announcement.id || 'ann_' + Date.now(),
        message: String(announcement.message || ''),
        type: announcement.type || 'info',
        enabled: Boolean(announcement.enabled),
        updatedAt: new Date().toISOString(),
      };
    }

    if (maintenanceMode !== undefined) {
      db.data.systemSettings.maintenanceMode = Boolean(maintenanceMode);
    }

    if (allowNewRegistrations !== undefined) {
      db.data.systemSettings.allowNewRegistrations = Boolean(allowNewRegistrations);
    }

    if (adminEmails && Array.isArray(adminEmails)) {
      // Always retain davinwijaya16@gmail.com
      const cleaned = Array.from(new Set(['davinwijaya16@gmail.com', ...adminEmails.map((e: string) => String(e).trim().toLowerCase())]));
      db.data.systemSettings.adminEmails = cleaned;
    }

    if (defaultUsdIdrRate !== undefined && !isNaN(Number(defaultUsdIdrRate))) {
      db.data.systemSettings.defaultUsdIdrRate = Number(defaultUsdIdrRate);
    }

    db.save();
    res.json({ success: true, settings: db.data.systemSettings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

app.get('/api/admin/export-database', authenticateAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    // Return sanitized dump (remove password hashes)
    const sanitizedUsers = db.data.users.map(({ passwordHash, ...rest }) => rest);
    const dump = {
      exportTimestamp: new Date().toISOString(),
      platform: 'WealthTrack Pro',
      stats: {
        users: db.data.users.length,
        accounts: db.data.accounts.length,
        transactions: db.data.transactions.length,
        investments: db.data.investments.length,
      },
      users: sanitizedUsers,
      accounts: db.data.accounts,
      transactions: db.data.transactions,
      investments: db.data.investments,
      settings: db.data.settings,
      systemSettings: db.data.systemSettings,
    };
    res.json(dump);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export database' });
  }
});

// -------------------------------------------------------------
// VITE CLIENT MOUNTING
// -------------------------------------------------------------

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WealthTrack Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
});
