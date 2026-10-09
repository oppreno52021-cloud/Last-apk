import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency } from '../../utils/calculations';
import { 
  getCategoryDisplayName, 
  getAccountDisplayName, 
  formatDateLabel 
} from '../../utils/i18n';
import { 
  X, 
  ArrowLeft,
  Calendar, 
  Clock, 
  CreditCard, 
  Trash2, 
  Edit3, 
  Copy,
  ArrowDownLeft, 
  ArrowUpRight,
  ArrowLeftRight,
  Store,
  FileText
} from 'lucide-react';
import { Expense } from '../../types';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';

interface TransactionDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  expense,
  onClose,
  onEdit,
}) => {
  const { categories, accounts, removeExpense, duplicateExpense, settings, isPrivacyMode, language, t } = useApp();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useBodyScrollLock(Boolean(expense));
  useBackHandler(Boolean(expense), onClose, 'transaction-detail');
  useBackHandler(isConfirmingDelete, () => setIsConfirmingDelete(false), 'transaction-delete-confirm');

  if (!expense) return null;

  const isExpense = expense.type === 'expense';
  const isIncome = expense.type === 'income';
  const isTransfer = expense.type === 'transfer';

  const category = categories.find(c => c.id === expense.categoryId);
  const account = accounts.find(a => a.id === expense.paymentMethodId || a.id === expense.accountId);
  const fromAccount = accounts.find(a => a.id === (expense.fromAccountId || expense.accountId));
  const toAccount = accounts.find(a => a.id === expense.toAccountId);

  const handleDelete = async () => {
    await removeExpense(expense.id);
    setIsConfirmingDelete(false);
    onClose();
  };

  const transferArrow = language === 'ar' ? '←' : '→';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 z-10"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ms-1 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'ar' ? 'رجوع' : 'Back'}
            >
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {isTransfer ? (language === 'ar' ? 'تفاصيل التحويل' : 'Transfer Details') : t.detail.title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.detail.close}
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount & Category / Transfer Hero */}
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="inline-flex items-center justify-center mb-3">
            {isTransfer ? (
              <div className="w-14 h-14 rounded-full border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                <ArrowLeftRight size={24} className="rtl:rotate-180" />
              </div>
            ) : (
              <CategoryIcon 
                name={category?.icon || 'MoreHorizontal'} 
                size={24} 
                className="w-14 h-14" 
              />
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {isExpense && (
              <ArrowDownLeft size={24} className="text-rose-500 shrink-0" />
            )}
            {isIncome && (
              <ArrowUpRight size={24} className="text-emerald-500 shrink-0" />
            )}
            {isTransfer && (
              <ArrowLeftRight size={22} className="text-blue-500 shrink-0 rtl:rotate-180" />
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isExpense ? '− ' : isIncome ? '+ ' : ''}{formatCurrency(expense.amount, settings.currency, language, isPrivacyMode)}
            </h1>
          </div>

          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {isTransfer 
              ? `${getAccountDisplayName(fromAccount?.name || 'Account', language)} ${transferArrow} ${getAccountDisplayName(toAccount?.name || 'Account', language)}`
              : getCategoryDisplayName(category?.name || 'Uncategorized', language)}
          </p>
          {expense.note && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
              "{expense.note}"
            </p>
          )}
        </div>

        {/* Detailed Metadata Attributes */}
        <div className="p-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          {isTransfer ? (
            <>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> {t.detail.fromAccount}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {getAccountDisplayName(fromAccount?.name || 'Account', language)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> {t.detail.toAccount}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {getAccountDisplayName(toAccount?.name || 'Account', language)}
                </span>
              </div>
            </>
          ) : (
            <>
              {expense.merchant && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Store size={16} /> {t.detail.merchant}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{expense.merchant}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> {t.detail.account}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {getAccountDisplayName(account?.name || expense.paymentMethod || 'Cash', language)}
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Calendar size={16} /> {t.detail.date}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatDateLabel(expense.date, language)}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock size={16} /> {t.detail.time}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">{expense.time || '12:00'}</span>
          </div>

          {expense.note && (
            <div className="flex items-start justify-between py-1.5">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2 shrink-0 mt-0.5">
                <FileText size={16} /> {t.detail.notes}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[200px] break-words">
                {expense.note}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions: Edit, Duplicate & Delete with Confirmation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(expense);
            }}
            className="flex-1 py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer min-h-[46px]"
          >
            <Edit3 size={16} />
            <span>{isTransfer ? t.detail.editTransfer : t.detail.edit}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              duplicateExpense(expense);
              onClose();
            }}
            className="py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[46px]"
            title={language === 'ar' ? 'تكرار المعاملة' : 'Duplicate'}
          >
            <Copy size={16} />
            <span>{language === 'ar' ? 'تكرار' : 'Duplicate'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="py-3 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 hover:bg-rose-100/80 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[46px]"
            title={t.detail.delete}
          >
            <Trash2 size={16} />
            <span>{t.detail.delete}</span>
          </button>
        </div>

        {/* Delete Confirmation Sub-Dialog */}
        {isConfirmingDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.detail.confirmDelete}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {t.detail.confirmDeleteDesc}
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  {t.settings.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  {t.detail.delete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
