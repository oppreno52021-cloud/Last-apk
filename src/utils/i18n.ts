export type Language = 'ar' | 'en';

export const translations = {
  ar: {
    nav: {
      home: 'الرئيسية',
      transactions: 'المعاملات',
      addExpense: 'إضافة معاملة',
      insights: 'التحليلات',
      settings: 'الإعدادات',
    },
    home: {
      netWorth: 'إجمالي الرصيد',
      todaySpending: 'مصاريف اليوم',
      remaining: 'المتبقي',
      recentTransactions: 'آخر المعاملات',
      viewAll: 'عرض الكل',
      noTransactionsYet: 'لا توجد معاملات مسجلة حتى الآن',
      transfer: 'تحويل',
    },
    transactions: {
      all: 'الكل',
      expenses: 'مصروفات',
      income: 'دخل',
      transfers: 'تحويلات',
      today: 'اليوم',
      yesterday: 'أمس',
      searchPlaceholder: 'بحث في المعاملات والملاحظات...',
      noTransactionsFound: 'لم يتم العثور على أي معاملات',
      noMatchingFilters: 'لا توجد معاملات تطابق عوامل التصفية الحالية',
      clearFilters: 'مسح الفلاتر',
      filter: 'تصفية',
      filterTransactions: 'تصفية المعاملات',
      resetFilters: 'إعادة ضبط',
      type: 'نوع المعاملة',
      category: 'التصنيف',
      account: 'الحساب',
      dateRange: 'الفترة الزمنية',
      from: 'من تاريخ',
      to: 'إلى تاريخ',
      amountRange: 'نطاق المبلغ',
      minAmount: 'الحد الأدنى',
      maxAmount: 'الحد الأقصى',
      noLimit: 'بدون حد',
      sortBy: 'الترتيب حسب',
      newest: 'الأحدث أولاً',
      oldest: 'الأقدم أولاً',
      highest: 'الأعلى قيمة',
      lowest: 'الأقل قيمة',
      clearAll: 'إلغاء التحديد',
      applyFilters: 'تطبيق التصفية',
    },
    insights: {
      title: 'التحليلات المالية',
      current: 'الشهر الحالي',
      nextMonth: 'الشهر القادم',
      previousMonth: 'الشهر السابق',
      jumpToCurrentMonth: 'العودة للشهر الحالي',
      noDataForMonth: 'لا توجد بيانات مسجلة لشهر {month}',
      addExpense: 'إضافة معاملة جديدة',
      calendarDays: 'أيام الشهر',
      dayOf: 'يوم',
      txns: 'معاملة',
      catModalTotal: 'الإجمالي',
      catModalShare: 'النسبة',
      catModalAverage: 'المتوسط',
      catModalLargest: 'الأعلى',
      catModalTxns: 'المعاملات',
      catModalDateTime: 'التاريخ والوقت',
      catModalEmpty: 'لا توجد معاملات مسجلة لهذه الفئة هذا الشهر',
    },
    detail: {
      title: 'تفاصيل المعاملة',
      edit: 'تعديل',
      delete: 'حذف',
      date: 'التاريخ',
      time: 'الوقت',
      account: 'الحساب',
      fromAccount: 'من حساب',
      toAccount: 'إلى حساب',
      merchant: 'الجهة / المتجر',
      notes: 'الملاحظات',
      confirmDelete: 'هل أنت متأكد من حذف هذه المعاملة؟',
      confirmDeleteDesc: 'لا يمكن التراجع عن هذا الإجراء بعد الحذف.',
      close: 'إغلاق',
      editTransfer: 'تعديل التحويل',
    },
    settings: {
      title: 'الإعدادات',
      currency: 'العملة',
      theme: 'المظهر',
      language: 'اللغة',
      fontSize: 'حجم الخط',
      accounts: 'الحسابات والمحافظ',
      accountName: 'اسم الحساب',
      accountType: 'نوع الحساب',
      openingBalance: 'الرصيد الافتتاحي',
      addAccountModal: 'إضافة حساب جديد',
      editAccountModal: 'تعديل الحساب',
      categories: 'التصنيفات',
      categoryName: 'اسم التصنيف',
      addCategory: 'إضافة تصنيف جديد',
      recurring: 'المعاملات المتكررة',
      addRecurring: 'إضافة تكرار دوري',
      frequency: 'التكرار',
      daily: 'يومي',
      weekly: 'أسبوعي',
      monthly: 'شهري',
      yearly: 'سنوي',
      monthlyBudget: 'الميزانية الشهرية',
      saveBudget: 'حفظ الميزانية',
      dataStorage: 'البيانات والنسخ الاحتياطي',
      resetData: 'حذف جميع البيانات',
      resetNow: 'حذف كل البيانات',
      confirmReset: 'تأكيد مسح كافة البيانات؟',
      confirmResetDesc: 'سيتم مسح جميع المعاملات والمحافظ والتصنيفات وإعادة التطبيق للحالة الابتدائية.',
      restoreConfirmTitle: 'تأكيد استعادة النسخة الاحتياطية',
      restoreConfirmDesc: 'سيتم استبدال البيانات الحالية بالبيانات الموجودة في ملف النسخ الاحتياطي.',
      restoreConfirmAction: 'استعادة واستبدال',
      cancel: 'إلغاء',
    },
    onboarding: {
      step1Title: 'تتبع مصاريفك بذكاء وفورية',
      step1Desc: 'سجّل معاملاتك بضغطة زر وتعرّف على نمط إنفاقك بدقة تامة.',
      step2Title: 'ميزانيتك تحت السيطرة',
      step2Desc: 'حدد ميزانيتك الشهرية وراقب وتيرة الصرف يوماً بيوم لتفادي العجز.',
      step3Title: 'بياناتك ملكك بالكامل أوفلاين',
      step3Desc: 'خصوصية كاملة وحماية بالبصمة دون أي اتصال بخوادم خارجية.',
      budget: 'الميزانية الشهرية المقترحة',
      skip: 'تخطي',
      next: 'التالي',
      start: 'ابدأ الآن',
    },
    addExpense: {
      title: 'إضافة معاملة',
      cancel: 'إلغاء',
      save: 'حفظ',
      amount: 'المبلغ',
      category: 'التصنيف',
      paidFrom: 'من حساب',
      date: 'التاريخ',
      noteOptional: 'ملاحظة (اختياري)',
    },
  },
  en: {
    nav: {
      home: 'Home',
      transactions: 'Transactions',
      addExpense: 'Add Expense',
      insights: 'Insights',
      settings: 'Settings',
    },
    home: {
      netWorth: 'Total Net Worth',
      todaySpending: "Today's Spent",
      remaining: 'Remaining',
      recentTransactions: 'Recent Transactions',
      viewAll: 'View All',
      noTransactionsYet: 'No transactions recorded yet',
      transfer: 'Transfer',
    },
    transactions: {
      all: 'All',
      expenses: 'Expenses',
      income: 'Income',
      transfers: 'Transfers',
      today: 'Today',
      yesterday: 'Yesterday',
      searchPlaceholder: 'Search transactions and notes...',
      noTransactionsFound: 'No transactions found',
      noMatchingFilters: 'No transactions match selected filters',
      clearFilters: 'Clear Filters',
      filter: 'Filter',
      filterTransactions: 'Filter Transactions',
      resetFilters: 'Reset',
      type: 'Transaction Type',
      category: 'Category',
      account: 'Account',
      dateRange: 'Date Range',
      from: 'From',
      to: 'To',
      amountRange: 'Amount Range',
      minAmount: 'Min Amount',
      maxAmount: 'Max Amount',
      noLimit: 'No Limit',
      sortBy: 'Sort By',
      newest: 'Newest First',
      oldest: 'Oldest First',
      highest: 'Highest Amount',
      lowest: 'Lowest Amount',
      clearAll: 'Deselect All',
      applyFilters: 'Apply Filters',
    },
    insights: {
      title: 'Financial Insights',
      current: 'Current Month',
      nextMonth: 'Next Month',
      previousMonth: 'Previous Month',
      jumpToCurrentMonth: 'Back to Current Month',
      noDataForMonth: 'No data recorded for {month}',
      addExpense: 'Add New Transaction',
      calendarDays: 'Days of Month',
      dayOf: 'Day',
      txns: 'txns',
      catModalTotal: 'Total',
      catModalShare: 'Share',
      catModalAverage: 'Average',
      catModalLargest: 'Largest',
      catModalTxns: 'Transactions',
      catModalDateTime: 'Date & Time',
      catModalEmpty: 'No transactions recorded for this category this month',
    },
    detail: {
      title: 'Transaction Details',
      edit: 'Edit',
      delete: 'Delete',
      date: 'Date',
      time: 'Time',
      account: 'Account',
      fromAccount: 'From Account',
      toAccount: 'To Account',
      merchant: 'Payee / Merchant',
      notes: 'Notes',
      confirmDelete: 'Are you sure you want to delete this transaction?',
      confirmDeleteDesc: 'This action cannot be undone.',
      close: 'Close',
      editTransfer: 'Edit Transfer',
    },
    settings: {
      title: 'Settings',
      currency: 'Currency',
      theme: 'Theme',
      language: 'Language',
      fontSize: 'Font Size',
      accounts: 'Accounts & Wallets',
      accountName: 'Account Name',
      accountType: 'Account Type',
      openingBalance: 'Opening Balance',
      addAccountModal: 'Add New Account',
      editAccountModal: 'Edit Account',
      categories: 'Categories',
      categoryName: 'Category Name',
      addCategory: 'Add Category',
      recurring: 'Recurring Transactions',
      addRecurring: 'Add Recurring Rule',
      frequency: 'Frequency',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      monthlyBudget: 'Monthly Budget',
      saveBudget: 'Save Budget',
      dataStorage: 'Data & Backup',
      resetData: 'Clear All Data & Reset',
      resetNow: 'Clear All Data',
      confirmReset: 'Confirm Data Reset?',
      confirmResetDesc: 'This will permanently wipe all transactions, accounts, and categories.',
      restoreConfirmTitle: 'Restore Backup Data',
      restoreConfirmDesc: 'This will overwrite your existing data with the backup file.',
      restoreConfirmAction: 'Restore & Replace',
      cancel: 'Cancel',
    },
    onboarding: {
      step1Title: 'Track Expenses Instantly',
      step1Desc: 'Log transactions in 1-tap and understand your spending patterns.',
      step2Title: 'Budget Under Control',
      step2Desc: 'Set your monthly targets and track daily pacing smoothly.',
      step3Title: '100% Private & Offline',
      step3Desc: 'Complete security, biometric locking, no external servers required.',
      budget: 'Target Monthly Budget',
      skip: 'Skip',
      next: 'Next',
      start: 'Get Started',
    },
    addExpense: {
      title: 'Add Transaction',
      cancel: 'Cancel',
      save: 'Save',
      amount: 'Amount',
      category: 'Category',
      paidFrom: 'Paid From',
      date: 'Date',
      noteOptional: 'Note (optional)',
    },
  },
};

export type Translations = typeof translations.ar;

const ARABIC_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ENGLISH_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ENGLISH_MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function formatMonthLabel(monthPrefix: string, lang: Language | string = 'ar'): string {
  if (!monthPrefix) return '';
  const parts = monthPrefix.split('-');
  const year = parts[0];
  const monthIdx = (parseInt(parts[1], 10) || 1) - 1;
  const isArabic = lang === 'ar';
  const monthName = isArabic ? ARABIC_MONTH_NAMES[monthIdx] || '' : ENGLISH_MONTH_NAMES[monthIdx] || '';
  return `${monthName} ${year}`;
}

export function formatMonthShortLabel(monthPrefix: string, lang: Language | string = 'ar'): string {
  if (!monthPrefix) return '';
  const parts = monthPrefix.split('-');
  const year = parts[0];
  const monthIdx = (parseInt(parts[1], 10) || 1) - 1;
  const isArabic = lang === 'ar';
  const monthName = isArabic ? ARABIC_MONTH_NAMES[monthIdx] || '' : ENGLISH_MONTH_NAMES_SHORT[monthIdx] || '';
  return `${monthName} ${year}`;
}

const ARABIC_DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

const ENGLISH_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

function toArabicDigits(val: string | number): string {
  const str = String(val);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, (w) => arabicDigits[+w]);
}

export function formatDateLabel(dateStr: string, lang: Language | string = 'ar'): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);

      const currentYear = new Date().getFullYear();

      if (lang === 'ar') {
        const dayName = ARABIC_DAY_NAMES[date.getDay()] || '';
        const monthName = ARABIC_MONTH_NAMES[month] || '';
        const dayFormatted = toArabicDigits(day);
        if (year !== currentYear) {
          return `${dayName} ${dayFormatted} ${monthName} ${toArabicDigits(year)}`;
        }
        return `${dayName} ${dayFormatted} ${monthName}`;
      } else {
        const dayName = ENGLISH_DAY_NAMES[date.getDay()] || '';
        const monthName = ENGLISH_MONTH_NAMES_SHORT[month] || '';
        if (year !== currentYear) {
          return `${dayName}, ${day} ${monthName} ${year}`;
        }
        return `${dayName}, ${day} ${monthName}`;
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
}

const CATEGORY_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  'طعام وغذاء': { ar: 'طعام وغذاء', en: 'Food & Dining' },
  'Food & Dining': { ar: 'طعام وغذاء', en: 'Food & Dining' },
  'سكن وفواتير': { ar: 'سكن وفواتير', en: 'Housing & Bills' },
  'Housing & Bills': { ar: 'سكن وفواتير', en: 'Housing & Bills' },
  'مواصلات': { ar: 'مواصلات', en: 'Transportation' },
  'Transportation': { ar: 'مواصلات', en: 'Transportation' },
  'تسوق': { ar: 'تسوق', en: 'Shopping' },
  'Shopping': { ar: 'تسوق', en: 'Shopping' },
  'صحة وعلاج': { ar: 'صحة وعلاج', en: 'Healthcare' },
  'Healthcare': { ar: 'صحة وعلاج', en: 'Healthcare' },
  'ترفيه': { ar: 'ترفيه', en: 'Entertainment' },
  'Entertainment': { ar: 'ترفيه', en: 'Entertainment' },
  'تعليم': { ar: 'تعليم', en: 'Education' },
  'Education': { ar: 'تعليم', en: 'Education' },
  'أخرى': { ar: 'أخرى', en: 'Other' },
  'Other': { ar: 'أخرى', en: 'Other' },
  'راتب شهري': { ar: 'راتب شهري', en: 'Salary' },
  'Salary': { ar: 'راتب شهري', en: 'Salary' },
  'عمل حر': { ar: 'عمل حر', en: 'Freelance' },
  'Freelance': { ar: 'عمل حر', en: 'Freelance' },
  'استثمارات': { ar: 'استثمارات', en: 'Investments' },
  'Investments': { ar: 'استثمارات', en: 'Investments' },
  'هدايا ومكافآت': { ar: 'هدايا ومكافآت', en: 'Gifts & Bonuses' },
  'Gifts & Bonuses': { ar: 'هدايا ومكافآت', en: 'Gifts & Bonuses' },
  'دخل آخر': { ar: 'دخل آخر', en: 'Other Income' },
  'Other Income': { ar: 'دخل آخر', en: 'Other Income' },
};

export function getCategoryDisplayName(name: string, lang: Language | string = 'ar'): string {
  if (!name) return '';
  const item = CATEGORY_NAMES_MAP[name.trim()];
  if (item) {
    return lang === 'en' ? item.en : item.ar;
  }
  return name;
}

const ACCOUNT_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  'كاش': { ar: 'كاش', en: 'Cash' },
  'Cash': { ar: 'كاش', en: 'Cash' },
  'حساب بنكي': { ar: 'حساب بنكي', en: 'Bank Account' },
  'Bank Account': { ar: 'حساب بنكي', en: 'Bank Account' },
  'محفظة إلكترونية': { ar: 'محفظة إلكترونية', en: 'E-Wallet' },
  'E-Wallet': { ar: 'محفظة إلكترونية', en: 'E-Wallet' },
  'بطاقة ائتمان': { ar: 'بطاقة ائتمان', en: 'Credit Card' },
  'Credit Card': { ar: 'بطاقة ائتمان', en: 'Credit Card' },
};

export function getAccountDisplayName(name: string, lang: Language | string = 'ar'): string {
  if (!name) return '';
  const item = ACCOUNT_NAMES_MAP[name.trim()];
  if (item) {
    return lang === 'en' ? item.en : item.ar;
  }
  return name;
}

const ACCOUNT_TYPES_MAP: Record<string, { ar: string; en: string }> = {
  cash: { ar: 'كاش ونقدي', en: 'Cash' },
  bank: { ar: 'حساب بنكي', en: 'Bank Account' },
  wallet: { ar: 'محفظة إلكترونية', en: 'E-Wallet' },
  card: { ar: 'بطاقة ائتمان', en: 'Credit Card' },
  savings: { ar: 'حساب توفير', en: 'Savings Account' },
  investment: { ar: 'استثمار', en: 'Investment' },
  other: { ar: 'أخرى', en: 'Other' },
};

export function getAccountTypeDisplayName(type: string, lang: Language | string = 'ar'): string {
  if (!type) return '';
  const item = ACCOUNT_TYPES_MAP[type.toLowerCase()];
  if (item) {
    return lang === 'en' ? item.en : item.ar;
  }
  return type;
}

const FREQUENCY_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  daily: { ar: 'يومي', en: 'Daily' },
  weekly: { ar: 'أسبوعي', en: 'Weekly' },
  monthly: { ar: 'شهري', en: 'Monthly' },
  yearly: { ar: 'سنوي', en: 'Yearly' },
};

export function getFrequencyDisplayName(freq: string, lang: Language | string = 'ar'): string {
  if (!freq) return '';
  const item = FREQUENCY_NAMES_MAP[freq.toLowerCase()];
  if (item) {
    return lang === 'en' ? item.en : item.ar;
  }
  return freq;
}
