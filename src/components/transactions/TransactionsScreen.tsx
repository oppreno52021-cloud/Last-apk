import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FilterBottomSheet } from './FilterBottomSheet';
import { formatCurrency, addMoney, getLocalDateString, formatNumber } from '../../utils/calculations';
import { formatDateLabel } from '../../utils/i18n';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Plus, 
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Expense } from '../../types';
import { SwipeableTransactionItem } from './SwipeableTransactionItem';
import { useBackHandler } from '../../hooks/useBackHandler';

export const TransactionsScreen: React.FC = () => {
  const { 
    filteredExpenses, 
    categories, 
    accounts, 
    filters, 
    setFilters, 
    resetFilters,
    settings, 
    referenceDate,
    setViewingExpense,
    setEditingExpense,
    removeExpense,
    duplicateExpense,
    openAddExpense,
    setActiveTab,
    isPrivacyMode,
    language,
    numberFormat,
    t
  } = useApp();

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useBackHandler(Boolean(filters.search.trim()), () => setFilters(prev => ({ ...prev, search: '' })), 'trans-search');

  const formatNum = (val: number | string) => formatNumber(val, language, numberFormat);

  // Active filter count calculation
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.categoryIds.length > 0) count += filters.categoryIds.length;
    if (filters.paymentMethodIds.length > 0) count += filters.paymentMethodIds.length;
    if (filters.startDate || filters.endDate) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0 || Boolean(filters.search.trim());

  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c]));
  }, [categories]);

  // Group transactions by date with daily totals
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: { date: string; displayLabel: string; items: Expense[]; total: number } } = {};
    const todayStr = getLocalDateString(referenceDate);
    const yesterdayDate = new Date(referenceDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    filteredExpenses.forEach(exp => {
      if (!groups[exp.date]) {
        const label = formatDateLabel(exp.date, language);

        groups[exp.date] = {
          date: exp.date,
          displayLabel: label,
          items: [],
          total: 0,
        };
      }

      groups[exp.date].items.push(exp);
      if (exp.type === 'expense') {
        groups[exp.date].total = addMoney(groups[exp.date].total, exp.amount);
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExpenses, referenceDate, t, language]);

  return (
    <div className="space-y-3.5 pb-6 text-slate-900 dark:text-slate-100">
      {/* Search & Filter Header with Back to Home Button */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
          title={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
          aria-label={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </button>

        <div className="relative flex-1">
          <Search size={18} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder={t.transactions.searchPlaceholder}
            className="w-full ps-10 pe-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Trigger Button */}
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          className={`p-2.5 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
            activeFilterCount > 0
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
          title={t.transactions.filter}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="ms-0.5 px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-xs font-bold">
              {formatNum(activeFilterCount)}
            </span>
          )}
        </button>
      </div>

      {/* Filter Type Quick Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {[
          { id: 'all', label: t.transactions.all },
          { id: 'expense', label: t.transactions.expenses },
          { id: 'income', label: t.transactions.income },
          { id: 'transfer', label: t.transactions.transfers },
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilters(prev => ({ ...prev, type: item.id as any }))}
            className={`py-1.5 px-3 rounded-xl border text-sm font-semibold shrink-0 transition-all cursor-pointer ${
              filters.type === item.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Active Filter Bar Indicator with Clear All & Total Amount */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 animate-in fade-in">
          <div className="flex items-center gap-2 truncate text-xs">
            <span className="font-semibold">{language === 'ar' ? 'نتائج الفلترة:' : 'Filtered results:'}</span>
            <span>{formatNum(filteredExpenses.length)} {language === 'ar' ? 'معاملة' : 'txns'}</span>
            <span className="text-blue-400 dark:text-blue-600">·</span>
            <span className="font-bold text-blue-800 dark:text-blue-300">
              {formatCurrency(
                filteredExpenses.reduce((sum, exp) => exp.type === 'expense' ? addMoney(sum, exp.amount) : sum, 0),
                settings.currency,
                language,
                isPrivacyMode,
                numberFormat
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-xs shrink-0 ms-2"
          >
            <RotateCcw size={13} />
            <span>{t.transactions.clearFilters}</span>
          </button>
        </div>
      )}

      {/* Grouped Transactions List */}
      {groupedTransactions.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <p className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t.transactions.noTransactionsFound}
          </p>
          {hasActiveFilters && (
            <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2 mb-4 max-w-xs mx-auto">
              {t.transactions.noMatchingFilters}
            </p>
          )}
          <button
            type="button"
            onClick={() => hasActiveFilters ? resetFilters() : openAddExpense()}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center cursor-pointer shadow-xs"
          >
            <span>{hasActiveFilters ? t.transactions.clearFilters : t.nav.addExpense}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedTransactions.map(group => (
            <div key={group.date} className="space-y-1.5">
              {/* Date Group Header with Daily Total */}
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {group.displayLabel}
                </span>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatNum(group.items.length)} {group.items.length === 1 ? (language === 'ar' ? 'معاملة' : 'item') : (language === 'ar' ? 'معاملات' : 'items')}</span>
                  {group.total > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(group.total, settings.currency, language, isPrivacyMode, numberFormat)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Transactions in Date Group with Swipe Gestures */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                {group.items.map(exp => {
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
            </div>
          ))}
        </div>
      )}

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
      />
    </div>
  );
};
