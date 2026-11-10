import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from './firebase';
import { User, Account, Transaction, Investment, UserSettings, CategoryBudget } from '../types';
import { isUserAdmin } from './admin';

/**
 * Recursively removes all properties with undefined values.
 * Firestore throws a runtime error if any field in a document is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const firestoreService = {
  // ---------------- AUTHENTICATION ----------------
  async register(email: string, password: string, name?: string): Promise<User> {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error('Firebase is not configured yet');
    }

    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const fbUser = cred.user;

    const displayName = name ? name.trim() : email.split('@')[0];
    await updateProfile(fbUser, { displayName });

    const user: User = {
      id: fbUser.uid,
      email: fbUser.email || email,
      name: displayName,
      role: isUserAdmin({ id: fbUser.uid, email: fbUser.email || email, name: displayName }) ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };

    // Save user doc
    await setDoc(doc(firestoreDb, 'users', fbUser.uid), sanitizeForFirestore(user));

    // Create starter accounts & settings if new
    await this.seedInitialUserData(fbUser.uid);

    return user;
  },

  async login(email: string, password: string): Promise<User> {
    if (!firebaseAuth || !firestoreDb) {
      throw new Error('Firebase is not configured yet');
    }

    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const fbUser = cred.user;

    const uEmail = fbUser.email || email;
    const uName = fbUser.displayName || email.split('@')[0];

    return {
      id: fbUser.uid,
      email: uEmail,
      name: uName,
      role: isUserAdmin({ id: fbUser.uid, email: uEmail, name: uName }) ? 'admin' : 'user',
      createdAt: fbUser.metadata.creationTime,
    };
  },

  async logout(): Promise<void> {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (!firebaseAuth) {
      throw new Error('Firebase Auth is not configured yet');
    }
    await sendPasswordResetEmail(firebaseAuth, email.trim());
  },

  onAuthChanged(callback: (user: User | null) => void): Unsubscribe {
    if (!firebaseAuth) {
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(firebaseAuth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const uEmail = fbUser.email || '';
        const uName = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');
        callback({
          id: fbUser.uid,
          email: uEmail,
          name: uName,
          role: isUserAdmin({ id: fbUser.uid, email: uEmail, name: uName }) ? 'admin' : 'user',
          createdAt: fbUser.metadata.creationTime,
        });
      } else {
        callback(null);
      }
    });
  },

  // ---------------- SEED STARTER DATA ----------------
  async seedInitialUserData(userId: string): Promise<void> {
    if (!firestoreDb) return;

    // Check if user already has accounts
    const accSnap = await getDocs(query(collection(firestoreDb, 'accounts'), where('userId', '==', userId)));
    if (!accSnap.empty) return;

    const now = new Date().toISOString();
    const starterAccounts: Account[] = [
      {
        id: 'acc_' + Date.now() + '_1',
        userId,
        name: 'BCA Main',
        type: 'bank',
        balance: 10000000,
        accountNumber: '•••• 4821',
        color: '#3b82f6',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'acc_' + Date.now() + '_2',
        userId,
        name: 'Cash Wallet',
        type: 'cash',
        balance: 500000,
        color: '#10b981',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const acc of starterAccounts) {
      await setDoc(doc(firestoreDb, 'accounts', acc.id), sanitizeForFirestore(acc));
    }

    const initialSettings: UserSettings = {
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
    };
    await setDoc(doc(firestoreDb, 'settings', userId), sanitizeForFirestore(initialSettings));
  },

  // ---------------- REALTIME DATA SUBSCRIPTION ----------------
  subscribeToUserData(
    userId: string,
    onData: (data: {
      accounts: Account[];
      transactions: Transaction[];
      investments: Investment[];
      budgets: CategoryBudget[];
      settings: UserSettings;
    }) => void
  ): () => void {
    if (!firestoreDb) return () => {};

    let currentAccounts: Account[] = [];
    let currentTransactions: Transaction[] = [];
    let currentInvestments: Investment[] = [];
    let currentBudgets: CategoryBudget[] = [];
    let currentSettings: UserSettings = {
      userId,
      usdIdrRate: 15850,
      privacyModeDefault: false,
      theme: 'dark',
    };

    const trigger = () => {
      onData({
        accounts: [...currentAccounts],
        transactions: [...currentTransactions],
        investments: [...currentInvestments],
        budgets: [...currentBudgets],
        settings: { ...currentSettings },
      });
    };

    // 1. Accounts listener
    const qAccounts = query(collection(firestoreDb, 'accounts'), where('userId', '==', userId));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      currentAccounts = snapshot.docs.map((d) => d.data() as Account);
      trigger();
    });

    // 2. Transactions listener
    const qTransactions = query(collection(firestoreDb, 'transactions'), where('userId', '==', userId));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Transaction);
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      currentTransactions = list;
      trigger();
    });

    // 3. Investments listener
    const qInvestments = query(collection(firestoreDb, 'investments'), where('userId', '==', userId));
    const unsubInvestments = onSnapshot(qInvestments, (snapshot) => {
      currentInvestments = snapshot.docs.map((d) => d.data() as Investment);
      trigger();
    });

    // 4. Budgets listener
    const qBudgets = query(collection(firestoreDb, 'budgets'), where('userId', '==', userId));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      currentBudgets = snapshot.docs.map((d) => d.data() as CategoryBudget);
      trigger();
    });

    // 5. Settings listener
    const docSettings = doc(firestoreDb, 'settings', userId);
    const unsubSettings = onSnapshot(docSettings, (snapshot) => {
      if (snapshot.exists()) {
        currentSettings = snapshot.data() as UserSettings;
      }
      trigger();
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
      unsubInvestments();
      unsubBudgets();
      unsubSettings();
    };
  },

  // ---------------- CRUD ACTIONS ----------------
  async saveAccount(account: Account): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'accounts', account.id), sanitizeForFirestore(account));
  },

  async deleteAccount(accountId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'accounts', accountId));
  },

  async saveTransaction(transaction: Transaction): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'transactions', transaction.id), sanitizeForFirestore(transaction));
  },

  async deleteTransaction(transactionId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'transactions', transactionId));
  },

  async saveInvestment(investment: Investment): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'investments', investment.id), sanitizeForFirestore(investment));
  },

  async deleteInvestment(investmentId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'investments', investmentId));
  },

  async saveBudget(budget: any): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'budgets', budget.id), sanitizeForFirestore(budget));
  },

  async deleteBudget(budgetId: string): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await deleteDoc(doc(firestoreDb, 'budgets', budgetId));
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    await setDoc(doc(firestoreDb, 'settings', settings.userId), sanitizeForFirestore(settings));
  },

  // ---------------- MIGRATE LOCAL DATA TO FIRESTORE ----------------
  async uploadLocalDataToFirestore(userId: string): Promise<number> {
    if (!firestoreDb) throw new Error('Firestore not ready');
    const storeRaw = localStorage.getItem('wealthtrack_offline_db');
    if (!storeRaw) return 0;

    let count = 0;
    try {
      const store = JSON.parse(storeRaw);
      const accounts = (store.accounts || []).map((a: any) => ({ ...a, userId }));
      const transactions = (store.transactions || []).map((t: any) => ({ ...t, userId }));
      const investments = (store.investments || []).map((i: any) => ({ ...i, userId }));
      const budgets = (store.budgets || []).map((b: any) => ({ ...b, userId }));

      for (const a of accounts) {
        await setDoc(doc(firestoreDb, 'accounts', a.id), sanitizeForFirestore(a));
        count++;
      }
      for (const t of transactions) {
        await setDoc(doc(firestoreDb, 'transactions', t.id), sanitizeForFirestore(t));
        count++;
      }
      for (const i of investments) {
        await setDoc(doc(firestoreDb, 'investments', i.id), sanitizeForFirestore(i));
        count++;
      }
      for (const b of budgets) {
        await setDoc(doc(firestoreDb, 'budgets', b.id), sanitizeForFirestore(b));
        count++;
      }
    } catch (err) {
      console.warn('Migration error:', err);
    }
    return count;
  },
};
