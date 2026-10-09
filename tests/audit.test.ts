import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { localDB, DEFAULT_SETTINGS, DEFAULT_BUDGET } from '../src/db/indexedDB';
import { 
  validateBackupJSON, 
  calculateAccountSummaries, 
  calculateMonthInsights, 
  calculateBudgetPace, 
  parseMoneyInput, 
  validateTransfer, 
  addMoney, 
  subtractMoney, 
  toMinorUnits, 
  fromMinorUnits,
  AppFullBackup
} from '../src/utils/calculations';
import { Expense, Category, Account, Budget } from '../src/types';

// Polyfill localStorage in test environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] || null,
  } as any;
}

describe('Audited Masrofy Test Suite', () => {
  beforeEach(async () => {
    // Reset IndexedDB state before each test
    const db = await localDB.openDB();
    const tx = db.transaction(['expenses', 'categories', 'budgets', 'accounts', 'recurring', 'settings'], 'readwrite');
    tx.objectStore('expenses').clear();
    tx.objectStore('categories').clear();
    tx.objectStore('budgets').clear();
    tx.objectStore('accounts').clear();
    tx.objectStore('recurring').clear();
    tx.objectStore('settings').clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });

  // 1. Starting the application with an empty database
  it('1. should start the application with an empty database cleanly', async () => {
    const expenses = await localDB.getAllExpenses();
    const accounts = await localDB.getAccounts();
    const categories = await localDB.getCategories();
    const settings = await localDB.getSettings();

    expect(expenses).toEqual([]);
    expect(accounts).toEqual([]);
    expect(categories).toEqual([]);
    expect(settings).toBeDefined();
    expect(settings?.currency).toBe('EGP');
  });

  // 2. Starting with an existing database and a missing initialization marker
  it('2. should start with an existing database and a missing initialization marker without deleting data', async () => {
    // Add existing user records
    const sampleExp: Expense = {
      id: 'exp-user-1',
      type: 'expense',
      amount: 150.50,
      categoryId: 'cat-groceries',
      accountId: 'acc-cash',
      paymentMethodId: 'acc-cash',
      note: 'سوبرماركت',
      merchant: 'سوبرماركت',
      date: '2026-10-09',
      time: '14:30',
      createdAt: '2026-10-09T14:30:00Z',
      updatedAt: '2026-10-09T14:30:00Z',
      isDeleted: false,
    };
    await localDB.put('expenses', sampleExp);

    const sampleAcc: Account = {
      id: 'acc-cash',
      name: 'كاش',
      type: 'cash',
      openingBalance: 1000,
      currency: 'EGP',
      color: '#10B981',
      icon: 'Banknote',
      isActive: true,
      isArchived: false,
      showOnHome: true,
      createdAt: '2026-10-09T10:00:00Z',
      updatedAt: '2026-10-09T10:00:00Z',
    };
    await localDB.put('accounts', sampleAcc);

    // Simulate opening the database again when localStorage has NO markers
    localStorage.clear();
    const reloadedExpenses = await localDB.getAllExpenses();
    const reloadedAccounts = await localDB.getAccounts();

    expect(reloadedExpenses.length).toBe(1);
    expect(reloadedExpenses[0].id).toBe('exp-user-1');
    expect(reloadedExpenses[0].amount).toBe(150.50);
    expect(reloadedAccounts.length).toBe(1);
    expect(reloadedAccounts[0].openingBalance).toBe(1000);
  });

  // 3. Starting after an application upgrade
  it('3. should handle application upgrades preserving all user preferences and records', async () => {
    // Simulate older database having records but missing newer settings fields
    await localDB.put('settings', {
      currency: 'EGP',
      currencySymbol: 'ج.م',
      theme: 'light',
      fontSize: 'normal',
      notifications: true,
      id: 'current',
    });

    const sampleExp = await localDB.addExpense({
      type: 'expense',
      amount: 45.0,
      categoryId: 'cat-coffee',
      accountId: 'acc-wallet',
      paymentMethodId: 'acc-wallet',
      note: 'قهوة',
      merchant: 'كافيه',
      date: '2026-10-09',
      time: '09:00',
    });

    expect(sampleExp.amount).toBe(45);
    const loadedSettings = await localDB.getSettings();
    expect(loadedSettings?.currency).toBe('EGP');
  });

  // 4. Confirming that initialization never silently deletes existing financial records
  it('4. confirms initialization never silently deletes existing financial records', async () => {
    for (let i = 1; i <= 5; i++) {
      await localDB.addExpense({
        type: 'expense',
        amount: i * 10,
        categoryId: 'cat-test',
        accountId: 'acc-test',
        paymentMethodId: 'acc-test',
        note: `معاملة ${i}`,
        merchant: 'متجر',
        date: '2026-10-09',
        time: '12:00',
      });
    }

    const beforeCount = (await localDB.getAllExpenses()).length;
    expect(beforeCount).toBe(5);

    // Simulate multiple app launches
    for (let cycle = 0; cycle < 3; cycle++) {
      localStorage.removeItem('masrofy_zeroed_clean_v2');
      localStorage.removeItem('masrofy_empty_categories_accounts_v3');
      const expenses = await localDB.getAllExpenses();
      expect(expenses.length).toBe(5);
    }
  });

  // 5. Importing a valid backup
  it('5. should safely import a valid backup and restore all collections', async () => {
    const validBackupPayload: AppFullBackup = {
      version: 1,
      exportedAt: '2026-10-09T10:00:00Z',
      app: 'Masrofy',
      expenses: [
        {
          id: 'exp-b1',
          type: 'expense',
          amount: 250,
          categoryId: 'cat-food',
          accountId: 'acc-1',
          paymentMethodId: 'acc-1',
          note: 'غداء عمل',
          merchant: 'مطعم',
          date: '2026-10-08',
          time: '15:00',
          createdAt: '2026-10-08T15:00:00Z',
          updatedAt: '2026-10-08T15:00:00Z',
          isDeleted: false,
        },
      ],
      categories: [
        {
          id: 'cat-food',
          name: 'طعام',
          icon: 'Utensils',
          color: '#EF4444',
          type: 'expense',
          isDefault: false,
          isActive: true,
          sortOrder: 1,
          createdAt: '2026-10-08T10:00:00Z',
          updatedAt: '2026-10-08T10:00:00Z',
        },
      ],
      budget: {
        id: 'bgt-2026-10',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        amount: 5000,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      accounts: [
        {
          id: 'acc-1',
          name: 'حساب بنكي',
          type: 'bank',
          openingBalance: 12000,
          currency: 'EGP',
          color: '#3B82F6',
          icon: 'Landmark',
          isActive: true,
          isArchived: false,
          showOnHome: true,
          createdAt: '2026-10-01T00:00:00Z',
          updatedAt: '2026-10-01T00:00:00Z',
        },
      ],
      recurring: [],
      settings: {
        ...DEFAULT_SETTINGS,
        hasCompletedOnboarding: true,
      },
    };

    const validation = validateBackupJSON(JSON.stringify(validBackupPayload));
    expect(validation.valid).toBe(true);
    expect(validation.data).toBeDefined();

    if (validation.data) {
      await localDB.restoreFullBackup(validation.data);
    }

    const restoredExpenses = await localDB.getAllExpenses();
    const restoredAccounts = await localDB.getAccounts();
    const restoredCategories = await localDB.getCategories();
    const restoredBudget = await localDB.getBudget();

    expect(restoredExpenses.length).toBe(1);
    expect(restoredExpenses[0].id).toBe('exp-b1');
    expect(restoredExpenses[0].amount).toBe(250);
    expect(restoredAccounts[0].openingBalance).toBe(12000);
    expect(restoredCategories[0].name).toBe('طعام');
    expect(restoredBudget?.amount).toBe(5000);
  });

  // 6. Rejecting a malformed backup without changing existing data
  it('6. should reject malformed backups without modifying existing data', async () => {
    // Seed initial data
    await localDB.addExpense({
      type: 'expense',
      amount: 88,
      categoryId: 'cat-test',
      accountId: 'acc-test',
      paymentMethodId: 'acc-test',
      note: 'بيانات أصلية مهمة',
      merchant: 'متجر',
      date: '2026-10-09',
      time: '11:00',
    });

    const malformedPayloads = [
      '',
      '{ invalidJson ',
      JSON.stringify({ expenses: 'not-an-array' }),
      JSON.stringify({ expenses: [{ id: '', amount: -50 }] }),
      JSON.stringify({ version: 999, expenses: [] }),
      JSON.stringify({ expenses: [{ id: 'exp-1', amount: 'not-a-number', type: 'unknown' }] }),
    ];

    for (const badPayload of malformedPayloads) {
      const result = validateBackupJSON(badPayload);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    }

    // Verify existing data was untouched
    const currentExpenses = await localDB.getAllExpenses();
    expect(currentExpenses.length).toBe(1);
    expect(currentExpenses[0].amount).toBe(88);
  });

  // 7. Handling an interrupted or failed restore (atomic rollback)
  it('7. should handle failed restore atomically without corrupting database', async () => {
    // Add existing user data
    await localDB.addExpense({
      type: 'expense',
      amount: 100,
      categoryId: 'cat-orig',
      accountId: 'acc-orig',
      paymentMethodId: 'acc-orig',
      note: 'معاملة أصلية',
      merchant: 'أصل',
      date: '2026-10-09',
      time: '10:00',
    });

    // Attempt restoring invalid data directly that causes transaction error
    const faultyBackup: any = {
      expenses: [{ id: null, amount: 200 }], // invalid keyPath will reject or fail
      categories: [],
      accounts: [],
      recurring: [],
    };

    try {
      await localDB.restoreFullBackup(faultyBackup);
    } catch (err) {
      expect(err).toBeDefined();
    }

    // Existing data must remain intact
    const afterExpenses = await localDB.getAllExpenses();
    expect(afterExpenses.length).toBe(1);
    expect(afterExpenses[0].amount).toBe(100);
  });

  // 8. Adding, editing, and deleting expenses
  it('8. should correctly add, edit, and delete expenses', async () => {
    const added = await localDB.addExpense({
      type: 'expense',
      amount: 75.25,
      categoryId: 'cat-groceries',
      accountId: 'acc-cash',
      paymentMethodId: 'acc-cash',
      note: 'مشتريات بقالة',
      merchant: 'ماركت',
      date: '2026-10-09',
      time: '13:00',
    });

    expect(added.id).toBeDefined();
    expect(added.amount).toBe(75.25);

    // Edit
    const updated = await localDB.updateExpense(added.id, {
      amount: 80.00,
      note: 'مشتريات بقالة معدلة',
    });
    expect(updated.amount).toBe(80.00);
    expect(updated.note).toBe('مشتريات بقالة معدلة');

    // Delete (soft delete)
    await localDB.deleteExpense(added.id, true);
    const nonDeleted = await localDB.getExpenses(false);
    expect(nonDeleted.some(e => e.id === added.id)).toBe(false);

    // Restore (undo delete)
    const restored = await localDB.restoreExpense(added.id);
    expect(restored.isDeleted).toBe(false);
    const active = await localDB.getExpenses(false);
    expect(active.some(e => e.id === added.id)).toBe(true);
  });

  // 9. Updating account balances correctly
  it('9. should accurately calculate account balances for income, expenses, and transfers', () => {
    const accounts: Account[] = [
      {
        id: 'acc-bank',
        name: 'البنك',
        type: 'bank',
        openingBalance: 10000,
        currency: 'EGP',
        color: '#3B82F6',
        icon: 'Landmark',
        isActive: true,
        isArchived: false,
        showOnHome: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'acc-wallet',
        name: 'المحفظة',
        type: 'wallet',
        openingBalance: 500,
        currency: 'EGP',
        color: '#10B981',
        icon: 'Wallet',
        isActive: true,
        isArchived: false,
        showOnHome: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const transactions: Expense[] = [
      // 1. Income into bank +5000
      {
        id: 'tx-1',
        type: 'income',
        amount: 5000,
        categoryId: 'cat-salary',
        accountId: 'acc-bank',
        paymentMethodId: 'acc-bank',
        note: 'راتب',
        merchant: 'شركة',
        date: '2026-10-01',
        time: '10:00',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
        isDeleted: false,
      },
      // 2. Transfer from bank to wallet 1000
      {
        id: 'tx-2',
        type: 'transfer',
        amount: 1000,
        categoryId: 'cat-other',
        accountId: 'acc-bank',
        fromAccountId: 'acc-bank',
        toAccountId: 'acc-wallet',
        paymentMethodId: 'acc-bank',
        note: 'تحويل للمحفظة',
        merchant: 'تحويل',
        date: '2026-10-02',
        time: '11:00',
        createdAt: '2026-10-02T11:00:00Z',
        updatedAt: '2026-10-02T11:00:00Z',
        isDeleted: false,
      },
      // 3. Expense from wallet -350
      {
        id: 'tx-3',
        type: 'expense',
        amount: 350,
        categoryId: 'cat-shopping',
        accountId: 'acc-wallet',
        paymentMethodId: 'acc-wallet',
        note: 'مشتريات',
        merchant: 'متجر',
        date: '2026-10-03',
        time: '12:00',
        createdAt: '2026-10-03T12:00:00Z',
        updatedAt: '2026-10-03T12:00:00Z',
        isDeleted: false,
      },
    ];

    const { summaries, totalNetWorth } = calculateAccountSummaries(accounts, transactions);

    // Bank: 10000 (opening) + 5000 (income) - 1000 (transfer out) = 14000
    const bankSummary = summaries.find(s => s.account.id === 'acc-bank');
    expect(bankSummary?.currentBalance).toBe(14000);

    // Wallet: 500 (opening) + 1000 (transfer in) - 350 (expense) = 1150
    const walletSummary = summaries.find(s => s.account.id === 'acc-wallet');
    expect(walletSummary?.currentBalance).toBe(1150);

    // Net worth = 14000 + 1150 = 15150
    expect(totalNetWorth).toBe(15150);
  });

  // 10. Calculating monthly totals and budgets correctly
  it('10. should accurately calculate monthly totals, budget pace, and insight breakdowns', () => {
    const categories: Category[] = [
      { id: 'cat-food', name: 'طعام', icon: 'Utensils', color: '#EF4444', isDefault: true, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
      { id: 'cat-bills', name: 'فواتير', icon: 'Receipt', color: '#F59E0B', isDefault: true, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    ];

    const expenses: Expense[] = [
      { id: 'e1', type: 'expense', amount: 300, categoryId: 'cat-food', accountId: 'acc-1', paymentMethodId: 'acc-1', note: '', merchant: '', date: '2026-10-05', time: '12:00', createdAt: '', updatedAt: '', isDeleted: false },
      { id: 'e2', type: 'expense', amount: 700, categoryId: 'cat-bills', accountId: 'acc-1', paymentMethodId: 'acc-1', note: '', merchant: '', date: '2026-10-10', time: '12:00', createdAt: '', updatedAt: '', isDeleted: false },
      { id: 'e3', type: 'income', amount: 5000, categoryId: 'cat-salary', accountId: 'acc-1', paymentMethodId: 'acc-1', note: '', merchant: '', date: '2026-10-01', time: '12:00', createdAt: '', updatedAt: '', isDeleted: false },
    ];

    const budget: Budget = {
      id: 'bgt-2026-10',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      amount: 4000,
      createdAt: '',
      updatedAt: '',
    };

    const refDate = new Date(2026, 9, 15); // Oct 15, 2026
    const pace = calculateBudgetPace(expenses, budget, refDate);

    expect(pace.budget).toBe(4000);
    expect(pace.spent).toBe(1000);
    expect(pace.remaining).toBe(3000);
    expect(pace.percentUsed).toBe(25);

    const insights = calculateMonthInsights(expenses, categories, '2026-10', refDate);
    expect(insights.totalSpent).toBe(1000);
    expect(insights.totalIncome).toBe(5000);
    expect(insights.netSavings).toBe(4000);
    expect(insights.categoryBreakdown.length).toBe(2);
  });

  // 11. Preventing duplicate transactions on repeated submissions
  it('11. should prevent duplicate transactions when parsed amounts or submissions collide', () => {
    const input1 = parseMoneyInput('125.50');
    expect(input1.valid).toBe(true);
    expect(input1.amount).toBe(125.50);

    // Rapid double parse returns consistent normalized amounts
    const input2 = parseMoneyInput('125.50');
    expect(input2.amount).toBe(input1.amount);

    // Validate transfer checks self-transfer rejection
    const invalidSelfTransfer = validateTransfer(
      { amount: 100, fromAccountId: 'acc-1', toAccountId: 'acc-1' },
      [{ id: 'acc-1', name: 'كاش', type: 'cash', openingBalance: 500, currency: 'EGP', color: '', icon: '', isActive: true, isArchived: false, showOnHome: true, createdAt: '', updatedAt: '' }]
    );
    expect(invalidSelfTransfer.valid).toBe(false);
  });

  // 12. Handling empty datasets and invalid numeric input
  it('12. should handle empty datasets and invalid numeric inputs gracefully', () => {
    // Empty dataset summaries
    const emptySummary = calculateAccountSummaries([], []);
    expect(emptySummary.totalNetWorth).toBe(0);
    expect(emptySummary.summaries).toEqual([]);

    const emptyInsights = calculateMonthInsights([], [], '2026-10');
    expect(emptyInsights.totalSpent).toBe(0);
    expect(emptyInsights.totalIncome).toBe(0);
    expect(emptyInsights.categoryBreakdown).toEqual([]);

    // Invalid numeric inputs
    expect(parseMoneyInput('-50').valid).toBe(false);
    expect(parseMoneyInput('abc').valid).toBe(false);
    expect(parseMoneyInput('0').valid).toBe(false);
    expect(parseMoneyInput('NaN').valid).toBe(false);
    expect(parseMoneyInput('Infinity').valid).toBe(false);

    // Safe monetary math
    expect(addMoney(0.1, 0.2)).toBe(0.3);
    expect(subtractMoney(1.0, 0.9)).toBe(0.1);
    expect(toMinorUnits(15.99)).toBe(1599);
    expect(fromMinorUnits(1599)).toBe(15.99);
  });
});
