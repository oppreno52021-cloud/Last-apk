import { 
  Expense, 
  Category, 
  Budget, 
  Account, 
  RecurringTransaction, 
  Settings 
} from '../types';

const DB_NAME = 'AuraSpendDB';
const DB_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [];

export const DEFAULT_ACCOUNTS: Account[] = [];

export const DEFAULT_SETTINGS: Settings = {
  currency: 'EGP',
  currencySymbol: 'ج.م',
  language: 'ar',
  theme: 'light',
  fontSize: 'normal',
  numberFormat: 'arabic',
  notifications: true,
  biometricLock: false,
  pinLockEnabled: false,
  passcode: '123456',
  autoLockTimeout: 'immediately',
  privacyBlurEnabled: true,
  autoPrivacyModeOnLaunch: false,
  showWalletsOnHome: false,
  firstDayOfMonth: 1,
  budgetNotificationThreshold: 80,
  hasCompletedOnboarding: true,
  isDemoInitialized: true,
};

function createDefaultBudget(): Budget {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pStart = `${year}-${monthStr}-01`;
  const pEnd = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
  return {
    id: `bgt-${year}-${monthStr}`,
    periodStart: pStart,
    periodEnd: pEnd,
    amount: 0,
    createdAt: `${pStart}T00:00:00Z`,
    updatedAt: `${pStart}T00:00:00Z`,
  };
}

export const DEFAULT_BUDGET: Budget = createDefaultBudget();
export const DEFAULT_RECURRING: RecurringTransaction[] = [];

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Expenses store
        if (!db.objectStoreNames.contains('expenses')) {
          const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
          expenseStore.createIndex('date', 'date', { unique: false });
          expenseStore.createIndex('categoryId', 'categoryId', { unique: false });
          expenseStore.createIndex('accountId', 'accountId', { unique: false });
          expenseStore.createIndex('type', 'type', { unique: false });
          expenseStore.createIndex('isDeleted', 'isDeleted', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const categoryStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoryStore.createIndex('isActive', 'isActive', { unique: false });
          categoryStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          db.createObjectStore('budgets', { keyPath: 'id' });
        }

        // Accounts store
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' });
        }

        // Recurring store
        if (!db.objectStoreNames.contains('recurring')) {
          const recStore = db.createObjectStore('recurring', { keyPath: 'id' });
          recStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        await this.initializeDefaultsIfNeeded();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  private async initializeDefaultsIfNeeded(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      try {
        await navigator.storage.persist();
      } catch {
        // ignore
      }
    }

    const categories = await this.getAll<Category>('categories');
    if (categories.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await this.put('categories', cat);
      }
    }

    const accounts = await this.getAll<Account>('accounts');
    if (accounts.length === 0) {
      for (const acc of DEFAULT_ACCOUNTS) {
        await this.put('accounts', acc);
      }
    }

    const budgets = await this.getAll<Budget>('budgets');
    if (budgets.length === 0) {
      await this.put('budgets', DEFAULT_BUDGET);
    }

    const recurring = await this.getAll<RecurringTransaction>('recurring');
    if (recurring.length === 0) {
      for (const rec of DEFAULT_RECURRING) {
        await this.put('recurring', rec);
      }
    }

    let settings = await this.get<Settings>('settings', 'current');
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS, isDemoInitialized: true };
      await this.put('settings', { ...settings, id: 'current' });
    }

    // Zeroing migration: ensure any previously cached demo transactions or balances are zeroed out completely
    if (typeof localStorage !== 'undefined' && localStorage.getItem('masrofy_zeroed_clean_v2') !== 'true') {
      await this.zeroOutApp();
      try {
        localStorage.setItem('masrofy_zeroed_clean_v2', 'true');
      } catch (e) {
        // ignore
      }
    }

    // Wipe all categories and accounts migration
    if (typeof localStorage !== 'undefined' && localStorage.getItem('masrofy_empty_categories_accounts_v3') !== 'true') {
      await this.clearStore('categories');
      await this.clearStore('accounts');
      try {
        localStorage.setItem('masrofy_empty_categories_accounts_v3', 'true');
      } catch (e) {
        // ignore
      }
    }
  }

  async zeroOutApp(): Promise<void> {
    await this.clearStore('expenses');
    await this.clearStore('recurring');

    const accounts = await this.getAll<Account>('accounts');
    for (const acc of accounts) {
      await this.put('accounts', { ...acc, openingBalance: 0 });
    }

    const budgets = await this.getAll<Budget>('budgets');
    for (const bgt of budgets) {
      await this.put('budgets', { ...bgt, amount: 0 });
    }
  }

  // Generic helpers
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Specific API operations ---

  async getAllExpenses(includeDeleted = false): Promise<Expense[]> {
    const all = await this.getAll<Expense>('expenses');
    return includeDeleted ? all : all.filter(e => !e.isDeleted);
  }

  async getExpenses(includeDeleted = false): Promise<Expense[]> {
    return this.getAllExpenses(includeDeleted);
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const exp = await this.get<Expense>('expenses', id);
    return exp && !exp.isDeleted ? exp : undefined;
  }

  async getExpensesByDateRange(startDate: string, endDate: string, includeDeleted = false): Promise<Expense[]> {
    const all = await this.getAllExpenses(includeDeleted);
    return all.filter(e => e.date >= startDate && e.date <= endDate);
  }

  async getExpensesByCategory(categoryId: string, includeDeleted = false): Promise<Expense[]> {
    const all = await this.getAllExpenses(includeDeleted);
    return all.filter(e => e.categoryId === categoryId);
  }

  async getRecentExpenses(limit = 5): Promise<Expense[]> {
    const all = await this.getAllExpenses(false);
    return all
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .slice(0, limit);
  }

  async searchExpenses(query: string, includeDeleted = false): Promise<Expense[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllExpenses(includeDeleted);
    const all = await this.getAllExpenses(includeDeleted);
    return all.filter(e => 
      e.note.toLowerCase().includes(q) ||
      e.merchant.toLowerCase().includes(q) ||
      e.paymentMethodId.toLowerCase().includes(q)
    );
  }

  async getMonthlyExpenses(yearMonth: string, includeDeleted = false): Promise<Expense[]> {
    const all = await this.getAllExpenses(includeDeleted);
    return all.filter(e => e.date.startsWith(yearMonth));
  }

  async getDailyExpenses(date: string, includeDeleted = false): Promise<Expense[]> {
    const all = await this.getAllExpenses(includeDeleted);
    return all.filter(e => e.date === date);
  }

  async getPaginatedExpenses(options: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    categoryIds?: string[];
    startDate?: string;
    endDate?: string;
    sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
  }): Promise<{ data: Expense[]; total: number; page: number; pageSize: number; totalPages: number; hasMore: boolean }> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.max(1, Math.min(100, options.limit || 20));
    let list = await this.getAllExpenses(false);

    if (options.search?.trim()) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(e => e.note.toLowerCase().includes(q) || e.merchant.toLowerCase().includes(q));
    }
    if (options.type && options.type !== 'all') {
      list = list.filter(e => e.type === options.type);
    }
    if (options.categoryIds && options.categoryIds.length > 0) {
      list = list.filter(e => options.categoryIds!.includes(e.categoryId));
    }
    if (options.startDate) {
      list = list.filter(e => e.date >= options.startDate!);
    }
    if (options.endDate) {
      list = list.filter(e => e.date <= options.endDate!);
    }

    // Sort
    const sortBy = options.sortBy || 'newest';
    list.sort((a, b) => {
      if (sortBy === 'newest') return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
      if (sortBy === 'oldest') return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      if (sortBy === 'highest') return b.amount - a.amount;
      if (sortBy === 'lowest') return a.amount - b.amount;
      return 0;
    });

    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const data = list.slice(startIndex, startIndex + pageSize);
    const hasMore = page < totalPages;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasMore,
    };
  }

  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'> & { id?: string }): Promise<Expense> {
    if (expense.amount <= 0 || isNaN(expense.amount) || !isFinite(expense.amount)) {
      throw new Error('Expense amount must be a positive valid number');
    }
    const cleanAmount = Math.round(expense.amount * 100) / 100;
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      amount: cleanAmount,
      currency: expense.currency || 'EGP',
      paymentMethod: expense.paymentMethod || expense.paymentMethodId || 'acc-card',
      paymentMethodId: expense.paymentMethodId || 'acc-card',
      id: expense.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await this.put('expenses', newExpense);
    return newExpense;
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const existing = await this.get<Expense>('expenses', id);
    if (!existing) throw new Error(`Expense with ID ${id} not found`);
    
    let cleanAmount = existing.amount;
    if (updates.amount !== undefined) {
      if (updates.amount <= 0 || isNaN(updates.amount) || !isFinite(updates.amount)) {
        throw new Error('Expense amount must be a positive valid number');
      }
      cleanAmount = Math.round(updates.amount * 100) / 100;
    }

    const updated: Expense = {
      ...existing,
      ...updates,
      amount: cleanAmount,
      updatedAt: new Date().toISOString(),
    };
    await this.put('expenses', updated);
    return updated;
  }

  async deleteExpense(id: string, soft = true): Promise<void> {
    if (soft) {
      await this.updateExpense(id, { isDeleted: true });
    } else {
      await this.delete('expenses', id);
    }
  }

  async restoreExpense(id: string): Promise<Expense> {
    return await this.updateExpense(id, { isDeleted: false });
  }

  async getCategories(): Promise<Category[]> {
    const categories = await this.getAll<Category>('categories');
    return categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveCategory(category: Category): Promise<void> {
    if (!category.name || !category.name.trim()) {
      throw new Error('Category name cannot be empty');
    }
    const cleanCategory: Category = {
      ...category,
      name: category.name.trim(),
      updatedAt: new Date().toISOString(),
    };
    await this.put('categories', cleanCategory);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.delete('categories', id);
  }

  async getBudget(periodMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`): Promise<Budget | undefined> {
    const budgets = await this.getAll<Budget>('budgets');
    // Isolate by monthly period (e.g. 'YYYY-MM')
    const match = budgets.find(b => b.periodStart.startsWith(periodMonth));
    if (match) return match;
    
    // Fall back to default template budget for this month
    const now = new Date();
    const parts = periodMonth.split('-');
    const year = parseInt(parts[0], 10) || now.getFullYear();
    const month = parseInt(parts[1], 10) || (now.getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return {
      id: `bgt-${periodMonth}`,
      periodStart: `${periodMonth}-01`,
      periodEnd: `${periodMonth}-${String(daysInMonth).padStart(2, '0')}`,
      amount: 20000,
      currency: 'EGP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getAllBudgets(): Promise<Budget[]> {
    return await this.getAll<Budget>('budgets');
  }

  async saveBudget(budget: Budget): Promise<void> {
    await this.put('budgets', {
      ...budget,
      amount: Math.round(budget.amount * 100) / 100,
      updatedAt: new Date().toISOString(),
    });
  }

  async getAccounts(): Promise<Account[]> {
    return await this.getAll<Account>('accounts');
  }

  async saveAccount(account: Account): Promise<void> {
    await this.put('accounts', account);
  }

  async deleteAccount(id: string): Promise<void> {
    await this.delete('accounts', id);
  }

  async updateAccount(id: string, updates: Partial<Account>): Promise<Account> {
    const existing = await this.get<Account>('accounts', id);
    if (!existing) throw new Error('Account not found');
    const updated: Account = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.put('accounts', updated);
    return updated;
  }

  async getRecurring(): Promise<RecurringTransaction[]> {
    return await this.getAll<RecurringTransaction>('recurring');
  }

  async saveRecurring(rec: RecurringTransaction): Promise<void> {
    await this.put('recurring', rec);
  }

  async deleteRecurring(id: string): Promise<void> {
    await this.delete('recurring', id);
  }

  async getSettings(): Promise<Settings> {
    const settings = await this.get<Settings>('settings', 'current');
    return settings || DEFAULT_SETTINGS;
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.put('settings', { ...settings, id: 'current' });
  }

  async clearAllUserData(): Promise<void> {
    await this.clearStore('expenses');
    await this.clearStore('recurring');
  }

  async restoreFullBackup(backup: {
    expenses: Expense[];
    categories: Category[];
    budget?: Budget;
    accounts: Account[];
    recurring: RecurringTransaction[];
    settings?: Settings;
  }): Promise<void> {
    await this.clearStore('expenses');
    await this.clearStore('categories');
    await this.clearStore('budgets');
    await this.clearStore('accounts');
    await this.clearStore('recurring');
    await this.clearStore('settings');

    for (const exp of backup.expenses) {
      await this.put('expenses', exp);
    }
    for (const cat of backup.categories) {
      await this.put('categories', cat);
    }
    if (backup.budget) {
      await this.put('budgets', backup.budget);
    }
    for (const acc of backup.accounts) {
      await this.put('accounts', acc);
    }
    for (const rec of backup.recurring) {
      await this.put('recurring', rec);
    }
    if (backup.settings) {
      await this.put('settings', { ...backup.settings, id: 'current' });
    }
  }

  async resetToEmpty(): Promise<void> {
    await this.zeroOutApp();
  }
}

export const localDB = new LocalDatabase();
