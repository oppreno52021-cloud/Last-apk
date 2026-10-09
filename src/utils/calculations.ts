import { 
  Expense, 
  Budget, 
  BudgetPace, 
  Category, 
  CategorySummary, 
  ImportResult, 
  HistoricalMonthPoint,
  MonthInsights,
  Account,
  AccountSummary,
  RecurringFrequency,
  RecurringTransaction,
  Settings
} from '../types';

// =========================================================================
// MONETARY CONVENTION SPECIFICATION:
// 1. Storage Representation: MAJOR UNITS (e.g. 250.50 EGP stored as 250.5).
//    All entity schemas (Expense.amount, Budget.amount, Account.openingBalance)
//    persist numerical values in major currency units.
// 2. Arithmetic Engine: INTEGER MINOR UNITS (cents/piastres).
//    To eliminate IEEE-754 floating-point errors (e.g. 0.1 + 0.2 = 0.30000000000000004),
//    all additions, subtractions, and summations convert values via toMinorUnits()
//    (amount * 100), perform integer operations, and return values via fromMinorUnits().
// =========================================================================

// ==========================================
// 1. Precise Monetary Arithmetic (Minor Units)
// ==========================================

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minorUnits: number): number {
  return Number((minorUnits / 100).toFixed(2));
}

export function addMoney(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) + toMinorUnits(b));
}

export function subtractMoney(a: number, b: number): number {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b));
}

export function sumMoney(amounts: number[]): number {
  const totalMinor = amounts.reduce((acc, curr) => acc + toMinorUnits(curr), 0);
  return fromMinorUnits(totalMinor);
}

export function safeEvalMath(expr: string): number | null {
  if (!expr || !expr.trim()) return null;
  const normalized = normalizeArabicNumerals(expr);
  const sanitized = normalized
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[^0-9+\-*/.]/g, '');

  if (!/[+\-*/]/.test(sanitized)) return null;
  if (/[+\-*/.]$/.test(sanitized.trim())) return null;

  // Prevent divide by zero
  if (/\/0(?![.0-9])/.test(sanitized)) return null;

  try {
    const result = Function(`'use strict'; return (${sanitized})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result) && result >= 0) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeArabicNumerals(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(arabicDigits[i], String(i));
    res = res.replaceAll(persianDigits[i], String(i));
  }
  return res.replace(/٫/g, '.').replace(/،/g, ',');
}

export function resolveLanguage(lang?: 'en' | 'ar'): 'en' | 'ar' {
  if (lang === 'ar' || lang === 'en') return lang;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('masrofy_lang');
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {
      // ignore
    }
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl') return 'ar';
    if (document.documentElement.lang === 'en') return 'en';
  }
  return 'ar';
}

export interface CurrencyInfo {
  code: string;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'EGP', symbolAr: 'ج.م', symbolEn: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound' },
  { code: 'USD', symbolAr: '$', symbolEn: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar' },
  { code: 'SAR', symbolAr: 'ر.س', symbolEn: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal' },
  { code: 'AED', symbolAr: 'د.إ', symbolEn: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham' },
  { code: 'KWD', symbolAr: 'د.ك', symbolEn: 'KWD', nameAr: 'دينار كويتي', nameEn: 'Kuwaiti Dinar' },
  { code: 'QAR', symbolAr: 'ر.ق', symbolEn: 'QAR', nameAr: 'ريال قطري', nameEn: 'Qatari Riyal' },
  { code: 'BHD', symbolAr: 'د.ب', symbolEn: 'BHD', nameAr: 'دينار بحريني', nameEn: 'Bahraini Dinar' },
  { code: 'OMR', symbolAr: 'ر.ع', symbolEn: 'OMR', nameAr: 'ريال عماني', nameEn: 'Omani Rial' },
  { code: 'JOD', symbolAr: 'د.أ', symbolEn: 'JOD', nameAr: 'دينار أردني', nameEn: 'Jordanian Dinar' },
  { code: 'EUR', symbolAr: '€', symbolEn: '€', nameAr: 'يورو', nameEn: 'Euro' },
  { code: 'GBP', symbolAr: '£', symbolEn: '£', nameAr: 'جنيه إسترليني', nameEn: 'British Pound' },
  { code: 'TRY', symbolAr: '₺', symbolEn: 'TRY', nameAr: 'ليرة تركية', nameEn: 'Turkish Lira' },
];

export function getCurrencyInfo(code = ''): CurrencyInfo {
  const clean = (code || '').trim();
  if (!clean || clean.toUpperCase() === 'NONE' || clean === 'بدون عملة' || clean.toUpperCase() === 'EGP' || clean === 'ج.م' || clean === 'جم' || clean === 'LE') {
    return SUPPORTED_CURRENCIES[0];
  }
  const normalized = clean.toUpperCase();
  const found = SUPPORTED_CURRENCIES.find(c => c.code === normalized || c.symbolEn === clean || c.symbolAr === clean);
  if (found) return found;
  if (clean === 'ر.س' || clean === 'رس') return SUPPORTED_CURRENCIES.find(c => c.code === 'SAR') || SUPPORTED_CURRENCIES[0];
  if (clean === 'د.إ' || clean === 'دا') return SUPPORTED_CURRENCIES.find(c => c.code === 'AED') || SUPPORTED_CURRENCIES[0];
  if (clean === 'د.ك' || clean === 'دك') return SUPPORTED_CURRENCIES.find(c => c.code === 'KWD') || SUPPORTED_CURRENCIES[0];
  if (clean === 'ر.ق' || clean === 'رق') return SUPPORTED_CURRENCIES.find(c => c.code === 'QAR') || SUPPORTED_CURRENCIES[0];
  if (clean === 'د.ب' || clean === 'دب') return SUPPORTED_CURRENCIES.find(c => c.code === 'BHD') || SUPPORTED_CURRENCIES[0];
  if (clean === 'ر.ع' || clean === 'رع') return SUPPORTED_CURRENCIES.find(c => c.code === 'OMR') || SUPPORTED_CURRENCIES[0];
  if (clean === 'د.أ' || clean === 'دأ') return SUPPORTED_CURRENCIES.find(c => c.code === 'JOD') || SUPPORTED_CURRENCIES[0];
  return {
    code: clean,
    symbolAr: clean,
    symbolEn: clean,
    nameAr: clean,
    nameEn: clean,
  };
}

export function getCurrencySymbol(currency = '', lang?: 'en' | 'ar'): string {
  const currentLang = resolveLanguage(lang);
  const info = getCurrencyInfo(currency || 'EGP');
  return currentLang === 'ar' ? info.symbolAr : info.symbolEn;
}

export function toArabicNumerals(val: string | number): string {
  const str = String(val);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

export function formatNumber(
  val: number | string,
  lang?: 'en' | 'ar',
  numberFormat?: 'arabic' | 'western'
): string {
  const currentLang = resolveLanguage(lang);
  const numFormat = resolveNumberFormat(numberFormat, currentLang);
  const str = String(val);
  if (numFormat === 'arabic') {
    return toArabicNumerals(str);
  }
  return str;
}

export function resolveNumberFormat(numberFormat?: 'arabic' | 'western', lang?: 'en' | 'ar'): 'arabic' | 'western' {
  const currentLang = resolveLanguage(lang);
  // CRITICAL: When language is English, numbers MUST ALWAYS be Western numerals!
  if (currentLang === 'en') {
    return 'western';
  }
  if (numberFormat === 'arabic' || numberFormat === 'western') return numberFormat;
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('masrofy_number_format');
      if (saved === 'arabic' || saved === 'western') return saved;
    } catch {}
  }
  return 'arabic';
}

export function formatCurrency(
  amount: number,
  currency = '',
  lang?: 'en' | 'ar',
  isMasked = false,
  numberFormat?: 'arabic' | 'western'
): string {
  const currentLang = resolveLanguage(lang);
  const symbol = getCurrencySymbol(currency, currentLang);
  if (isMasked) {
    return symbol ? `•••• ${symbol}` : '••••';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(Number(amount.toFixed(2)));
  let formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: absAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  const numFormat = resolveNumberFormat(numberFormat, currentLang);
  if (numFormat === 'arabic') {
    // Convert digits cleanly without sentence punctuation
    formatted = toArabicNumerals(formatted);
  }

  const sign = isNegative ? '−' : '';

  if (!symbol) {
    return `${sign}${formatted}`;
  }
  return `${sign}${formatted} ${symbol}`;
}

export function parseMoneyInput(input: string): { valid: boolean; amount: number; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, amount: 0, error: 'Enter an amount greater than 0.' };
  }
  const normalized = normalizeArabicNumerals(input);
  const clean = normalized.replace(/,/g, '').trim();
  // Check for duplicate decimal points
  if ((clean.match(/\./g) || []).length > 1) {
    return { valid: false, amount: 0, error: 'Amount cannot have multiple decimal points.' };
  }
  const num = parseFloat(clean);
  if (isNaN(num)) {
    return { valid: false, amount: 0, error: 'Enter a valid amount.' };
  }
  if (!isFinite(num)) {
    return { valid: false, amount: 0, error: 'Amount cannot be infinite.' };
  }
  if (num <= 0) {
    return { valid: false, amount: 0, error: 'Enter an amount greater than 0.' };
  }
  if (num > 100_000_000) {
    return { valid: false, amount: 0, error: 'Amount exceeds maximum limit.' };
  }
  return { valid: true, amount: Math.round(num * 100) / 100 };
}

export function validateAmount(val: unknown): { valid: boolean; normalizedAmount: number; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { valid: false, normalizedAmount: 0, error: 'Amount is required' };
  }
  const str = normalizeArabicNumerals(String(val)).replace(/,/g, '').trim();
  const num = parseFloat(str);
  if (isNaN(num)) {
    return { valid: false, normalizedAmount: 0, error: 'Amount must be a valid number' };
  }
  if (!isFinite(num)) {
    return { valid: false, normalizedAmount: 0, error: 'Amount cannot be infinite' };
  }
  if (num <= 0) {
    return { valid: false, normalizedAmount: 0, error: 'Amount must be greater than zero' };
  }
  if (num > 100_000_000) {
    return { valid: false, normalizedAmount: 0, error: 'Amount exceeds maximum allowable threshold' };
  }
  const normalized = Math.round(num * 100) / 100;
  return { valid: true, normalizedAmount: normalized };
}

export function normalizeNameForComparison(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/\s+/g, ' ');
}

export function validateCategory(
  name: unknown,
  existingCategories: Category[],
  currentId?: string
): { valid: boolean; trimmedName: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, trimmedName: '', error: 'اسم الفئة لا يمكن أن يكون فارغاً' };
  }
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    return { valid: false, trimmedName: '', error: 'اسم الفئة لا يمكن أن يحتوي على مسافات فقط' };
  }
  if (trimmed.length > 50) {
    return { valid: false, trimmedName: trimmed, error: 'اسم الفئة لا يمكن أن يتجاوز 50 حرفاً' };
  }
  const normalizedTarget = normalizeNameForComparison(trimmed);

  const activeDuplicate = existingCategories.find(
    c => c.id !== currentId && c.isActive && normalizeNameForComparison(c.name) === normalizedTarget
  );
  if (activeDuplicate) {
    return { valid: false, trimmedName: trimmed, error: `الفئة "${trimmed}" موجودة بالفعل.` };
  }

  const archivedDuplicate = existingCategories.find(
    c => c.id !== currentId && !c.isActive && normalizeNameForComparison(c.name) === normalizedTarget
  );
  if (archivedDuplicate) {
    return { valid: false, trimmedName: trimmed, error: `توجد فئة بنفس الاسم "${trimmed}" مؤرشفة بالفعل، يمكنك إعادة تفعيلها.` };
  }

  return { valid: true, trimmedName: trimmed };
}

// ==========================================
// 2. Calendar & Date Calculations
// ==========================================

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  if (monthZeroIndexed === 1) { // February
    return isLeapYear(year) ? 29 : 28;
  }
  // 30-day months: April (3), June (5), September (8), November (10)
  if ([3, 5, 8, 10].includes(monthZeroIndexed)) {
    return 30;
  }
  return 31;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getCurrentMonthPrefix(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function formatMonthTitle(monthPrefix: string, lang?: 'en' | 'ar'): string {
  if (!monthPrefix || monthPrefix.length < 7) return monthPrefix;
  const currentLang = resolveLanguage(lang);
  const parts = monthPrefix.split('-');
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthPrefix;
  const isArabicNum = resolveNumberFormat(undefined, currentLang) === 'arabic';
  const displayYear = (currentLang === 'ar' && isArabicNum) ? toArabicNumerals(year) : year;
  if (currentLang === 'ar') {
    return `${ARABIC_MONTHS[monthIdx]} ${displayYear}`;
  }
  const monthName = MONTH_NAMES[monthIdx] || parts[1];
  return `${monthName} ${year}`;
}

export function formatMonthShort(monthPrefix: string, lang?: 'en' | 'ar'): string {
  if (!monthPrefix || monthPrefix.length < 7) return monthPrefix;
  const currentLang = resolveLanguage(lang);
  const parts = monthPrefix.split('-');
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthPrefix;
  if (currentLang === 'ar') {
    return ARABIC_MONTHS[monthIdx];
  }
  return MONTH_NAMES_SHORT[monthIdx] || parts[1];
}

export function getPreviousMonthString(monthPrefix: string): string {
  const parts = monthPrefix.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function getNextMonthString(monthPrefix: string): string {
  const parts = monthPrefix.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getUserActiveMonthsList(expenses: Expense[], currentMonthPrefix: string): string[] {
  let earliest = currentMonthPrefix;
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    if (!e.isDeleted && e.date) {
      const m = e.date.slice(0, 7);
      if (m < earliest) {
        earliest = m;
      }
    }
  }

  const list: string[] = [];
  let cursor = earliest;
  let limit = 120;
  while (cursor <= currentMonthPrefix && limit > 0) {
    list.push(cursor);
    if (cursor === currentMonthPrefix) break;
    cursor = getNextMonthString(cursor);
    limit--;
  }

  if (list.length === 0) {
    list.push(currentMonthPrefix);
  }
  return list;
}

export function calculateMonthInsights(
  expenses: Expense[],
  categories: Category[],
  selectedMonthPrefix: string,
  referenceDate: Date = new Date(),
  accounts: Account[] = [],
  lang?: 'en' | 'ar'
): MonthInsights {
  const currentLang = resolveLanguage(lang);
  const [yearStr, monthStr] = selectedMonthPrefix.split('-');
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1; // 0 to 11
  const daysInMonth = getDaysInMonth(year, monthIdx);

  const currentMonthPrefix = getCurrentMonthPrefix(referenceDate);
  const isCurrentMonth = selectedMonthPrefix === currentMonthPrefix;

  // Days elapsed in the selected month
  let daysElapsed = daysInMonth;
  if (isCurrentMonth) {
    daysElapsed = Math.max(1, Math.min(referenceDate.getDate(), daysInMonth));
  } else if (selectedMonthPrefix > currentMonthPrefix) {
    daysElapsed = 0;
  }

  const prevMonthPrefix = getPreviousMonthString(selectedMonthPrefix);
  const activeMonthsPrefixes = getUserActiveMonthsList(expenses, currentMonthPrefix);

  // Single-pass accumulation
  const selectedMonthExpenses: Expense[] = [];
  let prevTotal = 0;
  const monthTotalsMap: Record<string, { total: number; count: number }> = {};
  activeMonthsPrefixes.forEach(m => {
    monthTotalsMap[m] = { total: 0, count: 0 };
  });

  const dailyMap: Record<number, { amount: number; count: number }> = {};
  let totalIncome = 0;

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    if (e.isDeleted) continue;

    // Track income for selected month
    if (e.type === 'income' && e.date.startsWith(selectedMonthPrefix)) {
      totalIncome = addMoney(totalIncome, e.amount);
      continue;
    }

    if (e.type !== 'expense') continue;

    const mPrefix = e.date.slice(0, 7);

    // Track for historical 6 months
    if (monthTotalsMap[mPrefix]) {
      monthTotalsMap[mPrefix].total = addMoney(monthTotalsMap[mPrefix].total, e.amount);
      monthTotalsMap[mPrefix].count += 1;
    }

    // Previous month total
    if (mPrefix === prevMonthPrefix) {
      prevTotal = addMoney(prevTotal, e.amount);
    }

    // Selected month
    if (mPrefix === selectedMonthPrefix) {
      selectedMonthExpenses.push(e);
      const dayNum = parseInt(e.date.slice(8, 10), 10);
      if (!dailyMap[dayNum]) {
        dailyMap[dayNum] = { amount: 0, count: 0 };
      }
      dailyMap[dayNum].amount = addMoney(dailyMap[dayNum].amount, e.amount);
      dailyMap[dayNum].count += 1;
    }
  }

  const totalSpent = sumMoney(selectedMonthExpenses.map(e => e.amount));
  const transactionCount = selectedMonthExpenses.length;

  const dailyAverage = transactionCount === 0 
    ? 0 
    : Math.round(totalSpent / Math.max(1, daysElapsed));

  const averageTransaction = transactionCount > 0 
    ? Math.round(totalSpent / transactionCount) 
    : 0;

  // Largest expense
  let largestExpense: Expense | null = null;
  for (let i = 0; i < selectedMonthExpenses.length; i++) {
    const exp = selectedMonthExpenses[i];
    if (!largestExpense || exp.amount > largestExpense.amount) {
      largestExpense = exp;
    }
  }

  // Highest spending day
  let highestSpendingDay: { date: string; day: number; amount: number; count: number } | null = null;
  const daysWithSpend = Object.keys(dailyMap).map(Number);
  for (let i = 0; i < daysWithSpend.length; i++) {
    const d = daysWithSpend[i];
    const data = dailyMap[d];
    if (!highestSpendingDay || data.amount > highestSpendingDay.amount) {
      highestSpendingDay = {
        day: d,
        date: `${selectedMonthPrefix}-${String(d).padStart(2, '0')}`,
        amount: data.amount,
        count: data.count,
      };
    }
  }

  // Daily trend across all calendar days in the month
  const dailyTrend: { day: number; label: string; date: string; amount: number; count: number }[] = [];
  let maxDailyAmount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const amount = dailyMap[d]?.amount || 0;
    const count = dailyMap[d]?.count || 0;
    if (amount > maxDailyAmount) maxDailyAmount = amount;
    dailyTrend.push({
      day: d,
      label: String(d),
      date: `${selectedMonthPrefix}-${String(d).padStart(2, '0')}`,
      amount,
      count,
    });
  }

  // Ranked category breakdown
  const categoryBreakdown = groupExpensesByCategory(selectedMonthExpenses, categories);
  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  const top3Categories = categoryBreakdown.slice(0, 3);
  const top3Sum = sumMoney(top3Categories.map(c => c.total));
  const top3Share = totalSpent > 0 ? Number(((top3Sum / totalSpent) * 100).toFixed(1)) : 0;

  // Month-over-month comparison
  const difference = subtractMoney(totalSpent, prevTotal);
  const percentageChange = prevTotal > 0 ? Number(((difference / prevTotal) * 100).toFixed(1)) : null;

  // Historical / Active months timeline (from earliest logged to current month)
  const historical6Months: HistoricalMonthPoint[] = activeMonthsPrefixes.map(m => ({
    monthPrefix: m,
    monthLabel: formatMonthShort(m, currentLang),
    fullLabel: formatMonthTitle(m, currentLang),
    total: monthTotalsMap[m]?.total || 0,
    count: monthTotalsMap[m]?.count || 0,
  }));

  // Spending by Account (Phase 5)
  const accountTotalsMap: Record<string, { total: number; count: number }> = {};
  selectedMonthExpenses.forEach(e => {
    const accId = e.accountId || 'acc-cash';
    if (!accountTotalsMap[accId]) {
      accountTotalsMap[accId] = { total: 0, count: 0 };
    }
    accountTotalsMap[accId].total = addMoney(accountTotalsMap[accId].total, e.amount);
    accountTotalsMap[accId].count += 1;
  });

  const accountLookup = new Map(accounts.map(a => [a.id, a]));
  const spendingByAccount = Object.keys(accountTotalsMap).map(accId => {
    const acc = accountLookup.get(accId);
    const total = accountTotalsMap[accId].total;
    const percentage = totalSpent > 0 ? Number(((total / totalSpent) * 100).toFixed(1)) : 0;
    return {
      accountId: accId,
      accountName: acc?.name || (accId === 'acc-card' ? 'Debit Card' : accId === 'acc-cash' ? 'Cash' : accId === 'acc-bank' ? 'Bank Account' : 'Account'),
      accountType: acc?.type || 'cash',
      accountColor: acc?.color || '#3B82F6',
      accountIcon: acc?.icon || 'CreditCard',
      total,
      count: accountTotalsMap[accId].count,
      percentage,
    };
  }).sort((a, b) => b.total - a.total);

  const netSavings = subtractMoney(totalIncome, totalSpent);

  return {
    monthPrefix: selectedMonthPrefix,
    monthLabel: formatMonthTitle(selectedMonthPrefix, currentLang),
    totalSpent,
    totalIncome,
    netSavings,
    transactionCount,
    dailyAverage,
    daysInMonth,
    daysElapsed,
    isCurrentMonth,
    largestExpense,
    highestSpendingDay,
    averageTransaction,
    categoryBreakdown,
    topCategory,
    top3Share,
    top3Categories,
    monthComparison: {
      prevMonthPrefix,
      prevMonthLabel: formatMonthTitle(prevMonthPrefix, currentLang),
      prevTotal,
      difference,
      percentageChange,
      hasPrevData: prevTotal > 0,
    },
    dailyTrend,
    maxDailyAmount,
    historical6Months,
    spendingByAccount,
  };
}

// ==========================================
// 3. Budget Intelligence & Pacing Engine
// ==========================================

export function calculateBudgetPace(
  expenses: Expense[], 
  budget: Budget, 
  referenceDate: Date = new Date()
): BudgetPace {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const daysElapsed = Math.max(1, Math.min(referenceDate.getDate(), daysInMonth));
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);
  const isPeriodEnded = daysRemaining === 0;

  // Filter expenses strictly in the current budget month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthlyExpenses = expenses.filter(e => 
    !e.isDeleted && 
    e.type === 'expense' && 
    e.date.startsWith(monthPrefix)
  );

  const spent = sumMoney(monthlyExpenses.map(e => e.amount));
  const dailyAverage = daysElapsed > 0 ? Math.round(spent / daysElapsed) : spent;
  
  // Projection requires at least 2 distinct days of data and at least 2 active expenses
  const hasSufficientData = daysElapsed >= 2 && monthlyExpenses.length >= 2;
  const projectedSpending = hasSufficientData ? Math.round(dailyAverage * daysInMonth) : spent;

  const hasBudget = Boolean(budget && budget.amount > 0);

  if (!hasBudget) {
    return {
      spent,
      budget: null,
      remaining: null,
      percentUsed: null,
      daysElapsed,
      daysRemaining,
      daysInMonth,
      dailyAverage,
      requiredRemainingDailyAverage: null,
      expectedSpendToDate: null,
      projectedSpending,
      projectedOverUnder: null,
      hasSufficientData,
      status: 'no_budget',
      message: 'No monthly budget configured.',
      isPeriodEnded,
    };
  }

  const budgetAmount = budget.amount;
  const remaining = subtractMoney(budgetAmount, spent);
  const percentUsed = Number(((spent / budgetAmount) * 100).toFixed(2));
  const expectedSpendToDate = Number(((budgetAmount * daysElapsed) / daysInMonth).toFixed(2));
  const requiredRemainingDailyAverage = daysRemaining > 0 && remaining > 0
    ? Math.round(remaining / daysRemaining) 
    : 0;
  const projectedOverUnder = Math.round(projectedSpending - budgetAmount);

  let status: BudgetPace['status'] = 'under_control';
  let message = 'Spending pace is comfortably within your budget.';

  if (spent > budgetAmount) {
    status = 'over_budget';
    message = 'Monthly spending has exceeded your allocated budget.';
  } else if (isPeriodEnded) {
    status = percentUsed > 100 ? 'over_budget' : (percentUsed > 90 ? 'watch' : 'under_control');
    message = 'Budget period completed.';
  } else if (hasSufficientData && projectedSpending > budgetAmount) {
    status = 'over_budget';
    message = 'At your current pace, monthly spending may exceed your budget.';
  } else if (percentUsed >= 80 || (expectedSpendToDate > 0 && spent > expectedSpendToDate * 1.1) || remaining <= budgetAmount * 0.15) {
    status = 'watch';
    message = 'Spending pace is approaching your budget limit.';
  } else {
    status = 'under_control';
    message = 'Spending pace is comfortably within your budget.';
  }

  return {
    spent,
    budget: budgetAmount,
    remaining,
    percentUsed,
    daysElapsed,
    daysRemaining,
    daysInMonth,
    dailyAverage,
    requiredRemainingDailyAverage,
    expectedSpendToDate,
    projectedSpending,
    projectedOverUnder,
    hasSufficientData,
    status,
    message,
    isPeriodEnded,
  };
}

export function getTodayExpenses(expenses: Expense[], todayStr: string = getLocalDateString(new Date())): { total: number; count: number; items: Expense[] } {
  const items = expenses.filter(e => !e.isDeleted && e.type === 'expense' && e.date === todayStr);
  const total = sumMoney(items.map(e => e.amount));
  return { total, count: items.length, items };
}

// ==========================================
// 4. Category & Analytics Summaries
// ==========================================

export function groupExpensesByCategory(expenses: Expense[], categories: Category[]): CategorySummary[] {
  const categoryMap = new Map<string, Category>();
  categories.forEach(c => categoryMap.set(c.id, c));

  const totals: { [catId: string]: { total: number; count: number } } = {};
  let overallTotal = 0;

  expenses.forEach(e => {
    if (e.isDeleted || e.type !== 'expense') return;
    overallTotal = addMoney(overallTotal, e.amount);
    if (!totals[e.categoryId]) {
      totals[e.categoryId] = { total: 0, count: 0 };
    }
    totals[e.categoryId].total = addMoney(totals[e.categoryId].total, e.amount);
    totals[e.categoryId].count += 1;
  });

  const summaries: CategorySummary[] = Object.keys(totals).map(catId => {
    const category = categoryMap.get(catId) || {
      id: catId,
      name: 'Other',
      icon: 'MoreHorizontal',
      color: '#64748B',
      isDefault: false,
      isActive: true,
      sortOrder: 99,
      createdAt: '',
      updatedAt: '',
    };
    const total = totals[catId].total;
    const percentage = overallTotal > 0 ? Number(((total / overallTotal) * 100).toFixed(1)) : 0;
    return {
      category,
      total,
      count: totals[catId].count,
      percentage,
    };
  });

  return summaries.sort((a, b) => b.total - a.total);
}

// Built-in smart merchant learning dictionary
const KEYWORD_CATEGORY_RULES: { keywords: string[]; categoryId: string }[] = [
  { keywords: ['uber', 'careem', 'taxi', 'fuel', 'petrol', 'gas', 'metro', 'bus', 'toll', 'parking'], categoryId: 'cat-trans' },
  { keywords: ['lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'kfc', 'bistro', 'bakery', 'pizza', 'food'], categoryId: 'cat-food' },
  { keywords: ['market', 'supermarket', 'groceries', 'carrefour', 'hyper', 'spinneys', 'milk', 'produce', 'vegetables', 'meat'], categoryId: 'cat-groceries' },
  { keywords: ['bill', 'electricity', 'water', 'internet', 'telecom', 'wifi', 'rent', 'utility', 'maintenance'], categoryId: 'cat-bills' },
  { keywords: ['zara', 'h&m', 'nike', 'amazon', 'clothes', 'shoes', 'electronics', 'shopping', 'headphones', 'gadget'], categoryId: 'cat-shopping' },
  { keywords: ['pharmacy', 'doctor', 'clinic', 'dentist', 'medicine', 'hospital', 'vitamins'], categoryId: 'cat-health' },
  { keywords: ['netflix', 'spotify', 'cinema', 'movie', 'concert', 'game', 'playstation', 'steam'], categoryId: 'cat-ent' },
  { keywords: ['book', 'course', 'school', 'tuition', 'udemy', 'coursera', 'university'], categoryId: 'cat-edu' },
  { keywords: ['barber', 'salon', 'spa', 'haircut', 'gym', 'fitness'], categoryId: 'cat-personal' },
  { keywords: ['salary', 'راتب', 'مرتب', 'معاش', 'payroll', 'wage'], categoryId: 'cat-inc-salary' },
  { keywords: ['freelance', 'عمل حر', 'فريلانس', 'مشروع', 'تصميم', 'برمجة', 'upwork', 'fiverr', 'client'], categoryId: 'cat-inc-freelance' },
  { keywords: ['invest', 'استثمار', 'أرباح', 'توزيعات', 'stock', 'crypto', 'dividend', 'interest', 'فوائد'], categoryId: 'cat-inc-invest' },
  { keywords: ['bonus', 'مكافأة', 'حافز', 'بونص', 'award'], categoryId: 'cat-inc-bonus' },
  { keywords: ['sale', 'sales', 'بيع', 'مبيعات', 'تجارة', 'store'], categoryId: 'cat-inc-sales' },
  { keywords: ['gift', 'هدية', 'عيدية', 'present'], categoryId: 'cat-inc-gift' },
];

export function predictCategoryFromText(text: string, historicalExpenses: Expense[] = []): string | null {
  if (!text || text.trim().length < 2) return null;
  const clean = text.toLowerCase().trim();

  // 1. Check historical matches first (user learning)
  const historyMatch = historicalExpenses.find(e => 
    !e.isDeleted && 
    ((e.merchant && e.merchant.toLowerCase().includes(clean)) || 
     (e.note && e.note.toLowerCase().includes(clean)))
  );
  if (historyMatch) {
    return historyMatch.categoryId;
  }

  // 2. Check keyword dictionary
  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (rule.keywords.some(k => clean.includes(k))) {
      return rule.categoryId;
    }
  }

  return null;
}

export function detectDuplicateExpense(
  newExp: { amount: number; categoryId: string; note: string; date: string },
  existingExpenses: Expense[]
): Expense | null {
  return existingExpenses.find(e => 
    !e.isDeleted && 
    Math.abs(e.amount - newExp.amount) < 0.001 && 
    e.categoryId === newExp.categoryId && 
    e.date === newExp.date && 
    e.note.trim().toLowerCase() === newExp.note.trim().toLowerCase()
  ) || null;
}

// ==========================================
// 5. Robust RFC-4180 CSV Engine
// ==========================================

export function exportExpensesToCSV(
  expenses: Expense[], 
  categories: Category[], 
  currency = 'EGP',
  accounts: Account[] = []
): string {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const accMap = new Map(accounts.map(a => [a.id, a.name]));
  const headers = ['Date', 'Time', 'Type', 'Amount', 'Category', 'Note', 'Merchant', 'Payment Method', 'Account', 'To Account', 'Currency'];
  
  const rows = expenses
    .filter(e => !e.isDeleted)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map(e => [
      e.date,
      e.time || '12:00',
      e.type,
      e.amount.toFixed(2),
      `"${(e.type === 'transfer' ? 'Transfer' : (catMap.get(e.categoryId) || 'Other')).replace(/"/g, '""')}"`,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      `"${(e.merchant || '').replace(/"/g, '""')}"`,
      `"${(e.paymentMethodId || 'Cash').replace(/"/g, '""')}"`,
      `"${(accMap.get(e.accountId || e.fromAccountId || '') || e.accountId || 'Cash').replace(/"/g, '""')}"`,
      `"${(accMap.get(e.toAccountId || '') || e.toAccountId || '').replace(/"/g, '""')}"`,
      currency
    ].join(','));

  // Prepend UTF-8 BOM (\uFEFF) for Excel & Android spreadsheet compatibility
  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

export function parseCSVWithAudit(
  csvText: string,
  categories: Category[],
  existingExpenses: Expense[] = [],
  accounts: Account[] = []
): { items: Partial<Expense>[]; result: ImportResult } {
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  if (lines.length < 2) {
    result.errors = 1;
    result.details.push('CSV file is empty or missing headers');
    return { items: [], result };
  }

  // Detect delimiter (, or ;)
  const firstLine = lines[0];
  const delimiter = (firstLine.includes(';') && !firstLine.includes(',')) ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let insideQuotes = false;
    let currentValue = '';

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      const nextChar = line[charIndex + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          charIndex++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    return values;
  };

  // Analyze header row
  const headerCols = parseLine(lines[0]).map(h => h.toLowerCase().replace(/["\r\n]/g, '').trim());
  let dateIdx = headerCols.findIndex(h => h.includes('date') || h.includes('تاريخ'));
  let timeIdx = headerCols.findIndex(h => h.includes('time') || h.includes('وقت'));
  let typeIdx = headerCols.findIndex(h => h.includes('type') || h.includes('نوع'));
  let amountIdx = headerCols.findIndex(h => h.includes('amount') || h.includes('مبلغ') || h.includes('قيمة'));
  let catIdx = headerCols.findIndex(h => h.includes('category') || h.includes('فئة') || h.includes('قسم'));
  let noteIdx = headerCols.findIndex(h => h.includes('note') || h.includes('ملاحظ') || h.includes('وصف') || h.includes('بيان'));
  let merchantIdx = headerCols.findIndex(h => h.includes('merchant') || h.includes('متجر') || h.includes('مستفيد'));
  let accIdx = headerCols.findIndex(h => h.includes('account') || h.includes('محفظة') || h.includes('حساب'));
  let toAccIdx = headerCols.findIndex(h => h.includes('to account') || h.includes('إلى محفظة') || h.includes('إلى حساب'));

  // Default fallback indices if not identified by header names
  if (dateIdx === -1) dateIdx = 0;
  if (timeIdx === -1) timeIdx = 1;
  if (typeIdx === -1) typeIdx = 2;
  if (amountIdx === -1) amountIdx = 3;
  if (catIdx === -1) catIdx = 4;
  if (noteIdx === -1) noteIdx = 5;
  if (merchantIdx === -1) merchantIdx = 6;
  if (accIdx === -1) accIdx = 8;
  if (toAccIdx === -1) toAccIdx = 9;

  const catNameToId = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
  const accNameToId = new Map(accounts.map(a => [a.name.toLowerCase(), a.id]));
  const parsedItems: Partial<Expense>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length < 2) continue;

    const rawAmount = values[amountIdx] || values[3] || values[1] || '';
    const valResult = validateAmount(rawAmount);

    if (!valResult.valid) {
      result.errors++;
      result.details.push(`Row ${i + 1}: Invalid amount "${rawAmount}"`);
      continue;
    }

    const date = values[dateIdx] || getLocalDateString();
    const time = values[timeIdx] || '12:00';
    const rawType = (values[typeIdx] || '').toLowerCase().trim();
    const type = (rawType.includes('transfer') || rawType.includes('تحويل'))
      ? 'transfer'
      : (rawType.includes('income') || rawType.includes('دخل'))
        ? 'income'
        : 'expense';

    const catName = (values[catIdx] || 'Other').replace(/["']/g, '').trim().toLowerCase();
    const categoryId = type === 'transfer' ? '' : (catNameToId.get(catName) || 'cat-other');
    const note = (values[noteIdx] || '').replace(/^["']|["']$/g, '').trim();
    const merchant = (values[merchantIdx] || '').replace(/^["']|["']$/g, '').trim();
    
    const rawAcc1 = (values[accIdx] || '').replace(/["']/g, '').trim().toLowerCase();
    const rawAcc2 = (values[toAccIdx] || '').replace(/["']/g, '').trim().toLowerCase();

    const accountId = accNameToId.get(rawAcc1) || accounts.find(a => a.id === values[accIdx])?.id || 'acc-cash';
    const fromAccountId = type === 'transfer' ? accountId : undefined;
    const toAccountId = type === 'transfer' 
      ? (accNameToId.get(rawAcc2) || accounts.find(a => a.id === values[toAccIdx])?.id || 'acc-bank')
      : undefined;

    // Duplicate detection
    const isDuplicate = existingExpenses.some(
      e => !e.isDeleted &&
           e.date === date &&
           Math.abs(e.amount - valResult.normalizedAmount) < 0.001 &&
           e.type === type &&
           (type === 'transfer' ? e.toAccountId === toAccountId : e.categoryId === categoryId) &&
           e.note.trim().toLowerCase() === note.toLowerCase()
    ) || parsedItems.some(
      p => p.date === date &&
           Math.abs((p.amount || 0) - valResult.normalizedAmount) < 0.001 &&
           p.type === type &&
           (type === 'transfer' ? p.toAccountId === toAccountId : p.categoryId === categoryId) &&
           (p.note || '').trim().toLowerCase() === note.toLowerCase()
    );

    if (isDuplicate) {
      result.skipped++;
      continue;
    }

    parsedItems.push({
      date,
      time,
      type,
      amount: valResult.normalizedAmount,
      categoryId,
      note,
      merchant,
      paymentMethodId: accountId,
      accountId,
      fromAccountId,
      toAccountId,
    });
    result.imported++;
  }

  return { items: parsedItems, result };
}

// ==========================================
// 6. Multi-Wallet & Account Engine (Phase 5)
// ==========================================

export function calculateAccountSummaries(
  accounts: Account[],
  transactions: Expense[]
): {
  summaries: AccountSummary[];
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
} {
  const map: Record<string, {
    balanceMinor: number;
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    transfersInMinor: number;
    transfersOutMinor: number;
    count: number;
  }> = {};

  // Initialize for all registered accounts
  accounts.forEach(acc => {
    map[acc.id] = {
      balanceMinor: toMinorUnits(acc.openingBalance || 0),
      totalIncomeMinor: 0,
      totalExpenseMinor: 0,
      transfersInMinor: 0,
      transfersOutMinor: 0,
      count: 0,
    };
  });

  // Single-pass processing across all non-deleted transactions
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.isDeleted) continue;

    const amountMinor = toMinorUnits(t.amount);

    if (t.type === 'expense') {
      const accId = t.accountId || 'acc-cash';
      if (!map[accId]) {
        map[accId] = {
          balanceMinor: 0,
          totalIncomeMinor: 0,
          totalExpenseMinor: 0,
          transfersInMinor: 0,
          transfersOutMinor: 0,
          count: 0,
        };
      }
      map[accId].balanceMinor -= amountMinor;
      map[accId].totalExpenseMinor += amountMinor;
      map[accId].count += 1;
    } else if (t.type === 'income') {
      const accId = t.accountId || 'acc-cash';
      if (!map[accId]) {
        map[accId] = {
          balanceMinor: 0,
          totalIncomeMinor: 0,
          totalExpenseMinor: 0,
          transfersInMinor: 0,
          transfersOutMinor: 0,
          count: 0,
        };
      }
      map[accId].balanceMinor += amountMinor;
      map[accId].totalIncomeMinor += amountMinor;
      map[accId].count += 1;
    } else if (t.type === 'transfer') {
      const fromId = t.fromAccountId || t.accountId;
      const toId = t.toAccountId;

      if (fromId) {
        if (!map[fromId]) {
          map[fromId] = {
            balanceMinor: 0,
            totalIncomeMinor: 0,
            totalExpenseMinor: 0,
            transfersInMinor: 0,
            transfersOutMinor: 0,
            count: 0,
          };
        }
        map[fromId].balanceMinor -= amountMinor;
        map[fromId].transfersOutMinor += amountMinor;
        map[fromId].count += 1;
      }
      if (toId) {
        if (!map[toId]) {
          map[toId] = {
            balanceMinor: 0,
            totalIncomeMinor: 0,
            totalExpenseMinor: 0,
            transfersInMinor: 0,
            transfersOutMinor: 0,
            count: 0,
          };
        }
        map[toId].balanceMinor += amountMinor;
        map[toId].transfersInMinor += amountMinor;
        map[toId].count += 1;
      }
    }
  }

  let netWorthMinor = 0;
  let assetsMinor = 0;
  let liabilitiesMinor = 0;

  const summaries: AccountSummary[] = accounts.map(acc => {
    const data = map[acc.id] || {
      balanceMinor: toMinorUnits(acc.openingBalance || 0),
      totalIncomeMinor: 0,
      totalExpenseMinor: 0,
      transfersInMinor: 0,
      transfersOutMinor: 0,
      count: 0,
    };

    const currentBalance = fromMinorUnits(data.balanceMinor);

    if (acc.isActive) {
      netWorthMinor += data.balanceMinor;
      if (data.balanceMinor >= 0) {
        assetsMinor += data.balanceMinor;
      } else {
        liabilitiesMinor += Math.abs(data.balanceMinor);
      }
    }

    return {
      account: acc,
      currentBalance,
      totalIncome: fromMinorUnits(data.totalIncomeMinor),
      totalExpense: fromMinorUnits(data.totalExpenseMinor),
      totalTransfersIn: fromMinorUnits(data.transfersInMinor),
      totalTransfersOut: fromMinorUnits(data.transfersOutMinor),
      transactionCount: data.count,
    };
  });

  return {
    summaries,
    totalNetWorth: fromMinorUnits(netWorthMinor),
    totalAssets: fromMinorUnits(assetsMinor),
    totalLiabilities: fromMinorUnits(liabilitiesMinor),
  };
}

export function validateAccount(
  account: { name: string; type: string; openingBalance: number },
  existingAccounts: Account[],
  currentAccountId?: string
): { valid: boolean; error?: string } {
  const nameTrimmed = account.name.trim().replace(/\s+/g, ' ');
  if (!nameTrimmed) {
    return { valid: false, error: 'اسم الحساب مطلوب ولا يمكن أن يكون فارغاً.' };
  }
  if (nameTrimmed.length > 50) {
    return { valid: false, error: 'لا يمكن أن يتجاوز اسم الحساب 50 حرفاً.' };
  }
  const normalizedTarget = normalizeNameForComparison(nameTrimmed);

  const activeDuplicate = existingAccounts.find(
    a => a.id !== currentAccountId && a.isActive && normalizeNameForComparison(a.name) === normalizedTarget
  );
  if (activeDuplicate) {
    return { valid: false, error: `يوجد حساب نشط باسم "${nameTrimmed}" بالفعل.` };
  }

  const archivedDuplicate = existingAccounts.find(
    a => a.id !== currentAccountId && !a.isActive && normalizeNameForComparison(a.name) === normalizedTarget
  );
  if (archivedDuplicate) {
    return { valid: false, error: `يوجد حساب بنفس الاسم "${nameTrimmed}" في الأرشيف بالفعل، يمكنك إعادة تفعيله.` };
  }

  if (isNaN(account.openingBalance)) {
    return { valid: false, error: 'يجب أن يكون الرصيد الافتتاحي رقماً صحيحاً.' };
  }
  return { valid: true };
}

export function validateTransfer(
  transfer: { amount: number; fromAccountId: string; toAccountId: string },
  accounts: Account[]
): { valid: boolean; error?: string } {
  if (isNaN(transfer.amount) || transfer.amount <= 0) {
    return { valid: false, error: 'Transfer amount must be greater than zero.' };
  }
  if (!transfer.fromAccountId) {
    return { valid: false, error: 'Please choose a source account.' };
  }
  if (!transfer.toAccountId) {
    return { valid: false, error: 'Please choose a destination account.' };
  }
  if (transfer.fromAccountId === transfer.toAccountId) {
    return { valid: false, error: 'Source and destination accounts cannot be the same.' };
  }
  const fromAcc = accounts.find(a => a.id === transfer.fromAccountId);
  const toAcc = accounts.find(a => a.id === transfer.toAccountId);
  if (!fromAcc) {
    return { valid: false, error: 'Source account does not exist.' };
  }
  if (!toAcc) {
    return { valid: false, error: 'Destination account does not exist.' };
  }
  if (!fromAcc.isActive) {
    return { valid: false, error: 'Cannot transfer from an archived account.' };
  }
  if (!toAcc.isActive) {
    return { valid: false, error: 'Cannot transfer to an archived account.' };
  }
  return { valid: true };
}

// ==========================================
// 7. Recurring Intelligence & Date Stepping
// ==========================================

export function calculateNextOccurrence(
  currentDateStr: string,
  frequency: RecurringFrequency
): string {
  const parts = currentDateStr.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || 1; // 1-12
  const day = parseInt(parts[2], 10) || 1;

  if (frequency === 'daily') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }

  if (frequency === 'weekly') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 7);
    return getLocalDateString(d);
  }

  if (frequency === 'monthly') {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const maxDays = getDaysInMonth(nextYear, nextMonth - 1);
    const targetDay = Math.min(day, maxDays);
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  }

  if (frequency === 'yearly') {
    const nextYear = year + 1;
    const maxDays = getDaysInMonth(nextYear, month - 1);
    const targetDay = Math.min(day, maxDays);
    return `${nextYear}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  }

  return currentDateStr;
}

// ==========================================
// 8. Full JSON Backup & Restore Validator
// ==========================================

export interface AppFullBackup {
  version: number;
  exportedAt: string;
  app: string;
  expenses: Expense[];
  categories: Category[];
  budget: Budget;
  accounts: Account[];
  recurring: RecurringTransaction[];
  settings: Settings;
}

export function validateBackupJSON(jsonStr: string): { valid: boolean; error?: string; data?: AppFullBackup } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Invalid backup file: not a JSON object' };
    }
    if (!Array.isArray(parsed.expenses)) {
      return { valid: false, error: 'Invalid backup file: missing expenses array' };
    }
    
    // Ensure all arrays exist with safe fallbacks
    const validData: AppFullBackup = {
      version: parsed.version || 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      app: parsed.app || 'Masrofy',
      expenses: parsed.expenses,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      budget: (parsed.budget && typeof parsed.budget === 'object') ? parsed.budget : { id: 'budget-monthly', amount: 0, period: 'monthly', updatedAt: new Date().toISOString() },
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      settings: (parsed.settings && typeof parsed.settings === 'object') ? parsed.settings : {} as any,
    };

    return { valid: true, data: validData };
  } catch (err: any) {
    return { valid: false, error: `JSON parse error: ${err?.message || 'Malformed file'}` };
  }
}

