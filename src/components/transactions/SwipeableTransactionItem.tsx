import React, { useState, useRef } from 'react';
import { Expense, Category, Account } from '../../types';
import { CategoryIcon } from '../common/CategoryIcon';
import { formatCurrency, toArabicNumerals } from '../../utils/calculations';
import { getCategoryDisplayName, getAccountDisplayName } from '../../utils/i18n';
import { triggerHaptic } from '../../utils/haptics';
import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

interface SwipeableTransactionItemProps {
  expense: Expense;
  category?: Category;
  fromAccount?: Account;
  toAccount?: Account;
  currency: string;
  language: 'en' | 'ar';
  numberFormat?: 'arabic' | 'western';
  isPrivacyMode: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  transferLabel: string;
  editLabel: string;
  deleteLabel: string;
  duplicateLabel?: string;
}

export const SwipeableTransactionItem: React.FC<SwipeableTransactionItemProps> = ({
  expense,
  category,
  fromAccount,
  toAccount,
  currency,
  language,
  numberFormat,
  isPrivacyMode,
  onClick,
  onEdit,
  onDelete,
  transferLabel,
  editLabel,
  deleteLabel,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const currentXRef = useRef<number>(0);
  const hasMovedRef = useRef<boolean>(false);

  const isRTL = language === 'ar';
  const isExpense = expense.type === 'expense';
  const isIncome = expense.type === 'income';
  const isTransfer = expense.type === 'transfer';
  const transferArrow = isRTL ? '←' : '→';

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startXRef.current = clientX;
    startYRef.current = clientY;
    currentXRef.current = clientX;
    hasMovedRef.current = false;
    isHorizontalSwipeRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;

    // Detect gesture direction on first few pixels
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffY) > 6 && Math.abs(diffY) > Math.abs(diffX)) {
        // Vertical scroll: leave scroll to window, do not hijack
        isHorizontalSwipeRef.current = false;
        setIsDragging(false);
        setOffsetX(0);
        return;
      } else if (Math.abs(diffX) > 8) {
        isHorizontalSwipeRef.current = true;
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    hasMovedRef.current = true;
    const damped = diffX * 0.85;
    const clamped = Math.max(-120, Math.min(120, damped));
    setOffsetX(clamped);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    isHorizontalSwipeRef.current = null;

    // Responsive action thresholds (50px)
    if (offsetX > 50) {
      triggerHaptic('light');
      onEdit();
    } else if (offsetX < -50) {
      triggerHaptic('medium');
      onDelete();
    }

    // Smooth snap back
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden select-none bg-white dark:bg-slate-900 group touch-pan-y">
      {/* 
        Background Action Layers with explicit physical directions:
        - Swiping Right (offsetX > 0): reveals the Left side -> GREEN (Edit)
        - Swiping Left (offsetX < 0): reveals the Right side -> RED (Delete)
      */}

      {/* 1. Green Action Layer for Edit (Revealed when pulling to the right) */}
      <div 
        className={`absolute inset-0 bg-emerald-600 text-white flex items-center justify-start px-5 select-none transition-opacity duration-150 ${
          offsetX > 5 ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
        style={{ direction: 'ltr' }}
        onClick={() => {
          triggerHaptic('light');
          onEdit();
        }}
      >
        <div 
          className="flex items-center gap-2 font-bold text-xs cursor-pointer"
          style={{
            transform: `scale(${Math.min(1.15, Math.max(0.75, offsetX / 50))})`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <Pencil size={18} className="shrink-0 drop-shadow-xs" />
          <span className="whitespace-nowrap drop-shadow-xs">{editLabel}</span>
        </div>
      </div>

      {/* 2. Red Action Layer for Delete (Revealed when pulling to the left) */}
      <div 
        className={`absolute inset-0 bg-rose-600 text-white flex items-center justify-end px-5 select-none transition-opacity duration-150 ${
          offsetX < -5 ? 'opacity-100 z-0' : 'opacity-0 -z-10'
        }`}
        style={{ direction: 'ltr' }}
        onClick={() => {
          triggerHaptic('medium');
          onDelete();
        }}
      >
        <div 
          className="flex items-center gap-2 font-bold text-xs cursor-pointer"
          style={{
            transform: `scale(${Math.min(1.15, Math.max(0.75, Math.abs(offsetX) / 50))})`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <span className="whitespace-nowrap drop-shadow-xs">{deleteLabel}</span>
          <Trash2 size={18} className="shrink-0 drop-shadow-xs" />
        </div>
      </div>

      {/* Foreground Draggable Transaction Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onClick={() => {
          if (!hasMovedRef.current) {
            onClick();
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className="relative z-10 p-3.5 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer touch-pan-y"
        title={`${isRTL ? 'اسحب لليمين للتعديل، لليسار للحذف' : 'Swipe right to edit, left to delete'}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pe-2">
          {isTransfer ? (
            <div className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
              <ArrowLeftRight size={16} className="rtl:rotate-180" />
            </div>
          ) : (
            <CategoryIcon 
              name={category?.icon || 'MoreHorizontal'} 
              size={18} 
            />
          )}

          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-slate-900 dark:text-white block truncate leading-normal" title={isTransfer 
                ? `${transferLabel}: ${getAccountDisplayName(fromAccount?.name || 'Account', language)} ${transferArrow} ${getAccountDisplayName(toAccount?.name || 'Account', language)}`
                : getCategoryDisplayName(category?.name || 'Other', language)}>
              {isTransfer 
                ? `${transferLabel}: ${getAccountDisplayName(fromAccount?.name || 'Account', language)} ${transferArrow} ${getAccountDisplayName(toAccount?.name || 'Account', language)}`
                : getCategoryDisplayName(category?.name || 'Other', language)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5 leading-normal">
              {expense.note || (isTransfer ? transferLabel : expense.merchant || getCategoryDisplayName(category?.name || '', language))} · {language === 'ar' ? toArabicNumerals(expense.time || '12:00') : (expense.time || '12:00')}
            </span>
          </div>
        </div>

        <div className="text-end shrink-0 ps-2 flex items-center gap-2">
          <span className={`text-base font-bold tracking-tight ${
            isExpense 
              ? 'text-slate-900 dark:text-white' 
              : isIncome 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-blue-600 dark:text-blue-400'
          }`}>
            {isExpense ? '− ' : isIncome ? '+ ' : '⇄ '}
            {formatCurrency(expense.amount, currency, language, isPrivacyMode, numberFormat)}
          </span>
        </div>
      </div>
    </div>
  );
};
