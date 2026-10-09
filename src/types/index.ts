export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Expense {
  id: string;
  type: TransactionType;
  amount: number;
  currency?: string; // e.g. 'EGP', 'USD'
  categoryId: string;
  accountId: string;
  fromAccountId?: string;
  toAccountId?: string;
  paymentMethodId: string;
  paymentMethod?: string; // Conceptual alias for paymentMethodId
  note: string;
  merchant: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  createdAt: string; // ISO
  updatedAt: string; // ISO
  isDeleted: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type?: 'expense' | 'income' | 'both';
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  periodStart: string; // YYYY-MM-01
  periodEnd: string; // YYYY-MM-lastDay
  amount: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 
  | 'cash' 
  | 'bank' 
  | 'debit_card' 
  | 'credit_card' 
  | 'mobile_wallet' 
  | 'savings' 
  | 'card' 
  | 'wallet' 
  | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currency: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  isArchived?: boolean;
  showOnHome?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountSummary {
  account: Account;
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalTransfersIn: number;
  totalTransfersOut: number;
  transactionCount: number;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextOccurrence: string; // YYYY-MM-DD
  note: string;
  isActive: boolean;
  lastProcessedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type FontSizeOption = 'compact' | 'normal' | 'large' | 'xlarge';
export type NumberFormatOption = 'arabic' | 'western';

export type AutoLockTimeout = 'immediately' | '1m' | '5m' | '15m';

export interface Settings {
  currency: string;
  currencySymbol: string;
  language?: string;
  numberFormat?: NumberFormatOption;
  theme: 'light' | 'dark' | 'system';
  fontSize?: FontSizeOption;
  notifications: boolean;
  biometricLock: boolean;
  passcode?: string;
  pinLockEnabled?: boolean;
  autoLockTimeout?: AutoLockTimeout;
  privacyBlurEnabled?: boolean;
  autoPrivacyModeOnLaunch?: boolean;
  showWalletsOnHome?: boolean;
  firstDayOfMonth: number;
  budgetNotificationThreshold: number;
  hasCompletedOnboarding: boolean;
  isDemoInitialized?: boolean;
}

export type BudgetState = 'no_budget' | 'under_control' | 'watch' | 'over_budget' | 'normal' | 'attention' | 'near_limit';

export interface BudgetPace {
  spent: number;
  budget: number | null;
  remaining: number | null;
  percentUsed: number | null;
  daysElapsed: number;
  daysRemaining: number;
  daysInMonth: number;
  dailyAverage: number;
  requiredRemainingDailyAverage: number | null;
  expectedSpendToDate: number | null;
  projectedSpending: number;
  projectedOverUnder: number | null;
  hasSufficientData: boolean;
  status: BudgetState;
  message: string;
  isPeriodEnded: boolean;
}

export interface DailyTrendPoint {
  date: string;
  dayLabel: string;
  amount: number;
}

export interface HistoricalMonthPoint {
  monthPrefix: string;
  monthLabel: string;
  fullLabel: string;
  total: number;
  count: number;
}

export interface MonthInsights {
  monthPrefix: string;
  monthLabel: string;
  totalSpent: number;
  totalIncome?: number;
  netSavings?: number;
  transactionCount: number;
  dailyAverage: number;
  daysInMonth: number;
  daysElapsed: number;
  isCurrentMonth: boolean;
  largestExpense: Expense | null;
  highestSpendingDay: { date: string; day: number; amount: number; count: number } | null;
  averageTransaction: number;
  categoryBreakdown: CategorySummary[];
  topCategory: CategorySummary | null;
  top3Share: number;
  top3Categories: CategorySummary[];
  monthComparison: {
    prevMonthPrefix: string;
    prevMonthLabel: string;
    prevTotal: number;
    difference: number;
    percentageChange: number | null;
    hasPrevData: boolean;
  };
  dailyTrend: { day: number; label: string; date: string; amount: number; count: number }[];
  maxDailyAmount: number;
  historical6Months: HistoricalMonthPoint[];
  spendingByAccount: {
    accountId: string;
    accountName: string;
    accountType: string;
    accountColor?: string;
    accountIcon?: string;
    total: number;
    count: number;
    percentage: number;
  }[];
}

export interface FilterOptions {
  search: string;
  type: 'all' | 'expense' | 'income' | 'transfer';
  categoryIds: string[];
  accountIds?: string[];
  paymentMethodIds: string[];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface CategorySummary {
  category: Category;
  total: number;
  count: number;
  percentage: number;
}

export interface DailySummary {
  date: string;
  dayLabel: string;
  total: number;
  count: number;
  expenses: Expense[];
}

export interface MonthComparison {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  currentMonthTotal: number;
  previousMonthTotal: number;
  absoluteChange: number;
  percentageChange: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}
