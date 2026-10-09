import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Expense, 
  Category, 
  Budget, 
  Account, 
  AccountSummary,
  RecurringTransaction, 
  Settings, 
  FilterOptions,
  BudgetPace,
  ImportResult,
  FontSizeOption,
  NumberFormatOption
} from '../types';
import { 
  localDB, 
  DEFAULT_BUDGET, 
  DEFAULT_CATEGORIES, 
  DEFAULT_SETTINGS,
  DEFAULT_ACCOUNTS
} from '../db/indexedDB';
import { 
  calculateBudgetPace, 
  calculateAccountSummaries,
  validateAccount,
  validateTransfer,
  calculateNextOccurrence,
  validateBackupJSON,
  exportExpensesToCSV, 
  parseCSVWithAudit, 
  validateCategory, 
  getLocalDateString,
  getLocalTimeString,
  getCurrentMonthPrefix
} from '../utils/calculations';
import { translations, Language, Translations, formatMonthLabel } from '../utils/i18n';
import { exportFile } from '../utils/fileExport';

interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AppContextType {
  // Data
  expenses: Expense[];
  categories: Category[];
  budget: Budget;
  accounts: Account[];
  recurring: RecurringTransaction[];
  settings: Settings;
  isLoading: boolean;

  // Aggregates & Pacing
  budgetPace: BudgetPace;
  frequentCategories: Category[];
  accountSummaries: {
    summaries: AccountSummary[];
    totalNetWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  };
  referenceDate: Date;
  activePeriodLabel: string;

  // Navigation & Modals
  activeTab: 'home' | 'transactions' | 'insights' | 'settings';
  setActiveTab: (tab: 'home' | 'transactions' | 'insights' | 'settings') => void;
  isAddExpenseOpen: boolean;
  openAddExpense: (prefill?: Partial<Expense>) => void;
  closeAddExpense: () => void;
  editingExpense: Expense | null;
  setEditingExpense: (exp: Expense | null) => void;
  viewingExpense: Expense | null;
  setViewingExpense: (exp: Expense | null) => void;
  prefillExpense: Partial<Expense> | null;

  // Filters
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  resetFilters: () => void;
  filteredExpenses: Expense[];

  // CRUD Actions
  createExpense: (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => Promise<Expense>;
  modifyExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  removeExpense: (id: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  updateBudgetAmount: (amount: number) => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  saveCategoryItem: (category: Category) => Promise<void>;
  toggleArchiveCategory: (id: string) => Promise<void>;
  deleteCategoryItem: (id: string) => Promise<void>;
  saveAccountItem: (account: Account) => Promise<void>;
  toggleArchiveAccount: (id: string) => Promise<void>;
  deleteAccountItem: (id: string) => Promise<void>;
  createTransfer: (data: { amount: number; fromAccountId: string; toAccountId: string; note?: string; date?: string; time?: string }) => Promise<Expense>;
  addRecurringItem: (rec: Omit<RecurringTransaction, 'id'>) => Promise<void>;
  saveRecurringItem: (rec: RecurringTransaction) => Promise<void>;
  removeRecurringItem: (id: string) => Promise<void>;
  processRecurringItem: (rec: RecurringTransaction) => Promise<void>;
  clearAllExpenses: () => Promise<void>;
  resetAllData: () => Promise<void>;

  // CSV & Backup
  downloadCSV: () => void;
  importCSVText: (csvText: string) => Promise<ImportResult>;
  downloadFullBackupJSON: () => void;
  importFullBackupJSON: (jsonText: string) => Promise<{ success: boolean; message: string }>;

  // Toast
  toast: ToastState | null;
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: () => void;

  // Preference memory
  lastUsedCategoryId: string;
  lastUsedPaymentMethodId: string;

  // Language & Theme (i18n & Appearance)
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  numberFormat: NumberFormatOption;
  setNumberFormat: (format: NumberFormatOption) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  toggleTheme: () => Promise<void>;
  fontSize: FontSizeOption;
  setFontSize: (size: FontSizeOption) => Promise<void>;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  duplicateExpense: (expense: Expense) => Promise<void>;
  t: Translations;
}

const initialFilters: FilterOptions = {
  search: '',
  type: 'all',
  categoryIds: [],
  paymentMethodIds: [],
  sortBy: 'newest',
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [settings, setSettings] = useState<Settings>(() => {
    let initialTheme: 'light' | 'dark' = 'light';
    let initialLang: 'en' | 'ar' = 'ar';
    let initialFontSize: FontSizeOption = 'normal';
    let initialNumberFormat: NumberFormatOption = 'arabic';
    try {
      const storedTheme = localStorage.getItem('masrofy_theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        initialTheme = storedTheme;
      } else {
        initialTheme = 'light';
      }

      const storedLang = localStorage.getItem('masrofy_lang');
      if (storedLang === 'ar' || storedLang === 'en') {
        initialLang = storedLang;
      } else {
        initialLang = 'ar';
      }
      const storedNumFormat = localStorage.getItem('masrofy_number_format') as NumberFormatOption;
      if (storedNumFormat === 'arabic' || storedNumFormat === 'western') {
        initialNumberFormat = storedNumFormat;
      } else {
        initialNumberFormat = initialLang === 'ar' ? 'arabic' : 'western';
      }
      const storedFontSize = localStorage.getItem('masrofy_font_size') as FontSizeOption;
      if (storedFontSize && ['compact', 'normal', 'large', 'xlarge'].includes(storedFontSize)) {
        initialFontSize = storedFontSize;
      }

      const initialBiometricLock = localStorage.getItem('masrofy_biometric_lock') === 'true';
      const initialPinLock = localStorage.getItem('masrofy_pin_lock') === 'true';

      return {
        ...DEFAULT_SETTINGS,
        theme: initialTheme,
        language: initialLang,
        numberFormat: initialNumberFormat,
        fontSize: initialFontSize,
        biometricLock: initialBiometricLock,
        pinLockEnabled: initialPinLock,
      };
    } catch (e) {}
    return {
      ...DEFAULT_SETTINGS,
      theme: initialTheme,
      language: initialLang,
      numberFormat: initialNumberFormat,
      fontSize: initialFontSize,
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  // Reference date: Dynamic real date for current device/browser
  const referenceDate = useMemo(() => new Date(), []);
  const activePeriodLabel = useMemo(() => {
    return formatMonthLabel(getCurrentMonthPrefix(referenceDate), settings.language === 'ar' ? 'ar' : 'en');
  }, [referenceDate, settings.language]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'insights' | 'settings'>('home');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [prefillExpense, setPrefillExpense] = useState<Partial<Expense> | null>(null);

  // Toast & Undo
  const [toast, setToast] = useState<ToastState | null>(null);
  const [lastDeletedId, setLastDeletedId] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  // Privacy Mode (Hide financial figures)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('masrofy_privacy') === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacyMode = useCallback(() => {
    setIsPrivacyMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('masrofy_privacy', String(next));
      } catch {}
      return next;
    });
  }, []);

  // Last used defaults
  const [lastUsedCategoryId, setLastUsedCategoryId] = useState('cat-general');
  const [lastUsedPaymentMethodId, setLastUsedPaymentMethodId] = useState('acc-cash');

  // Language & Translation setup
  const currentLanguage: Language = settings.language === 'ar' ? 'ar' : 'en';
  const t = useMemo(() => translations[currentLanguage], [currentLanguage]);

  // Reactively sync document direction and language attribute
  useEffect(() => {
    const isAr = settings.language === 'ar';
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = isAr ? 'ar' : 'en';
    try {
      localStorage.setItem('masrofy_lang', isAr ? 'ar' : 'en');
    } catch (e) {}
  }, [settings.language]);

  // Reactively sync HTML dark class and data-theme
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('masrofy_theme', isDark ? 'dark' : 'light');
    } catch (e) {}
  }, [settings.theme]);

  // Reactively sync document data-font-size
  useEffect(() => {
    const size = settings.fontSize || 'normal';
    document.documentElement.setAttribute('data-font-size', size);
    try {
      localStorage.setItem('masrofy_font_size', size);
    } catch (e) {}
  }, [settings.fontSize]);

  // Load initial data from local IndexedDB
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [expList, catList, budgetData, accList, recList, setObj] = await Promise.all([
        localDB.getExpenses(),
        localDB.getCategories(),
        localDB.getBudget(),
        localDB.getAccounts(),
        localDB.getRecurring(),
        localDB.getSettings(),
      ]);

      setExpenses(expList);
      setCategories(catList);
      if (budgetData) setBudget(budgetData);
      const sanitizedAccounts = accList.map(a => (!a.currency || a.currency === 'NONE') ? { ...a, currency: 'EGP' } : a);
      setAccounts(sanitizedAccounts);
      setRecurring(recList);
      if (setObj) {
        let finalSettings = setObj;
        if (!setObj.currency || setObj.currency === 'NONE') {
          finalSettings = { ...setObj, currency: 'EGP', currencySymbol: 'ج.م' };
          localDB.saveSettings(finalSettings);
        }
        setSettings(finalSettings);
      }

      // Restore last used category from most recent expense
      if (expList.length > 0) {
        const sorted = [...expList].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        if (sorted[0]?.categoryId) setLastUsedCategoryId(sorted[0].categoryId);
        if (sorted[0]?.paymentMethodId) setLastUsedPaymentMethodId(sorted[0].paymentMethodId);
      }
    } catch (err) {
      console.error('Failed to load local database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast handler with auto-dismiss - strictly limited to undo notifications per user instruction
  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void) => {
    // Only allow undo action notification (silence all other success/info popups across the app)
    if (!actionLabel || !onAction) {
      return;
    }
    const id = `toast-${Date.now()}`;
    setToast({ id, message, actionLabel, onAction });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (toast) {
      // Exactly 3 seconds display time per user request
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fast Add Expense Modal controls
  const openAddExpense = useCallback((prefill?: Partial<Expense>) => {
    setPrefillExpense(prefill || null);
    setIsAddExpenseOpen(true);
  }, []);

  const closeAddExpense = useCallback(() => {
    setIsAddExpenseOpen(false);
    setPrefillExpense(null);
  }, []);

  // CRUD Operations
  const createExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
    const created = await localDB.addExpense(data);
    setExpenses(prev => [created, ...prev]);
    setLastUsedCategoryId(data.categoryId);
    setLastUsedPaymentMethodId(data.paymentMethodId || 'acc-cash');
    return created;
  }, []);

  const modifyExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    const updated = await localDB.updateExpense(id, updates);
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    if (viewingExpense?.id === id) {
      setViewingExpense(updated);
    }
    return updated;
  }, [viewingExpense]);

  const undoDelete = useCallback(async (targetId?: string) => {
    const idToRestore = targetId || lastDeletedId;
    if (!idToRestore) return;
    try {
      const restored = await localDB.restoreExpense(idToRestore);
      setExpenses(prev => [restored, ...prev.filter(e => e.id !== restored.id)]);
      setLastDeletedId(null);
    } catch (err) {
      console.error('Failed to restore expense', err);
    }
  }, [lastDeletedId]);

  const removeExpense = useCallback(async (id: string) => {
    await localDB.deleteExpense(id, true);
    setLastDeletedId(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (viewingExpense?.id === id) {
      setViewingExpense(null);
    }
    // Only notification kept per user request: undo notification when deleting a transaction
    showToast(
      currentLanguage === 'ar' ? 'تم حذف المعاملة' : 'Expense deleted',
      currentLanguage === 'ar' ? 'تراجع' : 'Undo',
      async () => {
        await undoDelete(id);
      }
    );
  }, [viewingExpense, currentLanguage, showToast, undoDelete]);

  const updateBudgetAmount = useCallback(async (amount: number) => {
    const updatedBudget: Budget = {
      ...budget,
      amount,
      updatedAt: new Date().toISOString(),
    };
    await localDB.saveBudget(updatedBudget);
    setBudget(updatedBudget);
  }, [budget]);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    if ('biometricLock' in newSettings) {
      try {
        localStorage.setItem('masrofy_biometric_lock', String(Boolean(newSettings.biometricLock)));
      } catch {}
    }
    if ('pinLockEnabled' in newSettings) {
      try {
        localStorage.setItem('masrofy_pin_lock', String(Boolean(newSettings.pinLockEnabled)));
      } catch {}
    }
    await localDB.saveSettings(updated);
    setSettings(updated);
  }, [settings]);

  const setLanguage = useCallback(async (lang: Language) => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
    const nextNumFormat: NumberFormatOption = lang === 'ar' ? 'arabic' : 'western';
    try {
      localStorage.setItem('masrofy_lang', lang);
      localStorage.setItem('masrofy_number_format', nextNumFormat);
    } catch (e) {}
    await updateSettings({ language: lang, numberFormat: nextNumFormat });
  }, [updateSettings]);

  const setNumberFormat = useCallback(async (format: NumberFormatOption) => {
    try {
      localStorage.setItem('masrofy_number_format', format);
    } catch (e) {}
    await updateSettings({ numberFormat: format });
  }, [updateSettings]);

  const setCurrency = useCallback(async (currencyCode: string) => {
    await updateSettings({ currency: currencyCode, currencySymbol: currencyCode });
  }, [updateSettings]);

  const setTheme = useCallback(async (newTheme: 'light' | 'dark') => {
    await updateSettings({ theme: newTheme });
  }, [updateSettings]);

  const toggleTheme = useCallback(async () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await updateSettings({ theme: nextTheme });
  }, [settings.theme, updateSettings]);

  const setFontSize = useCallback(async (size: FontSizeOption) => {
    await updateSettings({ fontSize: size });
  }, [updateSettings]);

  const saveCategoryItem = useCallback(async (category: Category) => {
    const val = validateCategory(category.name, categories, category.id);
    if (!val.valid) {
      const errMsg = currentLanguage === 'ar'
        ? (val.error?.includes('already exists') ? `الفئة "${category.name.trim()}" موجودة بالفعل.` : val.error || 'اسم الفئة غير صالح.')
        : val.error || 'Invalid category name';
      showToast(errMsg);
      throw new Error(errMsg);
    }
    const cleanCategory = { ...category, name: val.trimmedName };
    await localDB.saveCategory(cleanCategory);
    setCategories(prev => {
      const exists = prev.some(c => c.id === cleanCategory.id);
      if (exists) {
        return prev.map(c => c.id === cleanCategory.id ? cleanCategory : c);
      }
      return [...prev, cleanCategory];
    });
  }, [categories, currentLanguage, showToast]);

  const toggleArchiveCategory = useCallback(async (id: string) => {
    const existing = categories.find(c => c.id === id);
    if (!existing) return;
    const updated: Category = {
      ...existing,
      isActive: !existing.isActive,
      updatedAt: new Date().toISOString(),
    };
    await localDB.saveCategory(updated);
    setCategories(prev => prev.map(c => c.id === id ? updated : c));
  }, [categories]);

  const deleteCategoryItem = useCallback(async (id: string) => {
    const target = categories.find(c => c.id === id);
    if (!target) return;

    try {
      // Reassign any transactions referencing this category to fallback
      const isIncomeCat = target.type === 'income' || target.id.startsWith('cat-inc-');
      const fallbackId = isIncomeCat ? 'cat-inc-other' : 'cat-other';

      const affected = expenses.filter(e => e.categoryId === id);
      for (const exp of affected) {
        await localDB.updateExpense(exp.id, { categoryId: fallbackId });
      }
      if (affected.length > 0) {
        setExpenses(prev => prev.map(e => e.categoryId === id ? { ...e, categoryId: fallbackId } : e));
      }

      await localDB.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Failed to delete category:', err);
    }
  }, [categories, expenses]);

  // Account Management & Multi-Wallet actions
  const saveAccountItem = useCallback(async (account: Account) => {
    const val = validateAccount(account, accounts, account.id);
    if (!val.valid) {
      const errMsg = currentLanguage === 'ar'
        ? (val.error?.includes('already exists') ? `الحساب "${account.name.trim()}" موجود بالفعل.` : val.error || 'اسم الحساب غير صالح.')
        : val.error || 'Invalid account name.';
      showToast(errMsg);
      throw new Error(errMsg);
    }
    const cleanAccount: Account = {
      ...account,
      name: account.name.trim(),
      updatedAt: new Date().toISOString(),
    };
    await localDB.saveAccount(cleanAccount);
    setAccounts(prev => {
      const exists = prev.some(a => a.id === cleanAccount.id);
      if (exists) {
        return prev.map(a => a.id === cleanAccount.id ? cleanAccount : a);
      }
      return [...prev, cleanAccount];
    });
  }, [accounts, currentLanguage, showToast]);

  const toggleArchiveAccount = useCallback(async (id: string) => {
    const existing = accounts.find(a => a.id === id);
    if (!existing) return;
    const updated: Account = {
      ...existing,
      isActive: !existing.isActive,
      isArchived: existing.isActive, // If active, now archived
      updatedAt: new Date().toISOString(),
    };
    await localDB.saveAccount(updated);
    setAccounts(prev => prev.map(a => a.id === id ? updated : a));
  }, [accounts]);

  const deleteAccountItem = useCallback(async (id: string) => {
    if (accounts.length <= 1) {
      showToast(
        currentLanguage === 'ar' ? 'لا يمكن حذف المحفظة الوحيدة المتبقية' : 'Cannot delete the only remaining wallet'
      );
      return;
    }

    try {
      const fallbackAccount = accounts.find(a => a.id !== id);
      const fallbackId = fallbackAccount?.id || 'acc-cash';

      // Reassign transactions pointing to this account to remaining account
      const affected = expenses.filter(e => 
        e.accountId === id || 
        e.paymentMethodId === id ||
        e.fromAccountId === id ||
        e.toAccountId === id
      );
      for (const exp of affected) {
        await localDB.updateExpense(exp.id, { 
          accountId: exp.accountId === id ? fallbackId : exp.accountId,
          paymentMethodId: exp.paymentMethodId === id ? fallbackId : exp.paymentMethodId,
          fromAccountId: exp.fromAccountId === id ? fallbackId : exp.fromAccountId,
          toAccountId: exp.toAccountId === id ? fallbackId : exp.toAccountId,
        });
      }
      if (affected.length > 0) {
        setExpenses(prev => prev.map(e => ({
          ...e,
          accountId: e.accountId === id ? fallbackId : e.accountId,
          paymentMethodId: e.paymentMethodId === id ? fallbackId : e.paymentMethodId,
          fromAccountId: e.fromAccountId === id ? fallbackId : e.fromAccountId,
          toAccountId: e.toAccountId === id ? fallbackId : e.toAccountId,
        })));
      }

      await localDB.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      console.error('Failed to delete account:', err);
    }
  }, [accounts, expenses]);

  const createTransfer = useCallback(async (data: {
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    note?: string;
    date?: string;
    time?: string;
  }) => {
    const val = validateTransfer(data, accounts);
    if (!val.valid) {
      throw new Error(val.error);
    }
    const fromAcc = accounts.find(a => a.id === data.fromAccountId);
    const toAcc = accounts.find(a => a.id === data.toAccountId);
    const fromName = fromAcc?.name || 'Account';
    const toName = toAcc?.name || 'Account';

    const cleanAmount = Math.round(data.amount * 100) / 100;
    const transferTx = await localDB.addExpense({
      type: 'transfer',
      amount: cleanAmount,
      categoryId: 'cat-other',
      accountId: data.fromAccountId,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      paymentMethodId: data.fromAccountId,
      note: data.note?.trim() || `${fromName} → ${toName}`,
      merchant: `Transfer: ${fromName} → ${toName}`,
      date: data.date || getLocalDateString(),
      time: data.time || getLocalTimeString(),
    });
    setExpenses(prev => [transferTx, ...prev]);
    return transferTx;
  }, [accounts]);

  const addRecurringItem = useCallback(async (rec: Omit<RecurringTransaction, 'id'>) => {
    const id = `rec-${Date.now()}`;
    const item: RecurringTransaction = { ...rec, id };
    await localDB.saveRecurring(item);
    setRecurring(prev => [...prev, item]);
  }, []);

  const saveRecurringItem = useCallback(async (rec: RecurringTransaction) => {
    await localDB.saveRecurring(rec);
    setRecurring(prev => {
      const idx = prev.findIndex(r => r.id === rec.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = rec;
        return copy;
      }
      return [...prev, rec];
    });
  }, []);

  const removeRecurringItem = useCallback(async (id: string) => {
    await localDB.deleteRecurring(id);
    setRecurring(prev => prev.filter(r => r.id !== id));
  }, []);

  const processRecurringItem = useCallback(async (rec: RecurringTransaction) => {
    const todayStr = getLocalDateString(referenceDate);

    // Duplicate protection: prevent double recording if processed for today
    const alreadyProcessedToday = expenses.some(
      e => !e.isDeleted &&
           e.date === todayStr &&
           Math.abs(e.amount - rec.amount) < 0.001 &&
           e.categoryId === rec.categoryId &&
           e.note.toLowerCase().includes(rec.note.toLowerCase())
    );

    if (alreadyProcessedToday) {
      return;
    }

    await createExpense({
      type: rec.type,
      amount: rec.amount,
      categoryId: rec.categoryId,
      accountId: rec.accountId || 'acc-card',
      paymentMethodId: rec.accountId || 'acc-card',
      note: `${rec.note} (Recurring)`,
      merchant: rec.note,
      date: todayStr,
      time: '09:00',
    });

    const nextOccurrence = calculateNextOccurrence(rec.nextOccurrence || todayStr, rec.frequency);
    const updatedRec: RecurringTransaction = {
      ...rec,
      lastProcessedDate: todayStr,
      nextOccurrence,
    };
    await localDB.saveRecurring(updatedRec);
    setRecurring(prev => prev.map(r => r.id === rec.id ? updatedRec : r));
  }, [createExpense, expenses, referenceDate]);

  const duplicateExpense = useCallback(async (expense: Expense) => {
    const todayStr = getLocalDateString(referenceDate);
    const timeStr = getLocalTimeString(referenceDate);
    await createExpense({
      type: expense.type,
      amount: expense.amount,
      categoryId: expense.categoryId,
      accountId: expense.accountId || 'acc-card',
      fromAccountId: expense.fromAccountId,
      toAccountId: expense.toAccountId,
      paymentMethodId: expense.paymentMethodId || 'acc-card',
      note: expense.note,
      merchant: expense.merchant,
      date: todayStr,
      time: timeStr,
    });
    showToast(currentLanguage === 'ar' ? 'تم تكرار المعاملة بنجاح' : 'Expense duplicated');
  }, [createExpense, referenceDate, currentLanguage, showToast]);

  const clearAllExpenses = useCallback(async () => {
    await localDB.clearAllUserData();
    await loadData();
    showToast('All transaction records cleared');
  }, [loadData, showToast]);

  // CSV Export & Import
  const downloadCSV = useCallback(async () => {
    try {
      const csvContent = exportExpensesToCSV(expenses, categories, settings.currency, accounts);
      const filename = `Masrofy_Ledger_${getLocalDateString(referenceDate)}.csv`;
      const result = await exportFile({
        filename,
        content: csvContent,
        mimeType: 'text/csv',
      });

      if (result.canceled) return;

      if (result.success) {
        showToast(currentLanguage === 'ar' ? 'تم حفظ ملف الإكسل (CSV) بنجاح' : 'CSV file saved successfully');
      } else {
        showToast(currentLanguage === 'ar' ? 'حدث خطأ أثناء حفظ الملف' : 'Error saving file');
      }
    } catch (err: any) {
      console.error(err);
      showToast(currentLanguage === 'ar' ? 'حدث خطأ أثناء تنزيل الملف' : 'Error downloading file');
    }
  }, [expenses, categories, settings.currency, accounts, referenceDate, currentLanguage, showToast]);

  const importCSVText = useCallback(async (csvText: string) => {
    try {
      const { items, result } = parseCSVWithAudit(csvText, categories, expenses, accounts);
      if (items.length === 0 && result.errors > 0) {
        showToast(currentLanguage === 'ar' ? 'لم يتم العثور على معاملات صالحة في ملف CSV' : (result.details[0] || 'No valid transactions found in CSV'));
        return result;
      }

      for (const item of items) {
        await localDB.addExpense({
          type: item.type || 'expense',
          amount: item.amount || 0,
          categoryId: item.categoryId || 'cat-other',
          accountId: item.accountId || 'acc-cash',
          fromAccountId: item.fromAccountId,
          toAccountId: item.toAccountId,
          paymentMethodId: item.paymentMethodId || 'acc-cash',
          note: item.note || '',
          merchant: item.merchant || '',
          date: item.date || getLocalDateString(referenceDate),
          time: item.time || '12:00',
        });
      }

      await loadData();
      let msg = currentLanguage === 'ar' 
        ? `تم استيراد ${result.imported} معاملة بنجاح` 
        : `Imported ${result.imported} transactions`;
      if (result.skipped > 0) {
        msg += currentLanguage === 'ar' ? ` (تخطي ${result.skipped} مكررة)` : ` (${result.skipped} duplicates skipped)`;
      }
      showToast(msg);
      return result;
    } catch (err: any) {
      console.error(err);
      showToast(currentLanguage === 'ar' ? 'تعذر استيراد الملف' : 'Failed to import CSV');
      return { imported: 0, skipped: 0, errors: 1, details: [err?.message || 'Error'] };
    }
  }, [categories, expenses, accounts, referenceDate, currentLanguage, loadData, showToast]);

  // Full JSON Backup & Restore
  const downloadFullBackupJSON = useCallback(async () => {
    try {
      const backupData = {
        version: 1,
        app: 'Masrofy',
        exportedAt: new Date().toISOString(),
        expenses,
        categories,
        budget,
        accounts,
        recurring,
        settings,
      };
      const jsonContent = JSON.stringify(backupData, null, 2);
      const filename = `Masrofy_Backup_${getLocalDateString(referenceDate)}.json`;
      const result = await exportFile({
        filename,
        content: jsonContent,
        mimeType: 'application/json',
      });

      if (result.canceled) return;

      if (result.success) {
        showToast(currentLanguage === 'ar' ? 'تم حفظ النسخة الاحتياطية (JSON) بنجاح' : 'Backup saved successfully');
      } else {
        showToast(currentLanguage === 'ar' ? 'حدث خطأ أثناء حفظ النسخة الاحتياطية' : 'Error saving backup');
      }
    } catch (err: any) {
      console.error(err);
      showToast(currentLanguage === 'ar' ? 'حدث خطأ أثناء تنزيل النسخة الاحتياطية' : 'Error downloading backup');
    }
  }, [expenses, categories, budget, accounts, recurring, settings, referenceDate, currentLanguage, showToast]);

  const importFullBackupJSON = useCallback(async (jsonText: string) => {
    const validation = validateBackupJSON(jsonText);
    if (!validation.valid || !validation.data) {
      const msg = validation.error || (currentLanguage === 'ar' ? 'ملف النسخة الاحتياطية غير صالح' : 'Invalid backup file structure');
      showToast(msg);
      return { success: false, message: msg };
    }

    try {
      await localDB.restoreFullBackup(validation.data);
      await loadData();
      showToast(currentLanguage === 'ar' ? 'تمت استعادة النسخة الاحتياطية بنجاح' : 'Full backup restored successfully');
      return { success: true, message: 'Restored successfully' };
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || (currentLanguage === 'ar' ? 'فشلت استعادة النسخة الاحتياطية' : 'Failed to restore backup');
      showToast(msg);
      return { success: false, message: msg };
    }
  }, [loadData, currentLanguage, showToast]);

  const resetAllData = useCallback(async () => {
    await localDB.restoreFullBackup({
      expenses: [],
      categories: DEFAULT_CATEGORIES,
      budget: DEFAULT_BUDGET,
      accounts: DEFAULT_ACCOUNTS,
      recurring: [],
      settings: DEFAULT_SETTINGS,
    });
    setExpenses([]);
    setCategories(DEFAULT_CATEGORIES);
    setBudget(DEFAULT_BUDGET);
    setAccounts(DEFAULT_ACCOUNTS);
    setRecurring([]);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Calculate Budget Pace & Intelligence
  const budgetPace = useMemo(() => {
    return calculateBudgetPace(expenses, budget, referenceDate);
  }, [expenses, budget, referenceDate]);

  // Frequently used categories calculated from real counts
  const frequentCategories = useMemo(() => {
    const countMap: Record<string, number> = {};
    expenses.forEach(e => {
      if (!e.isDeleted) {
        countMap[e.categoryId] = (countMap[e.categoryId] || 0) + 1;
      }
    });
    return [...categories]
      .filter(c => c.isActive)
      .sort((a, b) => (countMap[b.id] || 0) - (countMap[a.id] || 0));
  }, [expenses, categories]);

  // Account Summaries & Multi-Wallet Financial Engine (Phase 5)
  const accountSummaries = useMemo(() => {
    return calculateAccountSummaries(accounts, expenses);
  }, [accounts, expenses]);

  // Filter & Search Engine
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => !e.isDeleted);

    // Search query
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const catMap = new Map(categories.map(c => [c.id, c.name.toLowerCase()]));
      const accMap = new Map(accounts.map(a => [a.id, a.name.toLowerCase()]));
      list = list.filter(e => {
        const catName = catMap.get(e.categoryId) || '';
        const accName = accMap.get(e.accountId || '') || '';
        const fromAccName = accMap.get(e.fromAccountId || '') || '';
        const toAccName = accMap.get(e.toAccountId || '') || '';
        return (
          e.note.toLowerCase().includes(q) ||
          e.merchant.toLowerCase().includes(q) ||
          catName.includes(q) ||
          accName.includes(q) ||
          fromAccName.includes(q) ||
          toAccName.includes(q) ||
          e.paymentMethodId.toLowerCase().includes(q) ||
          (e.type === 'transfer' && 'transfer'.includes(q))
        );
      });
    }

    // Type filter
    if (filters.type !== 'all') {
      list = list.filter(e => e.type === filters.type);
    }

    // Category filter
    if (filters.categoryIds.length > 0) {
      list = list.filter(e => filters.categoryIds.includes(e.categoryId));
    }

    // Payment method & Account filter
    if (filters.paymentMethodIds.length > 0) {
      list = list.filter(e => 
        filters.paymentMethodIds.includes(e.paymentMethodId) ||
        filters.paymentMethodIds.includes(e.accountId) ||
        (e.fromAccountId && filters.paymentMethodIds.includes(e.fromAccountId)) ||
        (e.toAccountId && filters.paymentMethodIds.includes(e.toAccountId))
      );
    }

    if (filters.accountIds && filters.accountIds.length > 0) {
      list = list.filter(e => 
        filters.accountIds!.includes(e.accountId) ||
        filters.accountIds!.includes(e.paymentMethodId) ||
        (e.fromAccountId && filters.accountIds!.includes(e.fromAccountId)) ||
        (e.toAccountId && filters.accountIds!.includes(e.toAccountId))
      );
    }

    // Date range
    if (filters.startDate) {
      list = list.filter(e => e.date >= filters.startDate!);
    }
    if (filters.endDate) {
      list = list.filter(e => e.date <= filters.endDate!);
    }

    // Min & Max amount
    if (filters.minAmount !== undefined && filters.minAmount > 0) {
      list = list.filter(e => e.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined && filters.maxAmount > 0) {
      list = list.filter(e => e.amount <= filters.maxAmount!);
    }

    // Sorting
    list.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`);
      }
      if (filters.sortBy === 'oldest') {
        return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
      }
      if (filters.sortBy === 'highest') {
        return b.amount - a.amount;
      }
      if (filters.sortBy === 'lowest') {
        return a.amount - b.amount;
      }
      return 0;
    });

    return list;
  }, [expenses, categories, accounts, filters]);

  return (
    <AppContext.Provider
      value={{
        expenses,
        categories,
        budget,
        accounts,
        recurring,
        settings,
        isLoading,
        budgetPace,
        frequentCategories,
        accountSummaries,
        referenceDate,
        activePeriodLabel,
        activeTab,
        setActiveTab,
        isAddExpenseOpen,
        openAddExpense,
        closeAddExpense,
        editingExpense,
        setEditingExpense,
        viewingExpense,
        setViewingExpense,
        prefillExpense,
        filters,
        setFilters,
        resetFilters,
        filteredExpenses,
        createExpense,
        modifyExpense,
        removeExpense,
        undoDelete,
        updateBudgetAmount,
        updateSettings,
        saveCategoryItem,
        toggleArchiveCategory,
        deleteCategoryItem,
        saveAccountItem,
        toggleArchiveAccount,
        deleteAccountItem,
        createTransfer,
        addRecurringItem,
        saveRecurringItem,
        removeRecurringItem,
        processRecurringItem,
        clearAllExpenses,
        resetAllData,
        downloadCSV,
        importCSVText,
        downloadFullBackupJSON,
        importFullBackupJSON,
        toast,
        showToast,
        dismissToast,
        lastUsedCategoryId,
        lastUsedPaymentMethodId,
        language: currentLanguage,
        setLanguage,
        numberFormat: settings.numberFormat || (currentLanguage === 'ar' ? 'arabic' : 'western'),
        setNumberFormat,
        setCurrency,
        theme: (settings.theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark',
        setTheme,
        toggleTheme,
        fontSize: settings.fontSize || 'normal',
        setFontSize,
        isPrivacyMode,
        togglePrivacyMode,
        duplicateExpense,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
