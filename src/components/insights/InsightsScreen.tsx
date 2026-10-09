import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { CategoryDetailModal } from './CategoryDetailModal';
import { 
  formatCurrency, 
  getCurrentMonthPrefix, 
  getPreviousMonthString, 
  getNextMonthString, 
  calculateMonthInsights, 
  toArabicNumerals 
} from '../../utils/calculations';
import { 
  formatMonthLabel, 
  formatMonthShortLabel, 
  getCategoryDisplayName 
} from '../../utils/i18n';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { Category } from '../../types';

export const InsightsScreen: React.FC = () => {
  const { 
    expenses, 
    categories, 
    accounts,
    settings, 
    referenceDate, 
    setViewingExpense, 
    setEditingExpense,
    setActiveTab, 
    openAddExpense, 
    language, 
    numberFormat,
    t 
  } = useApp();

  const formatNum = (val: number | string) => {
    return language === 'ar' ? toArabicNumerals(val) : String(val);
  };

  const currentMonthPrefix = useMemo(() => getCurrentMonthPrefix(referenceDate), [referenceDate]);

  // Selected month state (default to current month)
  const [selectedMonthPrefix, setSelectedMonthPrefix] = useState<string>(currentMonthPrefix);
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<Category | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const pillsScrollRef = useRef<HTMLDivElement>(null);

  // High-performance month analytics
  const insights = useMemo(() => {
    return calculateMonthInsights(expenses, categories, selectedMonthPrefix, referenceDate, accounts, language);
  }, [expenses, categories, selectedMonthPrefix, referenceDate, accounts, language]);

  // Earliest logged month from insights timeline
  const earliestMonthPrefix = useMemo(() => {
    return insights.historical6Months[0]?.monthPrefix || currentMonthPrefix;
  }, [insights.historical6Months, currentMonthPrefix]);

  const canGoPrev = selectedMonthPrefix > earliestMonthPrefix;
  const canGoNext = selectedMonthPrefix < currentMonthPrefix;

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setSelectedMonthPrefix(prev => getPreviousMonthString(prev));
      setShowAllCategories(false);
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setSelectedMonthPrefix(prev => getNextMonthString(prev));
      setShowAllCategories(false);
    }
  };

  // Auto-scroll timeline to selected month pill
  useEffect(() => {
    if (pillsScrollRef.current) {
      const selectedEl = pillsScrollRef.current.querySelector('[data-selected="true"]');
      if (selectedEl && typeof (selectedEl as HTMLElement).scrollIntoView === 'function') {
        (selectedEl as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedMonthPrefix]);

  // Filtered expenses for category detail drill-down
  const selectedMonthExpenses = useMemo(() => {
    return expenses.filter(e => 
      !e.isDeleted && 
      e.type === 'expense' && 
      e.date.startsWith(selectedMonthPrefix)
    );
  }, [expenses, selectedMonthPrefix]);

  const displayedCategories = useMemo(() => {
    if (showAllCategories || insights.categoryBreakdown.length <= 4) {
      return insights.categoryBreakdown;
    }
    return insights.categoryBreakdown.slice(0, 4);
  }, [insights.categoryBreakdown, showAllCategories]);

  const topCategory = insights.categoryBreakdown[0];
  const isSpendingReduced = insights.monthComparison.hasPrevData && insights.monthComparison.difference < 0;
  const isSpendingIncreased = insights.monthComparison.hasPrevData && insights.monthComparison.difference > 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header with Back to Home Button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="p-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-2xs shrink-0"
          title={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
          aria-label={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {t.insights.title}
          </h1>
        </div>
      </div>

      {/* 1. MONTH TIMELINE SELECTOR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              canGoPrev
                ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
            }`}
            aria-label={t.insights.previousMonth}
          >
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatMonthLabel(selectedMonthPrefix, language)}
              </h2>
              {insights.isCurrentMonth && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                  {t.insights.current}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {insights.isCurrentMonth 
                ? t.insights.dayOf.replace('{day}', formatNum(insights.daysElapsed)).replace('{total}', formatNum(insights.daysInMonth))
                : t.insights.calendarDays.replace('{days}', formatNum(insights.daysInMonth))}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              canGoNext 
                ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' 
                : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40'
            }`}
            aria-label={t.insights.nextMonth}
          >
            <ChevronRight size={18} className="rtl:rotate-180" />
          </button>
        </div>

        {/* Scrolling Pills */}
        <div 
          ref={pillsScrollRef}
          className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {insights.historical6Months.map(m => {
            const isSelected = m.monthPrefix === selectedMonthPrefix;
            const isCurrent = m.monthPrefix === currentMonthPrefix;
            return (
              <button
                key={m.monthPrefix}
                type="button"
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => {
                  setSelectedMonthPrefix(m.monthPrefix);
                  setShowAllCategories(false);
                }}
                className={`flex-1 min-w-[76px] py-1.5 px-2.5 rounded-full text-xs font-semibold text-center whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{formatMonthShortLabel(m.monthPrefix, language)}</span>
                {isCurrent && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                    isSelected 
                      ? 'bg-white/20 text-white font-bold' 
                      : 'bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 font-bold'
                  }`}>
                    {t.insights.current}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sparse Data State */}
      {insights.transactionCount === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t.insights.noDataForMonth.replace('{month}', formatMonthLabel(selectedMonthPrefix, language))}
            </h2>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            {!insights.isCurrentMonth && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonthPrefix(currentMonthPrefix);
                  setShowAllCategories(false);
                }}
                className="px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t.insights.jumpToCurrentMonth}
              </button>
            )}
            <button
              type="button"
              onClick={() => openAddExpense()}
              className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <span>{t.insights.addExpense}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* CARD 1: THE BIG PICTURE (Clean Financial Pulse with Theme Midnight Blue) */}
          <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#070b14] via-[#0d1527] to-[#151c38] text-white border border-blue-500/20 shadow-none space-y-3.5">
            {/* Ambient glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {language === 'ar' ? 'إجمالي مصاريف الشهر' : 'Total Monthly Expenses'}
              </span>
              <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded-full border border-white/5">
                {formatNum(insights.transactionCount)} {language === 'ar' ? 'معاملة' : 'txns'}
              </span>
            </div>

            <div className="relative flex items-baseline justify-between gap-2">
              <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-200 via-sky-300 to-blue-400 bg-clip-text text-transparent tracking-tight">
                {formatCurrency(insights.totalSpent, settings.currency, language, false, numberFormat)}
              </div>

              {/* Comparison indicator */}
              {insights.monthComparison.hasPrevData && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isSpendingReduced
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : isSpendingIncreased
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                    : 'bg-white/10 border-white/10 text-slate-300'
                }`}>
                  {isSpendingReduced ? <TrendingDown size={14} /> : isSpendingIncreased ? <TrendingUp size={14} /> : null}
                  <span>
                    {isSpendingReduced ? (language === 'ar' ? 'أقل بـ ' : '−') : isSpendingIncreased ? (language === 'ar' ? 'أكثر بـ ' : '+') : ''}
                    {formatNum(Math.abs(insights.monthComparison.percentageChange ?? 0))}{language === 'ar' ? '٪' : '%'}
                  </span>
                </div>
              )}
            </div>

            {/* Sub-metrics: Daily average and optional income */}
            <div className="relative pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span>{language === 'ar' ? 'المعدل اليومي: ' : 'Daily average: '}</span>
                <strong className="text-white font-bold">
                  {formatCurrency(insights.dailyAverage, settings.currency, language, false, numberFormat)}
                </strong>
              </div>

              {(insights.totalIncome ?? 0) > 0 && (
                <div className="text-end">
                  <span>{language === 'ar' ? 'الدخل: ' : 'Income: '}</span>
                  <strong className="text-emerald-400 font-bold">
                    +{formatCurrency(insights.totalIncome ?? 0, settings.currency, language, false, numberFormat)}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: WHERE YOUR MONEY GOES (Top Categories Breakdown) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'أين ذهبت أموالك؟' : 'Where Your Money Went'}
                </h2>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {language === 'ar' ? 'أعلى فئات الصرف لهذا الشهر' : 'Top spending categories'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {displayedCategories.map(item => {
                return (
                  <div
                    key={item.category.id}
                    onClick={() => setSelectedCategoryForModal(item.category)}
                    className="p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer space-y-2 border border-slate-100/80 dark:border-slate-800/60"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      {/* Left: Icon & Name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CategoryIcon
                          name={item.category.icon}
                          size={18}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {getCategoryDisplayName(item.category.name, language)}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {formatNum(item.count)} {t.insights.txns}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount & Percent */}
                      <div className="text-end shrink-0">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {formatCurrency(item.total, settings.currency, language, false, numberFormat)}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                          {formatNum(item.percentage)}{language === 'ar' ? '٪' : '%'}
                        </span>
                      </div>
                    </div>

                    {/* Minimal Progress Bar */}
                    <div className="w-full h-1.5 bg-blue-100/60 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Show more/less toggle button if more than 4 categories */}
              {insights.categoryBreakdown.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories(prev => !prev)}
                  className="w-full py-2 rounded-xl text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ChevronDown size={14} className={showAllCategories ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  <span>
                    {showAllCategories
                      ? (language === 'ar' ? 'عرض فئات أقل' : 'Show Less')
                      : (language === 'ar'
                          ? `عرض باقي الفئات (${formatNum(insights.categoryBreakdown.length - 4)} فئات أخرى)`
                          : `View all (${formatNum(insights.categoryBreakdown.length - 4)} more)`)}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* CARD 3: SMART SUMMARY TAKEAWAY */}
          {topCategory && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-3xl p-4 sm:p-5 border border-blue-200/50 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                <Sparkles size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{language === 'ar' ? 'خلاصة الشهر' : 'Month Takeaway'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'ar' ? (
                  <>
                    بند <strong className="text-slate-900 dark:text-white font-bold">{getCategoryDisplayName(topCategory.category.name, 'ar')}</strong> هو صاحب النصيب الأكبر من نفقاتك هذا الشهر بنسبة{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">{formatNum(topCategory.percentage)}٪</strong> ({formatCurrency(topCategory.total, settings.currency, 'ar', false, numberFormat)}).
                    {insights.largestExpense && insights.largestExpense.amount > 0 && (
                      <> وكانت أكبر معاملة منفردة بقيمة <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(insights.largestExpense.amount, settings.currency, 'ar', false, numberFormat)}</strong>{insights.largestExpense.note ? ` (${insights.largestExpense.note})` : ''}.</>
                    )}
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900 dark:text-white font-bold">{getCategoryDisplayName(topCategory.category.name, 'en')}</strong> took the highest share of your spending at{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">{formatNum(topCategory.percentage)}%</strong> ({formatCurrency(topCategory.total, settings.currency, 'en', false, numberFormat)}).
                    {insights.largestExpense && insights.largestExpense.amount > 0 && (
                      <> The single largest transaction was <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(insights.largestExpense.amount, settings.currency, 'en', false, numberFormat)}</strong>{insights.largestExpense.note ? ` (${insights.largestExpense.note})` : ''}.</>
                    )}
                  </>
                )}
              </p>
            </div>
          )}
        </>
      )}

      {/* Category Detail Modal */}
      <CategoryDetailModal
        category={selectedCategoryForModal}
        expenses={selectedMonthExpenses}
        currency={settings.currency}
        totalPeriodSpend={insights.totalSpent}
        monthLabel={formatMonthLabel(selectedMonthPrefix, language)}
        onClose={() => setSelectedCategoryForModal(null)}
        onSelectTransaction={(exp) => {
          setSelectedCategoryForModal(null);
          setEditingExpense(exp);
          openAddExpense();
        }}
      />
    </div>
  );
};
