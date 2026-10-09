import React from 'react';
import { Category, Expense } from '../../types';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/calculations';
import { getCategoryDisplayName } from '../../utils/i18n';
import { useApp } from '../../context/AppContext';
import { X, ArrowLeft } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';

interface CategoryDetailModalProps {
  category: Category | null;
  expenses: Expense[];
  currency: string;
  totalPeriodSpend: number;
  monthLabel?: string;
  onClose: () => void;
  onSelectTransaction: (expense: Expense) => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  category,
  expenses,
  currency,
  totalPeriodSpend,
  monthLabel,
  onClose,
  onSelectTransaction,
}) => {
  const { language, t } = useApp();

  useBodyScrollLock(Boolean(category));
  useBackHandler(Boolean(category), onClose, 'category-detail');

  if (!category) return null;

  const categoryExpenses = expenses
    .filter(e => e.categoryId === category.id && !e.isDeleted && e.type === 'expense')
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
  const count = categoryExpenses.length;
  const average = count > 0 ? Math.round(total / count) : 0;
  const percentage = totalPeriodSpend > 0 ? Number(((total / totalPeriodSpend) * 100).toFixed(1)) : 0;

  const largestTransaction = categoryExpenses.length > 0 
    ? [...categoryExpenses].sort((a, b) => b.amount - a.amount)[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} onTouchMove={e => e.preventDefault()} />
      <div 
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 z-10"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ms-1 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'ar' ? 'رجوع' : 'Back'}
            >
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
            <CategoryIcon name={category.icon} color={category.color} size={20} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {getCategoryDisplayName(category.name, language)}
              </h2>
              {monthLabel && (
                <span className="text-[11px] font-medium text-slate-400 block">
                  {monthLabel}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-modal-close="true"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label={t.detail.close}
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Stats Overview */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.insights.catModalTotal}</span>
            <span className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 block truncate">
              {formatCurrency(total, currency, language)}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.insights.catModalShare}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-xs mt-0.5 block">
              {percentage}%
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.insights.catModalAverage}</span>
            <span className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 block truncate">
              {formatCurrency(average, currency, language)}
            </span>
          </div>

          <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">{t.insights.catModalLargest}</span>
            <span className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 block truncate">
              {largestTransaction ? formatCurrency(largestTransaction.amount, currency, language) : '—'}
            </span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 px-1">
            <span>{t.insights.catModalTxns} ({count})</span>
            <span>{t.insights.catModalDateTime}</span>
          </div>

          {categoryExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              {t.insights.catModalEmpty}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              {categoryExpenses.map(exp => (
                <div
                  key={exp.id}
                  onClick={() => {
                    onSelectTransaction(exp);
                    onClose();
                  }}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-xs"
                >
                  <div className="min-w-0 flex-1 pe-2">
                    <span className="font-semibold text-slate-900 dark:text-white block truncate leading-normal" title={exp.note || exp.merchant || getCategoryDisplayName(category.name, language)}>
                      {exp.note || exp.merchant || getCategoryDisplayName(category.name, language)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                      {exp.date} · {exp.time || '12:00'}
                    </span>
                  </div>

                  <span className="font-bold text-slate-900 dark:text-white shrink-0">
                    − {formatCurrency(exp.amount, currency, language)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
