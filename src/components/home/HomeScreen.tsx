import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { AccountIcon } from '../common/AccountIcon';
import { SwipeableTransactionItem } from '../transactions/SwipeableTransactionItem';
import { WalletManagementModal } from '../tools/WalletManagementModal';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { 
  formatCurrency, 
  getTodayExpenses, 
  getLocalDateString,
  toArabicNumerals,
  sumMoney,
  getCurrencySymbol
} from '../../utils/calculations';
import { 
  getCategoryDisplayName, 
  getAccountDisplayName, 
  getAccountTypeDisplayName,
  formatDateLabel 
} from '../../utils/i18n';
import { 
  Plus, 
  ChevronRight, 
  Calendar, 
  ArrowLeftRight, 
  Wallet, 
  Eye, 
  EyeOff, 
  X,
  SlidersHorizontal,
  Target
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { QuickBudgetModal } from './QuickBudgetModal';

export const HomeScreen: React.FC = () => {
  const { 
    expenses, 
    categories, 
    accounts,
    accountSummaries,
    budget,
    budgetPace, 
    updateBudgetAmount,
    referenceDate,
    settings, 
    openAddExpense, 
    setViewingExpense,
    setEditingExpense,
    removeExpense,
    duplicateExpense,
    setActiveTab,
    setFilters,
    isPrivacyMode,
    togglePrivacyMode,
    language,
    numberFormat,
    t
  } = useApp();

  const formatNum = (val: number | string) => {
    return language === 'ar' ? toArabicNumerals(val) : String(val);
  };

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [dismissEveningPing, setDismissEveningPing] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  useBodyScrollLock(isWalletModalOpen || Boolean(selectedWalletId));
  useBackHandler(Boolean(selectedWalletId), () => setSelectedWalletId(null), 'quick-wallet-sheet');

  const selectedWalletSummary = useMemo(() => {
    if (!selectedWalletId) return null;
    return accountSummaries.summaries.find(s => s.account.id === selectedWalletId) || null;
  }, [selectedWalletId, accountSummaries]);

  const selectedWalletExpenses = useMemo(() => {
    if (!selectedWalletId) return [];
    return expenses
      .filter(e => !e.isDeleted && (e.accountId === selectedWalletId || e.paymentMethodId === selectedWalletId || e.fromAccountId === selectedWalletId || e.toAccountId === selectedWalletId))
      .slice(0, 4);
  }, [selectedWalletId, expenses]);

  // Wallets configured to show on Home (controlled per-wallet in account list)
  const visibleHomeWallets = useMemo(() => {
    return accountSummaries.summaries.filter(s => s.account.isActive && Boolean(s.account.showOnHome));
  }, [accountSummaries]);

  const isEvening = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 20;
  }, []);

  // Today's spending summary
  const todayData = useMemo(() => {
    const todayStr = getLocalDateString(referenceDate);
    return getTodayExpenses(expenses, todayStr);
  }, [expenses, referenceDate]);

  // Today's income summary
  const todayIncome = useMemo(() => {
    const todayStr = getLocalDateString(referenceDate);
    const incItems = expenses.filter(e => !e.isDeleted && e.type === 'income' && e.date === todayStr);
    return sumMoney(incItems.map(e => e.amount));
  }, [expenses, referenceDate]);

  const getTodayTransactionsCountLabel = (count: number) => {
    if (language === 'ar') {
      if (count === 1) return 'معاملة واحدة اليوم';
      if (count === 2) return 'معاملتان اليوم';
      if (count >= 3 && count <= 10) return `${formatNum(count)} معاملات اليوم`;
      return `${formatNum(count)} معاملة اليوم`;
    }
    return count === 1 ? '1 transaction today' : `${formatNum(count)} transactions today`;
  };

  // Recent 4 transactions
  const recentTransactions = useMemo(() => {
    return [...expenses]
      .filter(e => !e.isDeleted)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .slice(0, 4);
  }, [expenses]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  const hasBudget = budgetPace.status !== 'no_budget' && budgetPace.budget !== null && budgetPace.budget > 0;
  const todayStr = getLocalDateString(referenceDate);

  const availableAmount = hasBudget ? (budgetPace.requiredRemainingDailyAverage || 0) : todayData.total;
  const rawFormattedAvailable = Math.round(availableAmount).toLocaleString('en-US');
  const formattedAvailableNumber = isPrivacyMode 
    ? '••••' 
    : (language === 'ar' ? toArabicNumerals(rawFormattedAvailable) : rawFormattedAvailable);
  const currencyAbbr = getCurrencySymbol(settings.currency, language);

  return (
    <div className="space-y-3.5 pb-6 text-slate-900 dark:text-slate-100">
      {/* 1. TOP HEADER: DATE & ACTION ICONS */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {formatDateLabel(todayStr, language)}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Privacy Eye Toggle */}
          <button
            type="button"
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? (language === 'ar' ? 'إظهار الأرقام' : 'Show amounts') : (language === 'ar' ? 'إخفاء الأرقام' : 'Hide amounts')}
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-2xs ${
              isPrivacyMode 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          {/* Day of Month Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-semibold shadow-2xs">
            <Calendar size={13} className="text-blue-600 dark:text-blue-400" />
            <span>
              {hasBudget && budgetPace.daysRemaining > 0 
                ? (language === 'ar' ? `باقي ${formatNum(budgetPace.daysRemaining)} يوماً` : `${formatNum(budgetPace.daysRemaining)}d left`)
                : (language === 'ar' ? `اليوم ${formatNum(budgetPace.daysElapsed)}` : `Day ${formatNum(budgetPace.daysElapsed)}`)}
            </span>
          </div>
        </div>
      </div>

      {/* EVENING PING BANNER (Only in evening if 0 expenses logged) */}
      {isEvening && !dismissEveningPing && todayData.count === 0 && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🌙</span>
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">
              {language === 'ar' ? 'هل نسيت تسجيل مصاريف اليوم؟' : "Did you forget today's expenses?"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => openAddExpense()}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              {language === 'ar' ? 'سجل الآن' : 'Log now'}
            </button>
            <button
              type="button"
              onClick={() => setDismissEveningPing(true)}
              className="p-1 text-amber-600/70 hover:text-amber-800 dark:text-amber-400 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 2. UNIFIED HERO OBSIDIAN CARD (Compact & Slim) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 bg-gradient-to-br from-[#070b14] via-[#0d1527] to-[#151c38] text-white shadow-none border border-blue-500/20 space-y-2.5">
        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* 1. صرفت اليوم: [المبلغ بارز] [عدد المعاملات] */}
        <div className="relative flex items-center justify-between whitespace-nowrap gap-2 min-w-0">
          <div className="flex items-baseline gap-2 truncate min-w-0">
            <span className="text-xs sm:text-sm font-bold text-slate-300 select-none shrink-0">
              {t.home.todaySpending}:
            </span>
            <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent tracking-tight truncate">
              {formatCurrency(todayData.total, settings.currency, language, isPrivacyMode, numberFormat)}
            </span>
          </div>

          {todayData.count > 0 && (
            <span className="text-[10px] sm:text-[11px] text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full font-medium shrink-0 select-none border border-white/5">
              {getTodayTransactionsCountLabel(todayData.count)}
            </span>
          )}
        </div>

        {/* 2. دخل اليوم: [+المبلغ بلون أخضر] */}
        {todayIncome > 0 && (
          <div className="relative flex items-center justify-between whitespace-nowrap text-xs pt-1 border-t border-white/10 text-emerald-400 font-semibold min-w-0">
            <span className="truncate">{language === 'ar' ? 'دخل اليوم:' : "Today's income:"}</span>
            <span className="shrink-0 font-bold">+{formatCurrency(todayIncome, settings.currency, language, isPrivacyMode, numberFormat)}</span>
          </div>
        )}

        {/* 3. المتبقي من الميزانية: [المبلغ] (٪ مستهلك) */}
        <div className="relative flex items-center justify-between whitespace-nowrap text-xs pt-1.5 border-t border-white/10 min-w-0">
          <span className="text-slate-300 font-medium truncate">
            {language === 'ar' ? 'المتبقي من الميزانية:' : t.home.remaining}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-bold text-white">
              {hasBudget ? formatCurrency(budgetPace.remaining || 0, settings.currency, language, isPrivacyMode, numberFormat) : '—'}
            </span>
            {hasBudget && (
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                title={language === 'ar' ? 'تعديل الميزانية' : 'Edit Budget'}
                className="text-[10px] text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>({formatNum(budgetPace.percentUsed ?? 0)}{language === 'ar' ? '٪ مستهلك' : '% used'})</span>
                <Target size={11} className="text-amber-300" />
              </button>
            )}
          </div>
        </div>

        {/* 4. شريط التقدم الملون */}
        {hasBudget && budgetPace.percentUsed !== null ? (
          <div className="relative space-y-1.5 pt-0.5">
            <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, Math.max(0, budgetPace.percentUsed))}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPace.status === 'over_budget' 
                    ? 'bg-rose-500' 
                    : budgetPace.status === 'watch' || budgetPace.status === 'attention' 
                    ? 'bg-amber-400' 
                    : 'bg-emerald-400'
                }`}
              />
            </div>
            {/* 5. باقي X يوماً · المتاح اليوم: [المبلغ] */}
            <div className="flex items-center justify-between whitespace-nowrap text-[11px] text-slate-300 min-w-0">
              <span className="truncate">
                {budgetPace.daysRemaining > 1 
                  ? (language === 'ar' ? `باقي ${formatNum(budgetPace.daysRemaining)} يوماً` : `${formatNum(budgetPace.daysRemaining)} days left`) 
                  : (language === 'ar' ? 'اليوم الأخير' : 'Final day')}
              </span>
              <span className="shrink-0">
                {language === 'ar' ? 'المتاح اليوم: ' : 'Daily allowance: '}
                <strong className="text-amber-300 font-bold">{formattedAvailableNumber}{currencyAbbr ? ` ${currencyAbbr}` : ''}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="relative pt-1 flex items-center justify-between gap-3">
            <span className="text-slate-300 text-xs font-medium">
              {language === 'ar' ? 'لم يتم تحديد ميزانية' : 'No budget set'}
            </span>
            <button
              type="button"
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Target size={14} className="text-amber-300" />
              <span>{language === 'ar' ? 'تحديد ميزانية الشهر' : 'Set Monthly Budget'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. MULTI-WALLET HORIZONTAL STRIP (Rendered when user activates showOnHome on wallets) */}
      {visibleHomeWallets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Wallet size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {language === 'ar' ? 'محافظك' : 'Wallets'}
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.home.netWorth}: <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(accountSummaries.totalNetWorth, settings.currency, language, isPrivacyMode, numberFormat)}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAddExpense({ type: 'transfer' })}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <ArrowLeftRight size={13} className="rtl:rotate-180" />
                <span>{t.home.transfer}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={language === 'ar' ? 'إدارة المحافظ' : 'Manage Wallets'}
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          {/* Wallets Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {visibleHomeWallets.map(s => {
                const isOwed = s.currentBalance < 0;
                const accColor = s.account.color || '#3B82F6';

                return (
                  <div
                    key={s.account.id}
                    onClick={() => setSelectedWalletId(s.account.id)}
                    className="min-w-[130px] max-w-[160px] shrink-0 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all active:scale-98 relative overflow-hidden select-none"
                  >
                    {/* Top colored accent indicator */}
                    <div 
                      className="absolute top-0 inset-x-0 h-0.5" 
                      style={{ backgroundColor: accColor }} 
                    />

                    <div className="flex items-center gap-1.5 min-w-0">
                      <AccountIcon name={s.account.icon || s.account.type} color={accColor} size={14} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {getAccountDisplayName(s.account.name, language)}
                      </span>
                    </div>
                    <div>
                      <span className={`text-sm font-black block tracking-tight ${
                        isOwed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                      }`}>
                        {formatCurrency(s.currentBalance, settings.currency, language, isPrivacyMode, numberFormat)}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Quick Add / Manage Button Card */}
            <button
              type="button"
              onClick={() => setIsWalletModalOpen(true)}
              className="min-w-[70px] shrink-0 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all active:scale-95"
              title={language === 'ar' ? 'إضافة أو إدارة المحافظ' : 'Add / Manage Wallets'}
            >
              <Plus size={16} />
              <span className="text-[10px] font-bold">{language === 'ar' ? 'محفظة' : 'Wallet'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. RECENT TRANSACTIONS (Clean tap-to-view, swipe is in Transactions only) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t.home.recentTransactions}
          </h2>
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{t.home.viewAll}</span>
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              {t.home.noTransactionsYet}
            </p>
            <button
              type="button"
              onClick={() => openAddExpense()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
            >
              <span>{t.nav.addExpense}</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {recentTransactions.map(exp => {
              const cat = categoryMap.get(exp.categoryId);
              const fromAcc = accounts.find(a => a.id === (exp.fromAccountId || exp.accountId));
              const toAcc = accounts.find(a => a.id === exp.toAccountId);

              return (
                <SwipeableTransactionItem
                  key={exp.id}
                  expense={exp}
                  category={cat}
                  fromAccount={fromAcc}
                  toAccount={toAcc}
                  currency={settings.currency}
                  language={language}
                  numberFormat={numberFormat}
                  isPrivacyMode={isPrivacyMode}
                  onClick={() => {
                    setEditingExpense(exp);
                    openAddExpense();
                  }}
                  onEdit={() => {
                    setEditingExpense(exp);
                    openAddExpense();
                  }}
                  onDelete={() => removeExpense(exp.id)}
                  onDuplicate={() => duplicateExpense(exp)}
                  transferLabel={t.home.transfer}
                  editLabel={language === 'ar' ? 'تعديل' : 'Edit'}
                  deleteLabel={language === 'ar' ? 'حذف' : 'Delete'}
                  duplicateLabel={language === 'ar' ? 'تكرار' : 'Duplicate'}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Wallet Peek Bottom Sheet */}
      {selectedWalletSummary && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedWalletId(null)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Color Accent */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AccountIcon 
                  type={selectedWalletSummary.account.type} 
                  color={selectedWalletSummary.account.color} 
                  size={20} 
                  showBackground 
                  className="p-2.5 rounded-xl shadow-xs" 
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {getAccountDisplayName(selectedWalletSummary.account.name, language)}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {getAccountTypeDisplayName(selectedWalletSummary.account.type, language)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWalletId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Balance Card */}
            <div 
              className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
              style={{ 
                borderRightWidth: language === 'ar' ? 4 : 1, 
                borderLeftWidth: language === 'ar' ? 1 : 4, 
                borderColor: selectedWalletSummary.account.color || '#3B82F6' 
              }}
            >
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  {language === 'ar' ? 'الرصيد الفعلي الحالي' : 'Current Balance'}
                </span>
                <span className={`text-2xl font-black tracking-tight ${
                  selectedWalletSummary.currentBalance < 0 
                    ? 'text-rose-600 dark:text-rose-400' 
                    : 'text-slate-900 dark:text-white'
                }`}>
                  {formatCurrency(selectedWalletSummary.currentBalance, settings.currency, language, isPrivacyMode, numberFormat)}
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const accId = selectedWalletSummary.account.id;
                  setSelectedWalletId(null);
                  openAddExpense({ type: 'transfer', fromAccountId: accId });
                }}
                className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <ArrowLeftRight size={14} className="rtl:rotate-180" />
                <span>{language === 'ar' ? 'تحويل أموال' : 'Transfer'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const accId = selectedWalletSummary.account.id;
                  setSelectedWalletId(null);
                  setFilters(prev => ({
                    ...prev,
                    paymentMethodIds: [accId],
                  }));
                  setActiveTab('transactions');
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span>{language === 'ar' ? 'كل المعاملات' : 'All Transactions'}</span>
                <ChevronRight size={14} className="rtl:rotate-180" />
              </button>
            </div>

            {/* Recent 4 Transactions for this wallet */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold px-0.5">
                <span>{language === 'ar' ? 'آخر العمليات بالمحفظة' : 'Recent Wallet Activity'}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  ({formatNum(selectedWalletExpenses.length)})
                </span>
              </div>

              {selectedWalletExpenses.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  {language === 'ar' ? 'لا توجد معاملات مسجلة لهذه المحفظة بعد' : 'No transactions recorded for this wallet yet'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                  {selectedWalletExpenses.map(exp => {
                    const cat = categories.find(c => c.id === exp.categoryId);
                    const isExp = exp.type === 'expense';
                    const isTransfer = exp.type === 'transfer';
                    const todayStr = getLocalDateString(referenceDate);

                    return (
                      <div
                        key={exp.id}
                        onClick={() => {
                          setSelectedWalletId(null);
                          setEditingExpense(exp);
                          openAddExpense();
                        }}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pe-2">
                          <CategoryIcon name={cat?.icon || 'Tag'} color={cat?.color || '#3B82F6'} size={14} />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block leading-normal" title={exp.merchant || exp.note || getCategoryDisplayName(cat?.name || 'Other', language)}>
                              {exp.merchant || exp.note || getCategoryDisplayName(cat?.name || 'Other', language)}
                            </span>
                            <span className="text-[10px] text-slate-400 block leading-normal">
                              {formatDateLabel(exp.date, language)}
                            </span>
                          </div>
                        </div>

                        <span className={`text-xs font-black shrink-0 ${
                          isExp 
                            ? 'text-slate-800 dark:text-slate-200' 
                            : isTransfer 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isTransfer ? '⇄ ' : isExp ? '− ' : '+ '}
                          {formatCurrency(exp.amount, settings.currency, language, isPrivacyMode, numberFormat)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <WalletManagementModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />

      <QuickBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={budget?.amount || 0}
        currencySymbol={currencyAbbr}
        onSave={async (newAmount) => {
          await updateBudgetAmount(newAmount);
        }}
        language={language}
      />
    </div>
  );
};
