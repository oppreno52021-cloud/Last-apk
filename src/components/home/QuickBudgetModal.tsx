import React, { useState, useEffect, useRef } from 'react';
import { Target, X, Check, AlertCircle } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';
import { parseMoneyInput, normalizeArabicNumerals } from '../../utils/calculations';
import { triggerHaptic } from '../../utils/haptics';

interface QuickBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  currencySymbol: string;
  onSave: (amount: number) => Promise<void>;
  language: 'ar' | 'en';
}

export const QuickBudgetModal: React.FC<QuickBudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  currencySymbol,
  onSave,
  language,
}) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(isOpen);
  useBackHandler(isOpen, onClose, 'quick-budget');

  useEffect(() => {
    if (isOpen) {
      setAmount(currentBudget > 0 ? String(currentBudget) : '');
      setError(null);
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseMoneyInput(amount);
    if (!parsed.valid || parsed.amount <= 0) {
      setError(
        language === 'ar'
          ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر للميزانية.'
          : 'Please enter a valid amount greater than 0.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      triggerHaptic('medium');
      await onSave(parsed.amount);
      onClose();
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل حفظ الميزانية.' : 'Failed to save budget.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-5 border border-slate-200 dark:border-slate-800 z-10 animate-in zoom-in-95 duration-200 space-y-4"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-amber-500 shrink-0">
              <Target size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'تحديد ميزانية الشهر' : 'Monthly Budget'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                className="w-40 text-center text-3xl sm:text-4xl font-black bg-transparent border-b-2 border-transparent focus:border-amber-500 focus:outline-hidden text-slate-900 dark:text-white"
              />
              {currencySymbol && (
                <span className="text-base font-bold text-slate-400 dark:text-slate-500 select-none">
                  {currencySymbol}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Check size={18} strokeWidth={2.5} />
            <span>
              {isSubmitting
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ وتفعيل الميزانية' : 'Save Budget')}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
