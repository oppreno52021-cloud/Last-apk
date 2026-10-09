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
  hasCompletedOnboarding: false,
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

  async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : (typeof window !== 'undefined' ? window.indexedDB : null);
      if (!idb) {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = idb.open(DB_NAME, DB_VERSION);

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
        try {
          await this.initializeDefaultsIfNeeded();
        } catch (initErr) {
          console.warn('Non-destructive initialization check warning:', initErr);
        }
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

    // Safely check existing data across stores without any destructive actions
    const [existingExpenses, existingAccounts, existingCategories, existingBudgets, existingRecurring] = await Promise.all([
      this.getAll<Expense>('expenses'),
      this.getAll<Account>('accounts'),
      this.getAll<Category>('categories'),
      this.getAll<Budget>('budgets'),
      this.getAll<RecurringTransaction>('recurring'),
    ]);

    // Check existing settings
    let settings = await this.get<Settings>('settings', 'current');
    if (!settings) {
      // If there are already records, this is an existing database from previous versions or an upgrade
      const isExistingUser = existingExpenses.length > 0 || 
                             existingAccounts.length > 0 || 
                             existingCategories.length > 0 || 
                             existingBudgets.some(b => b.amount > 0) || 
                             existingRecurring.length > 0;
      settings = {
        ...DEFAULT_SETTINGS,
        hasCompletedOnboarding: isExistingUser,
        isDemoInitialized: true,
      };
      await this.put('settings', { ...settings, id: 'current' });
    }

    // Initialize budget only if completely missing
    if (existingBudgets.length === 0) {
      await this.put('budgets', DEFAULT_BUDGET);
    }
  }

  /**
   * Reset application data to empty state.
   * STRICT SAFETY RULE: Must ONLY be called upon explicit, confirmed user reset action from Settings.
   * NEVER call this automatically on startup, upgrade, or missing metadata.
   */
  async zeroOutApp(): Promise<void> {
    const db = await this.openDB();
    const storeNames = ['expenses', 'recurring', 'accounts', 'budgets'];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      try {
        tx.objectStore('expenses').clear();
        tx.objectStore('recurring').clear();

        const accStore = tx.objectStore('accounts');
        const accReq = accStore.openCursor();
        accReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.update({ ...cursor.value, openingBalance: 0 });
            cursor.continue();
          }
        };

        const bgtStore = tx.objectStore('budgets');
        const bgtReq = bgtStore.openCursor();
        bgtReq.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.update({ ...cursor.value, amount: 0 });
            cursor.continue();
          }
        };
      } catch (err) {
        try { tx.abort(); } catch (_) {}
        reject(err);
      }
    });
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
    if (!backup || !Array.isArray(backup.expenses) || !Array.isArray(backup.categories) || !Array.isArray(backup.accounts) || !Array.isArray(backup.recurring)) {
      throw new Error('بيانات النسخة الاحتياطية غير صالحة ولا تحتوي على المجموعات الإلزامية');
    }

    const db = await this.openDB();
    const storeNames = ['expenses', 'categories', 'budgets', 'accounts', 'recurring', 'settings'];

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const tx = db.transaction(storeNames, 'readwrite');

      tx.onerror = (event) => {
        if (!isSettled) {
          isSettled = true;
          const err = (event.target as IDBTransaction)?.error || tx.error;
          reject(new Error(err?.message || 'فشلت عملية استعادة النسخة الاحتياطية أثناء كتابة البيانات'));
        }
      };

      tx.onabort = (event) => {
        if (!isSettled) {
          isSettled = true;
          const err = (event.target as IDBTransaction)?.error || tx.error;
          reject(new Error(err?.message || 'تم التراجع عن استعادة النسخة الاحتياطية للحفاظ على البيانات الأصلية'));
        }
      };

      tx.oncomplete = () => {
        if (!isSettled) {
          isSettled = true;
          resolve();
        }
      };

      try {
        const expStore = tx.objectStore('expenses');
        const catStore = tx.objectStore('categories');
        const bgtStore = tx.objectStore('budgets');
        const accStore = tx.objectStore('accounts');
        const recStore = tx.objectStore('recurring');
        const setStore = tx.objectStore('settings');

        // Clear existing data atomically inside this single transaction
        expStore.clear();
        catStore.clear();
        bgtStore.clear();
        accStore.clear();
        recStore.clear();
        setStore.clear();

        // Populate validated backup records
        for (const exp of backup.expenses) {
          expStore.put(exp);
        }
        for (const cat of backup.categories) {
          catStore.put(cat);
        }
        if (backup.budget) {
          bgtStore.put(backup.budget);
        }
        for (const acc of backup.accounts) {
          accStore.put(acc);
        }
        for (const rec of backup.recurring) {
          recStore.put(rec);
        }
        if (backup.settings) {
          setStore.put({ ...backup.settings, id: 'current' });
        }
      } catch (err) {
        try {
          tx.abort();
        } catch (_) {}
        if (!isSettled) {
          isSettled = true;
          reject(err);
        }
      }
    });
  }

  async resetToEmpty(): Promise<void> {
    await this.zeroOutApp();
  }
}

export const localDB = new LocalDatabase();
