import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { AccountIcon } from '../common/AccountIcon';
import {
  parseMoneyInput,
  validateTransfer,
  getLocalDateString,
  getLocalTimeString,
  formatCurrency,
  getCurrencySymbol,
  normalizeArabicNumerals,
  safeEvalMath,
} from '../../utils/calculations';
import { getCategoryDisplayName, getAccountDisplayName } from '../../utils/i18n';
import { triggerHaptic } from '../../utils/haptics';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  X,
  ArrowRightLeft,
  Calendar,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  Delete as BackspaceIcon,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Wallet,
  Tag,
  Hash,
} from 'lucide-react';
import { Expense, Category, Account } from '../../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editExpense?: Expense | null;
}

// Quick suggested amounts
const QUICK_AMOUNTS = [5, 10, 20, 50, 100, 200];
const QUICK_TAGS_EXPENSE = ['طعام', 'سوبرماركت', 'مواصلات', 'قهوة', 'فواتير', 'صيدلية', 'تسوق'];
const QUICK_TAGS_INCOME = ['راتب', 'فريلانس', 'مكافأة', 'أرباح', 'تحويل'];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  editExpense,
}) => {
  const {
    categories,
    accounts,
    createExpense,
    modifyExpense,
    removeExpense,
    createTransfer,
    saveCategoryItem,
    saveAccountItem,
    settings,
    lastUsedCategoryId,
    lastUsedPaymentMethodId,
    prefillExpense,
    language,
    t,
    accountSummaries,
    showToast,
  } = useApp();

  // Primary form states
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [time, setTime] = useState(getLocalTimeString());

  // Input ref to support direct typing when tapped
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Show / Hide secondary details (Note & Date)
  const [showNoteDate, setShowNoteDate] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Quick Keypad Expand state (0-9 digits)
  const [showFullNumPad, setShowFullNumPad] = useState(false);

  // Quick Add Category Modal state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Quick Add Account Modal state
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  // Status & confirmation modals
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  useBodyScrollLock(isOpen);
  useBackHandler(isOpen, () => handleRequestClose(), 'add-expense');
  useBackHandler(showDeleteConfirm, () => setShowDeleteConfirm(false), 'add-delete');
  useBackHandler(showDiscardConfirm, () => setShowDiscardConfirm(false), 'add-discard');
  useBackHandler(isAddingCategory, () => setIsAddingCategory(false), 'add-cat');
  useBackHandler(isAddingAccount, () => setIsAddingAccount(false), 'add-acc');

  // Live in-line math evaluator (+ - * /)
  const liveMathResult = useMemo(() => safeEvalMath(amount), [amount]);

  // Active accounts & categories
  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  const activeCategories = useMemo(() => {
    return categories.filter((c) => {
      if (!c.isActive) return false;
      if (type === 'income') {
        return c.type === 'income' || c.id.startsWith('cat-inc-');
      }
      if (type === 'expense') {
        return !c.type || c.type === 'expense' || !c.id.startsWith('cat-inc-');
      }
      return true;
    });
  }, [categories, type]);

  // Balance lookup for accounts
  const accountBalances = useMemo(() => {
    const map = new Map<string, number>();
    accountSummaries?.summaries?.forEach((s) => {
      map.set(s.account.id, s.currentBalance);
    });
    return map;
  }, [accountSummaries]);

  // Initialize or reset form
  useEffect(() => {
    if (isOpen) {
      if (editExpense) {
        setType(editExpense.type);
        setAmount(editExpense.amount.toString());
        setCategoryId(editExpense.categoryId || 'cat-other');
        setAccountId(editExpense.accountId || editExpense.paymentMethodId || activeAccounts[0]?.id || 'acc-cash');
        setFromAccountId(editExpense.fromAccountId || editExpense.accountId || activeAccounts[0]?.id || 'acc-cash');
        setToAccountId(
          editExpense.toAccountId ||
            activeAccounts.find((a) => a.id !== (editExpense.fromAccountId || editExpense.accountId))?.id ||
            activeAccounts[1]?.id ||
            'acc-card'
        );
        setNote(editExpense.note || '');
        setDate(editExpense.date);
        setTime(editExpense.time || getLocalTimeString());
        setShowNoteDate(Boolean(editExpense.note || editExpense.date !== getLocalDateString()));
        setShowCustomDatePicker(editExpense.date !== getLocalDateString());
      } else {
        const initialType = prefillExpense?.type || 'expense';
        setType(initialType);
        setAmount(prefillExpense?.amount ? prefillExpense.amount.toString() : '');

        let defaultCat = '';
        if (initialType === 'income') {
          const inc = categories.find((c) => c.isActive && (c.type === 'income' || c.id.startsWith('cat-inc-')));
          defaultCat = prefillExpense?.categoryId || inc?.id || 'cat-inc-salary';
        } else {
          const exp = categories.find((c) => c.isActive && (!c.type || c.type === 'expense' || !c.id.startsWith('cat-inc-')));
          const fallback = lastUsedCategoryId && categories.some((c) => c.id === lastUsedCategoryId && (!c.type || c.type === 'expense'))
            ? lastUsedCategoryId
            : exp?.id;
          defaultCat = prefillExpense?.categoryId || fallback || categories[0]?.id || 'cat-general';
        }
        setCategoryId(defaultCat);

        const defaultAcc = prefillExpense?.paymentMethodId || lastUsedPaymentMethodId || activeAccounts[0]?.id || 'acc-cash';
        setAccountId(defaultAcc);
        setFromAccountId(prefillExpense?.fromAccountId || defaultAcc);
        setToAccountId(
          prefillExpense?.toAccountId ||
            activeAccounts.find((a) => a.id !== defaultAcc)?.id ||
            activeAccounts[1]?.id ||
            'acc-card'
        );

        setNote(prefillExpense?.note || '');
        setDate(getLocalDateString());
        setTime(getLocalTimeString());
        setShowNoteDate(Boolean(prefillExpense?.note));
        setShowCustomDatePicker(false);
      }

      setError(null);
      setShowDeleteConfirm(false);
      setShowDiscardConfirm(false);
      setIsAddingCategory(false);
      setIsAddingAccount(false);
    }
  }, [isOpen, editExpense, prefillExpense, categories, activeAccounts, lastUsedCategoryId, lastUsedPaymentMethodId]);

  // Backspace / Clear
  const handleBackspace = useCallback(() => {
    triggerHaptic('light');
    setError(null);
    setAmount((prev) => {
      if (!prev) return '';
      return prev.slice(0, -1);
    });
  }, []);

  const handleClearAll = useCallback(() => {
    triggerHaptic('medium');
    setError(null);
    setAmount('');
  }, []);

  // Precise Math Key Handler (+, -, *, /, .)
  const handleOperatorInput = useCallback((op: string) => {
    triggerHaptic('light');
    setError(null);

    setAmount((prev) => {
      const trimmed = prev.trim();

      // If amount is empty
      if (!trimmed) {
        if (op === '-') return '-';
        if (op === '.') return '0.';
        return '';
      }

      // If trailing character is already an operator, replace it
      if (['+', '-', '*', '/'].includes(trimmed.slice(-1))) {
        if (op === '.') return trimmed;
        return trimmed.slice(0, -1) + op;
      }

      // If trailing character is dot, don't allow another dot
      if (trimmed.endsWith('.')) {
        if (op === '.') return trimmed;
        return trimmed + op;
      }

      // Decimal point check inside the last operand
      if (op === '.') {
        const parts = trimmed.split(/[+\-*/]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('.')) return trimmed;
        return trimmed + '.';
      }

      // Standard operator append
      return trimmed + op;
    });
  }, []);

  // Digit Input Handler (0-9)
  const handleDigitInput = useCallback((digit: string) => {
    triggerHaptic('light');
    setError(null);

    setAmount((prev) => {
      if (prev === '0') {
        return digit;
      }
      if (prev.length >= 16) return prev;
      return prev + digit;
    });
  }, []);

  // Quick Amount Shortcut Handler (+5, +10, +20, +50, +100, +200)
  const handleQuickAmount = (val: number) => {
    triggerHaptic('light');
    setError(null);

    setAmount((prev) => {
      const trimmed = prev.trim();

      // If empty, set the value directly
      if (!trimmed) {
        return val.toString();
      }

      // If ends with an operator (e.g. "100+" or "4*"), append the number
      if (['+', '-', '*', '/'].includes(trimmed.slice(-1))) {
        return trimmed + val.toString();
      }

      // If there's already an active math expression, append with +
      if (/[+\-*/]/.test(trimmed)) {
        return `${trimmed}+${val}`;
      }

      // Plain numeric addition
      const currentNum = parseFloat(normalizeArabicNumerals(trimmed));
      if (!isNaN(currentNum)) {
        return (currentNum + val).toString();
      }

      return val.toString();
    });
  };

  // Support Desktop Physical Keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitInput(e.key);
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        handleOperatorInput('.');
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        handleOperatorInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigitInput, handleOperatorInput, handleBackspace]);

  // Handle switching transaction type
  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    triggerHaptic('light');
    setType(newType);
    setError(null);

    if (newType === 'income') {
      const firstIncome = categories.find((c) => c.isActive && (c.type === 'income' || c.id.startsWith('cat-inc-')));
      if (firstIncome) setCategoryId(firstIncome.id);
    } else if (newType === 'expense') {
      const firstExpense = categories.find((c) => c.isActive && (!c.type || c.type === 'expense' || !c.id.startsWith('cat-inc-')));
      const fallback = lastUsedCategoryId && categories.some((c) => c.id === lastUsedCategoryId && (!c.type || c.type === 'expense'))
        ? lastUsedCategoryId
        : (firstExpense?.id || categories[0]?.id || 'cat-general');
      setCategoryId(fallback);
    }
  };

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (editExpense) {
      return (
        amount.trim() !== editExpense.amount.toString() ||
        note.trim() !== (editExpense.note || '') ||
        categoryId !== editExpense.categoryId ||
        accountId !== (editExpense.accountId || editExpense.paymentMethodId)
      );
    }
    return Boolean(amount.trim() || note.trim());
  }, [editExpense, amount, note, categoryId, accountId]);

  const handleRequestClose = () => {
    if (isDirty && !showDiscardConfirm) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Swap transfer accounts
  const handleSwapAccounts = () => {
    triggerHaptic('light');
    const temp = fromAccountId;
    setFromAccountId(toAccountId);
    setToAccountId(temp);
  };

  // Quick Add Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const newCat: Category = {
        id: `cat-custom-${Date.now()}`,
        name: newCategoryName.trim(),
        icon: 'Tag',
        color: '#3B82F6',
        type: type === 'income' ? 'income' : 'expense',
        isDefault: false,
        isActive: true,
        sortOrder: categories.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveCategoryItem(newCat);
      setCategoryId(newCat.id);
      setNewCategoryName('');
      setIsAddingCategory(false);
      triggerHaptic('success');
      showToast(language === 'ar' ? 'تمت إضافة الفئة بنجاح' : 'Category added successfully');
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إضافة الفئة' : 'Failed to add category'));
    }
  };

  // Quick Add Account Handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    try {
      const startingBal = parseFloat(normalizeArabicNumerals(newAccountBalance.trim())) || 0;
      const newAcc: Account = {
        id: `acc-custom-${Date.now()}`,
        name: newAccountName.trim(),
        type: 'wallet',
        openingBalance: startingBal,
        currency: settings.currency || 'EGP',
        color: '#3B82F6',
        icon: 'wallet',
        isActive: true,
        isArchived: false,
        showOnHome: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveAccountItem(newAcc);
      setAccountId(newAcc.id);
      setNewAccountName('');
      setNewAccountBalance('');
      setIsAddingAccount(false);
      triggerHaptic('success');
      showToast(language === 'ar' ? 'تمت إضافة الحساب بنجاح' : 'Account added successfully');
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إضافة الحساب' : 'Failed to add account'));
    }
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    let finalAmountStr = amount;
    if (liveMathResult !== null && liveMathResult > 0) {
      finalAmountStr = liveMathResult.toString();
    }

    const parsed = parseMoneyInput(finalAmountStr);
    if (!parsed.valid || parsed.amount <= 0) {
      setError(language === 'ar' ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر.' : 'Please enter a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);

      const submitDate = date || getLocalDateString();
      const submitTime = time || getLocalTimeString();

      if (type === 'transfer') {
        const transferVal = validateTransfer(
          { amount: parsed.amount, fromAccountId, toAccountId },
          accounts
        );
        if (!transferVal.valid) {
          setError(transferVal.error || (language === 'ar' ? 'بيانات التحويل غير صالحة.' : 'Invalid transfer details.'));
          return;
        }

        const fromAcc = accounts.find((a) => a.id === fromAccountId);
        const toAcc = accounts.find((a) => a.id === toAccountId);
        const fromName = fromAcc ? getAccountDisplayName(fromAcc.name, language) : 'حساب';
        const toName = toAcc ? getAccountDisplayName(toAcc.name, language) : 'حساب';
        const transferNote = note.trim() || `${fromName} ← ${toName}`;

        if (editExpense) {
          await modifyExpense(editExpense.id, {
            type: 'transfer',
            amount: parsed.amount,
            accountId: fromAccountId,
            fromAccountId,
            toAccountId,
            paymentMethodId: fromAccountId,
            note: transferNote,
            merchant: `Transfer: ${fromName} → ${toName}`,
            date: submitDate,
            time: submitTime,
          });
        } else {
          await createTransfer({
            amount: parsed.amount,
            fromAccountId,
            toAccountId,
            note: transferNote,
            date: submitDate,
            time: submitTime,
          });
        }
      } else {
        if (!categoryId) {
          setError(language === 'ar' ? 'يرجى اختيار فئة للمعاملة.' : 'Please choose a category.');
          return;
        }

        const selectedAccount = accountId || activeAccounts[0]?.id || 'acc-cash';

        if (editExpense) {
          await modifyExpense(editExpense.id, {
            type,
            amount: parsed.amount,
            categoryId,
            accountId: selectedAccount,
            paymentMethodId: selectedAccount,
            note: note.trim(),
            merchant: note.trim(),
            date: submitDate,
            time: submitTime,
          });
        } else {
          await createExpense({
            type,
            amount: parsed.amount,
            categoryId,
            accountId: selectedAccount,
            paymentMethodId: selectedAccount,
            note: note.trim(),
            merchant: note.trim(),
            date: submitDate,
            time: submitTime,
          });
        }
      }

      triggerHaptic('success');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (language === 'ar' ? 'حدث خطأ أثناء حفظ المعاملة.' : 'Error saving transaction.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!editExpense) return;
    try {
      setIsSubmitting(true);
      await removeExpense(editExpense.id);
      triggerHaptic('medium');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (language === 'ar' ? 'فشل حذف المعاملة.' : 'Failed to delete expense.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currencySymbol = getCurrencySymbol(settings.currency, language);
  const numericAmount = liveMathResult !== null ? liveMathResult : parseFloat(normalizeArabicNumerals(amount.trim()));
  const formattedAmount = !isNaN(numericAmount) && numericAmount > 0
    ? `(${numericAmount.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} ${currencySymbol || 'ج.م'})`
    : '';

  const isToday = date === getLocalDateString();

  // Dynamic Save Button Text based on transaction type
  const getSaveButtonText = () => {
    if (editExpense) {
      return language === 'ar' ? 'تحديث المعاملة' : 'Update Transaction';
    }
    if (type === 'income') {
      return language === 'ar' ? 'إضافة دخل' : 'Add Income';
    }
    if (type === 'transfer') {
      return language === 'ar' ? 'إتمام تحويل' : 'Complete Transfer';
    }
    return language === 'ar' ? 'حفظ مصروف' : 'Save Expense';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleRequestClose} />

      {/* Main Dialog Shell */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200/90 dark:border-slate-800 z-10 animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Swipe Handle */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* 1. Header Bar: 3 buttons like a switcher: [مصروف] [دخل] [تحويل] + Close */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex-1 grid grid-cols-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-center rounded-lg transition-all cursor-pointer select-none ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.transactions.expenses}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-center rounded-lg transition-all cursor-pointer select-none ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.transactions.income}
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`py-2 text-center rounded-lg transition-all cursor-pointer select-none ${
                type === 'transfer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.transactions.transfers}
            </button>
          </div>

          {/* Action icons: Delete & Close */}
          <div className="flex items-center gap-1 shrink-0">
            {editExpense && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                title={language === 'ar' ? 'حذف المعاملة' : 'Delete'}
              >
                <Trash2 size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label={t.detail.close}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body: Contains Amount, Calculator, Quick Numbers, Accounts, Categories, Note */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 2. Middle Amount Row: Right = Backspace, Center = Number (Clickable to type), Left = Currency */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 text-center transition-colors">
            <div className="flex items-center justify-between gap-3">
              {/* Right Side: Backspace / Clear button */}
              <div className="w-12 flex items-center justify-start shrink-0">
                <button
                  type="button"
                  disabled={!amount}
                  onClick={handleBackspace}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleClearAll();
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    amount
                      ? 'text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-300 dark:hover:bg-rose-950/30 active:scale-90'
                      : 'text-slate-300 dark:text-slate-700 opacity-30 cursor-not-allowed'
                  }`}
                  title={language === 'ar' ? 'حذف آخر رقم (أو مسح)' : 'Backspace'}
                >
                  <BackspaceIcon size={20} />
                </button>
              </div>

              {/* Center: Amount Input / Display (Click to open native numeric keyboard, or use buttons) */}
              <div
                onClick={() => amountInputRef.current?.focus()}
                className="flex-1 min-w-0 flex items-center justify-center cursor-text py-1"
              >
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const normalized = normalizeArabicNumerals(e.target.value);
                    const cleaned = normalized.replace(/×/g, '*').replace(/÷/g, '/');
                    setAmount(cleaned);
                    setError(null);
                  }}
                  className={`w-full text-center text-3xl sm:text-4xl font-black tracking-tight bg-transparent border-0 focus:outline-hidden focus:ring-0 p-0 ${
                    amount
                      ? type === 'expense'
                        ? 'text-rose-500 dark:text-rose-400'
                        : type === 'income'
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-300 dark:text-slate-600'
                  }`}
                />
              </div>

              {/* Left Side: Currency Symbol */}
              <div className="w-12 flex items-center justify-end shrink-0">
                <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 select-none bg-slate-200/60 dark:bg-slate-700/60 px-2 py-1 rounded-lg">
                  {currencySymbol || 'ج.م'}
                </span>
              </div>
            </div>

            {/* Live Math Calculation Result (e.g., 4 * 25 => = 100 ج.م) */}
            {liveMathResult !== null && (
              <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 animate-in fade-in">
                <span>=</span>
                <span>{liveMathResult.toLocaleString('en-US')} {currencySymbol || 'ج.م'}</span>
              </div>
            )}
          </div>

          {/* 3. Simple Mini Calculator Operations (+, -, *, /, .) */}
          <div className="flex items-center justify-center gap-2">
            {[
              { label: '+', val: '+', title: 'جمع' },
              { label: '−', val: '-', title: 'طرح' },
              { label: '×', val: '*', title: 'ضرب' },
              { label: '÷', val: '/', title: 'قسمة' },
              { label: '.', val: '.', title: 'فاصلة عشرية' },
            ].map((op) => (
              <button
                key={op.val}
                type="button"
                onClick={() => handleOperatorInput(op.val)}
                className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 font-black text-sm shadow-2xs border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer select-none active:scale-95"
                title={op.title}
              >
                {op.label}
              </button>
            ))}

            {/* Toggle custom digits 0-9 */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowFullNumPad(!showFullNumPad);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                showFullNumPad
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60'
              }`}
              title={language === 'ar' ? 'أرقام مخصصة 0-9' : 'Keypad 0-9'}
            >
              <Hash size={14} />
            </button>
          </div>

          {/* Expandable Mini Custom Digits 0-9 */}
          {showFullNumPad && (
            <div dir="ltr" className="grid grid-cols-5 gap-1.5 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitInput(digit)}
                  className="py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs active:scale-95 cursor-pointer"
                >
                  {digit}
                </button>
              ))}
            </div>
          )}

          {/* 4. Single Row of Quick Numbers: 5, 10, 20, 50, 100, 200 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="flex-1 min-w-[50px] py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 active:scale-95 transition-all cursor-pointer select-none shadow-2xs text-center"
              >
                +{val}
              </button>
            ))}
          </div>

          {/* 5. Accounts Row (Single Line: Label on the right, rectangular blue-accent cards horizontally beside it) */}
          {type === 'transfer' ? (
            /* Transfer Direction Selection */
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {language === 'ar' ? 'مسار التحويل' : 'Transfer Route'}
                </span>
                <button
                  type="button"
                  onClick={handleSwapAccounts}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  <ArrowRightLeft size={13} />
                  <span>{language === 'ar' ? 'تبديل' : 'Swap'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'ar' ? 'من حساب:' : 'From:'}
                  </label>
                  <select
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {getAccountDisplayName(acc.name, language)} ({formatCurrency(accountBalances.get(acc.id) ?? 0, acc.currency, language)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'ar' ? 'إلى حساب:' : 'To:'}
                  </label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {getAccountDisplayName(acc.name, language)} ({formatCurrency(accountBalances.get(acc.id) ?? 0, acc.currency, language)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Account Label (Right side in RTL) */}
              <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-slate-700 dark:text-slate-300 w-16">
                <Wallet size={14} className="text-blue-500" />
                <span>{language === 'ar' ? 'الحساب:' : 'Account:'}</span>
              </div>

              {/* Scrollable Rectangular Cards Strip */}
              <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {activeAccounts.map((acc) => {
                  const isSelected = accountId === acc.id;
                  const bal = accountBalances.get(acc.id) ?? 0;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setAccountId(acc.id);
                      }}
                      className={`h-8 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 border border-solid ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/25'
                          : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80 hover:border-slate-400'
                      }`}
                    >
                      <AccountIcon
                        name={acc.icon || acc.type}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        size={13}
                        showBackground={false}
                        className="w-3.5 h-3.5 shrink-0"
                      />
                      <span className="whitespace-nowrap">{getAccountDisplayName(acc.name, language)}</span>
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        ({formatCurrency(bal, acc.currency, language)})
                      </span>
                    </button>
                  );
                })}

                {/* Add Account Button (Uniform size and solid border) */}
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(true)}
                  className="h-8 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border border-solid border-slate-200/90 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer select-none active:scale-95"
                >
                  <Plus size={13} className="text-slate-400 shrink-0" />
                  <span className="whitespace-nowrap">{language === 'ar' ? 'حساب' : 'Account'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. Categories Row (Single Line: Label on the right, rectangular blue-accent cards horizontally beside it) */}
          {type !== 'transfer' && (
            <div className="flex items-center gap-2">
              {/* Category Label (Right side in RTL) */}
              <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-slate-700 dark:text-slate-300 w-16">
                <Tag size={14} className="text-blue-500" />
                <span>{language === 'ar' ? 'الفئة:' : 'Category:'}</span>
              </div>

              {/* Scrollable Rectangular Cards Strip */}
              <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {activeCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setCategoryId(cat.id);
                      }}
                      className={`h-8 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 border border-solid ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/25'
                          : 'bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200/90 dark:border-slate-700/80 hover:border-slate-400'
                      }`}
                    >
                      <CategoryIcon
                        name={cat.icon}
                        color={isSelected ? '#FFFFFF' : '#64748B'}
                        size={13}
                        showBackground={false}
                        className="w-3.5 h-3.5 shrink-0"
                      />
                      <span className="whitespace-nowrap">{getCategoryDisplayName(cat.name, language)}</span>
                    </button>
                  );
                })}

                {/* Add Category Button (Uniform size and solid border) */}
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="h-8 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 border border-solid border-slate-200/90 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer select-none active:scale-95"
                >
                  <Plus size={13} className="text-slate-400 shrink-0" />
                  <span className="whitespace-nowrap">{language === 'ar' ? 'فئة' : 'Category'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 7. Note & Date Collapsible Card (Defaults to current time automatically) */}
          <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowNoteDate(!showNoteDate);
              }}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span>
                  {note ? (
                    <span className="text-slate-900 dark:text-white font-semibold line-clamp-1">{note}</span>
                  ) : (
                    language === 'ar' ? 'إضافة ملاحظة أو تغيير التاريخ' : 'Add Note or Change Date'
                  )}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md">
                  {isToday ? (language === 'ar' ? 'مسجل الآن' : 'Now') : date}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                {showNoteDate ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            {showNoteDate && (
              <div className="p-3 pt-1 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5 animate-in fade-in">
                {/* Note input */}
                <div>
                  <input
                    type="text"
                    placeholder={language === 'ar' ? 'اكتب ملاحظة أو وصف المعاملة...' : 'Note (optional)...'}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400"
                  />
                  {/* Quick Tags */}
                  <div className="flex gap-1 overflow-x-auto pt-1.5 no-scrollbar">
                    {(type === 'expense' ? QUICK_TAGS_EXPENSE : QUICK_TAGS_INCOME).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setNote((prev) => (prev ? `${prev} - ${tag}` : tag));
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 shrink-0 cursor-pointer"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Controls */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {isToday ? (language === 'ar' ? 'اليوم (توقيت تلقائي)' : 'Today (Auto)') : date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isToday && (
                      <button
                        type="button"
                        onClick={() => {
                          setDate(getLocalDateString());
                          setTime(getLocalTimeString());
                        }}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {language === 'ar' ? 'تعيين لليوم' : 'Today'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                      className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {showCustomDatePicker ? (language === 'ar' ? 'إخفاء' : 'Hide') : (language === 'ar' ? 'تعديل التاريخ' : 'Edit Date')}
                    </button>
                  </div>
                </div>

                {showCustomDatePicker && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{language === 'ar' ? 'الوقت' : 'Time'}</label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 8. Sticky Bottom Action Bar: Fixed firmly at bottom, never disappears on scroll */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs shrink-0 z-10">
          <button
            type="button"
            disabled={isSubmitting || !amount || amount === '0'}
            onClick={() => handleSubmit()}
            className={`w-full py-3.5 px-4 rounded-2xl text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 shadow-rose-500/20'
                : type === 'income'
                ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-500/20'
            } ${(!amount || amount === '0' || isSubmitting) ? 'opacity-50 cursor-not-allowed shadow-none' : 'active:scale-[0.99]'}`}
          >
            {isSubmitting ? (
              <span>{language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
            ) : (
              <>
                <Check size={18} strokeWidth={2.5} />
                <span>{getSaveButtonText()}</span>
                {formattedAmount && <span>{formattedAmount}</span>}
              </>
            )}
          </button>
        </div>

        {/* Modal: Quick Add Category */}
        {isAddingCategory && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-30 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-xs w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag size={16} className="text-blue-500" />
                  <span>{language === 'ar' ? 'إضافة فئة جديدة' : 'Add New Category'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'اسم الفئة (مثلاً: كتب، هدايا...)' : 'Category name...'}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
                  >
                    {language === 'ar' ? 'حفظ الفئة' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Quick Add Account */}
        {isAddingAccount && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-30 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-xs w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet size={16} className="text-blue-500" />
                  <span>{language === 'ar' ? 'إضافة حساب جديد' : 'Add New Account'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'ar' ? 'اسم الحساب / المحفظة' : 'Account Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'ar' ? 'مثلاً: محفظة فودافون كاش، بنك مصر...' : 'e.g. Bank, Cash...'}
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {language === 'ar' ? 'الرصيد المبدئي (اختياري)' : 'Opening Balance'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingAccount(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
                  >
                    {language === 'ar' ? 'حفظ الحساب' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-20 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-xs w-full text-center border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'حذف هذه المعاملة؟' : 'Delete this transaction?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'ar' ? 'سيتم حذف المعاملة من السجلات والمحفظة.' : 'It will be permanently removed.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 cursor-pointer"
                >
                  {language === 'ar' ? 'نعم، حذف' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-20 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-xs w-full text-center border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'إلغاء التغييرات؟' : 'Discard changes?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {language === 'ar' ? 'لديك بيانات لم يتم حفظها بعد، هل تريد الإغلاق؟' : 'You have unsaved changes.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  {language === 'ar' ? 'متابعة الكتابة' : 'Keep Editing'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء وإغلاق' : 'Discard'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
