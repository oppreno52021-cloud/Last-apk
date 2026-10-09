import React from 'react';
import { useApp } from '../../context/AppContext';
import { FilterOptions } from '../../types';
import { getCategoryDisplayName, getAccountDisplayName } from '../../utils/i18n';
import { X, ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const { filters, setFilters, resetFilters, categories, accounts, language, t } = useApp();

  useBodyScrollLock(isOpen);
  useBackHandler(isOpen, onClose, 'filter-sheet');

  if (!isOpen) return null;

  const toggleCategory = (id: string) => {
    setFilters(prev => {
      const exists = prev.categoryIds.includes(id);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter(c => c !== id)
          : [...prev.categoryIds, id],
      };
    });
  };

  const togglePaymentMethod = (id: string) => {
    setFilters(prev => {
      const exists = prev.paymentMethodIds.includes(id);
      return {
        ...prev,
        paymentMethodIds: exists
          ? prev.paymentMethodIds.filter(p => p !== id)
          : [...prev.paymentMethodIds, id],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 z-10"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ms-1 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'ar' ? 'رجوع' : 'Back'}
            >
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t.transactions.filterTransactions}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-2 py-1 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>{t.transactions.resetFilters}</span>
            </button>
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
        </div>

        {/* Scrollable Filter Options */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-5 text-xs text-slate-900 dark:text-slate-100">
          {/* Transaction Type */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.transactions.type}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
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
                  className={`py-2 px-2 rounded-xl border text-xs capitalize transition-all cursor-pointer ${
                    filters.type === item.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.transactions.sortBy}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'newest', label: t.transactions.newest },
                { id: 'oldest', label: t.transactions.oldest },
                { id: 'highest', label: t.transactions.highest },
                { id: 'lowest', label: t.transactions.lowest },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, sortBy: opt.id as FilterOptions['sortBy'] }))}
                  className={`py-2 px-3 rounded-xl border text-start transition-all cursor-pointer ${
                    filters.sortBy === opt.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Multi-select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                {t.transactions.category} ({filters.categoryIds.length > 0 ? filters.categoryIds.length : t.transactions.all})
              </label>
              {filters.categoryIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, categoryIds: [] }))}
                  className="text-[11px] text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                >
                  {t.transactions.clearAll}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const isSelected = filters.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`py-1.5 px-3 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span>{getCategoryDisplayName(cat.name, language)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method / Account */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.transactions.account}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {accounts.map(acc => {
                const isSelected = filters.paymentMethodIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => togglePaymentMethod(acc.id)}
                    className={`py-1.5 px-3 rounded-lg border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {getAccountDisplayName(acc.name, language)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.transactions.dateRange}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t.transactions.from}</span>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t.transactions.to}</span>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t.transactions.amountRange}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t.transactions.minAmount}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={filters.minAmount !== undefined ? filters.minAmount : ''}
                  onChange={e => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setFilters(prev => ({ ...prev, minAmount: val }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">{t.transactions.maxAmount}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={t.transactions.noLimit}
                  value={filters.maxAmount !== undefined ? filters.maxAmount : ''}
                  onChange={e => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    setFilters(prev => ({ ...prev, maxAmount: val }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Check size={16} />
            <span>{t.transactions.applyFilters}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
