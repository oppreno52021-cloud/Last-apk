import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryIcon } from '../common/CategoryIcon';
import { AccountIcon } from '../common/AccountIcon';
import { 
  formatCurrency, 
  getLocalDateString, 
  normalizeArabicNumerals,
  getCurrencySymbol,
  toArabicNumerals,
  formatNumber,
  validateBackupJSON
} from '../../utils/calculations';
import { 
  getCategoryDisplayName, 
  getAccountDisplayName, 
  getAccountTypeDisplayName, 
  getFrequencyDisplayName 
} from '../../utils/i18n';
import { 
  PieChart, 
  Tag, 
  Repeat, 
  Download, 
  Upload, 
  Moon, 
  Sun, 
  ShieldCheck, 
  Check, 
  X, 
  Trash2, 
  Lock, 
  Wallet, 
  Globe, 
  ChevronDown, 
  Phone, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  KeyRound,
  Hash
} from "lucide-react";
import { Category, Account, AccountType, RecurringTransaction } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';
import { isBiometricsSupported, registerBiometrics, removeBiometricCredential, authenticateWithBiometrics } from '../../utils/biometrics';
import { StyledIconSelector } from '../common/StyledIconSelector';

export const SettingsScreen: React.FC = () => {
  const { 
    budget, 
    updateBudgetAmount, 
    settings, 
    updateSettings, 
    categories, 
    saveCategoryItem, 
    deleteCategoryItem,
    accounts,
    accountSummaries,
    saveAccountItem,
    deleteAccountItem,
    recurring, 
    addRecurringItem, 
    saveRecurringItem,
    removeRecurringItem, 
    downloadCSV,
    importCSVText,
    downloadFullBackupJSON,
    importFullBackupJSON,
    resetAllData,
    showToast,
    language,
    setLanguage,
    numberFormat,
    setNumberFormat,
    theme,
    setTheme,
    setActiveTab,
    t
  } = useApp();

  const formatNum = (v: number | string) => formatNumber(v, language, numberFormat);

  const [budgetInput, setBudgetInput] = useState(
    language === 'ar' ? toArabicNumerals(budget.amount.toString()) : budget.amount.toString()
  );
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  React.useEffect(() => {
    setBudgetInput(language === 'ar' ? toArabicNumerals(budget.amount.toString()) : budget.amount.toString());
  }, [budget.amount, language]);

  // Collapsible dropdown sections state
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isDataStorageOpen, setIsDataStorageOpen] = useState(false);

  // Security & PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isDisablingPin, setIsDisablingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [isEnrollingBiometrics, setIsEnrollingBiometrics] = useState(false);

  // Destructive Confirmation Dialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    desc: string;
    confirmLabel: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Account Modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('cash');
  const [accOpeningBalance, setAccOpeningBalance] = useState('0');
  const [accColor, setAccColor] = useState('#10B981');
  const [accIcon, setAccIcon] = useState('Banknote');

  // Category Modal / Sheet state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  // Recurring Modal state
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [recAmount, setRecAmount] = useState('');
  const [recNote, setRecNote] = useState('');
  const [recCatId, setRecCatId] = useState(categories[0]?.id || 'cat-bills');
  const [recAccountId, setRecAccountId] = useState(accounts[0]?.id || 'acc-card');
  const [recFreq, setRecFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recNextDate, setRecNextDate] = useState(() => getLocalDateString(new Date()));

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Hardware & Browser Back Navigation for Settings Modals & Confirm Dialogs
  useBackHandler(isAccountModalOpen, () => {
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  }, 'settings-account');
  useBackHandler(isAddCategoryOpen, () => setIsAddCategoryOpen(false), 'settings-cat');
  useBackHandler(isAddRecurringOpen, () => setIsAddRecurringOpen(false), 'settings-rec');
  useBackHandler(isEditingBudget, () => setIsEditingBudget(false), 'settings-budget');
  useBackHandler(isPinModalOpen, () => {
    setIsPinModalOpen(false);
    setIsChangingPin(false);
    setIsDisablingPin(false);
    setCurrentPinInput('');
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
  }, 'settings-pin');
  useBackHandler(Boolean(confirmAction), () => setConfirmAction(null), 'settings-confirm');

  React.useEffect(() => {
    isBiometricsSupported().then(supported => {
      setBiometricsAvailable(supported);
    });
  }, []);

  const handleOpenSetPin = (changing: boolean = false) => {
    setIsChangingPin(changing);
    setIsDisablingPin(false);
    setCurrentPinInput('');
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
    setIsPinModalOpen(true);
  };

  const handleSavePin = async () => {
    if (isDisablingPin) {
      if (currentPinInput !== settings.passcode) {
        setPinError(language === 'ar' ? 'رمز المرور الحالي غير صحيح' : 'Current PIN is incorrect');
        return;
      }
      await updateSettings({
        pinLockEnabled: false,
        biometricLock: false,
      });
      setIsPinModalOpen(false);
      setIsDisablingPin(false);
      showToast(language === 'ar' ? 'تم إيقاف قفل التطبيق' : 'Lock disabled');
      return;
    }

    if (isChangingPin) {
      if (currentPinInput !== settings.passcode) {
        setPinError(language === 'ar' ? 'رمز المرور الحالي غير صحيح' : 'Current PIN is incorrect');
        return;
      }
    }

    if (pinInput.length !== 6) {
      setPinError(language === 'ar' ? 'الرمز يجب أن يتكون من 6 أرقام' : 'PIN must be 6 digits');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setPinError(language === 'ar' ? 'الرمزان غير متطابقين' : 'PINs do not match');
      return;
    }

    await updateSettings({
      passcode: pinInput,
      pinLockEnabled: true,
    });
    setIsPinModalOpen(false);
    setIsChangingPin(false);
    showToast(language === 'ar' ? 'تم حفظ رمز القفل وتفعيل الحماية' : 'Lock PIN set successfully');
  };

  const handleTogglePinLock = async () => {
    if (settings.pinLockEnabled) {
      // Require current PIN before allowing lock disable
      setIsDisablingPin(true);
      setIsChangingPin(false);
      setCurrentPinInput('');
      setPinError('');
      setIsPinModalOpen(true);
    } else {
      if (settings.passcode && settings.passcode.length === 6) {
        await updateSettings({ pinLockEnabled: true });
        showToast(language === 'ar' ? 'تم تفعيل قفل التطبيق' : 'Lock enabled');
      } else {
        handleOpenSetPin(false);
      }
    }
  };

  const handleToggleBiometrics = async () => {
    if (settings.biometricLock) {
      removeBiometricCredential();
      await updateSettings({ biometricLock: false });
      showToast(language === 'ar' ? 'تم إيقاف القفل بالبصمة' : 'Biometrics lock disabled');
    } else {
      setIsEnrollingBiometrics(true);
      const res = await registerBiometrics();
      setIsEnrollingBiometrics(false);

      if (res.success) {
        await updateSettings({ biometricLock: true });
        showToast(language === 'ar' ? 'تم تفعيل القفل بالبصمة مباشرة بنجاح' : 'Biometric lock enabled directly');
      } else if (res.error === 'unsupported') {
        showToast(language === 'ar' ? 'جهازك أو متصفحك لا يدعم البصمة' : 'Biometrics not supported on this device');
      } else if (res.error !== 'cancelled_or_denied') {
        showToast(language === 'ar' ? 'تعذر إعداد البصمة، يرجى المحاولة مرة أخرى' : 'Failed to register biometrics');
      }
    }
  };

  const handleSaveBudget = async () => {
    const normalized = normalizeArabicNumerals(budgetInput);
    const val = parseFloat(normalized);
    if (!isNaN(val) && val >= 0) {
      await updateBudgetAmount(val);
      setIsEditingBudget(false);
    }
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatColor('#3B82F6');
    setNewCatIcon('Tag');
    setIsAddCategoryOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatColor(cat.color || '#3B82F6');
    setNewCatIcon(cat.icon || 'Tag');
    setIsAddCategoryOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const catToSave: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      isDefault: editingCategory ? editingCategory.isDefault : false,
      isActive: editingCategory ? editingCategory.isActive : true,
      sortOrder: editingCategory ? editingCategory.sortOrder : categories.length + 1,
      createdAt: editingCategory?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveCategoryItem(catToSave);
      setNewCatName('');
      setEditingCategory(null);
      setIsAddCategoryOpen(false);
    } catch {
      // Toast displayed by context
    }
  };

  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('cash');
    setAccOpeningBalance('0');
    setAccColor('#10B981');
    setAccIcon('Banknote');
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccOpeningBalance(acc.openingBalance.toString());
    setAccColor(acc.color || '#3B82F6');
    setAccIcon(acc.icon || 'Banknote');
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const balanceNum = parseFloat(accOpeningBalance) || 0;
    const accToSave: Account = {
      id: editingAccount ? editingAccount.id : `acc-${Date.now()}`,
      name: accName.trim(),
      type: accType,
      openingBalance: balanceNum,
      currency: settings.currency,
      color: accColor,
      icon: accIcon,
      isActive: editingAccount ? editingAccount.isActive : true,
      isArchived: editingAccount ? editingAccount.isArchived : false,
      createdAt: editingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveAccountItem(accToSave);
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch {
      // Toast displayed by context
    }
  };

  const handleOpenAddRecurring = () => {
    setEditingRecurring(null);
    setRecAmount('');
    setRecNote('');
    setRecCatId(categories[0]?.id || 'cat-bills');
    setRecAccountId(accounts[0]?.id || 'acc-card');
    setRecFreq('monthly');
    setRecNextDate(getLocalDateString(new Date()));
    setIsAddRecurringOpen(true);
  };

  const handleOpenEditRecurring = (rec: RecurringTransaction) => {
    setEditingRecurring(rec);
    setRecAmount(rec.amount.toString());
    setRecNote(rec.note || '');
    setRecCatId(rec.categoryId);
    setRecAccountId(rec.accountId || accounts[0]?.id || 'acc-card');
    setRecFreq(rec.frequency);
    setRecNextDate(rec.nextOccurrence || getLocalDateString(new Date()));
    setIsAddRecurringOpen(true);
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(recAmount);
    if (isNaN(num) || num <= 0 || !recNote.trim()) return;

    if (editingRecurring) {
      await saveRecurringItem({
        ...editingRecurring,
        amount: num,
        categoryId: recCatId,
        accountId: recAccountId || accounts[0]?.id || 'acc-card',
        frequency: recFreq,
        nextOccurrence: recNextDate || getLocalDateString(new Date()),
        note: recNote.trim(),
      });
    } else {
      await addRecurringItem({
        type: 'expense',
        amount: num,
        categoryId: recCatId,
        accountId: recAccountId || accounts[0]?.id || 'acc-card',
        frequency: recFreq,
        nextOccurrence: recNextDate || getLocalDateString(new Date()),
        note: recNote.trim(),
        isActive: true,
      });
    }

    setRecAmount('');
    setRecNote('');
    setEditingRecurring(null);
    setIsAddRecurringOpen(false);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        await importCSVText(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setConfirmAction({
          title: t.settings.restoreConfirmTitle,
          desc: t.settings.restoreConfirmDesc,
          confirmLabel: t.settings.restoreConfirmAction,
          isDanger: true,
          onConfirm: async () => {
            await importFullBackupJSON(text);
            setConfirmAction(null);
          },
        });
      }
    };
    reader.readAsText(file);
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Settings Title with Back to Home Button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs shrink-0"
          title={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
          aria-label={language === 'ar' ? 'الرجوع للرئيسية' : 'Back to Home'}
        >
          <ArrowLeft size={18} className="rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {t.settings.title}
          </h1>
        </div>
      </div>

      {/* Developer Card - Top of Settings */}
      <div className="p-4 sm:p-5 bg-[#083556] rounded-2xl sm:rounded-3xl border border-[#144973]/50 shadow-md space-y-3.5">
        {/* Header: Name and Developer Badge */}
        <div className="flex items-center gap-2.5 flex-nowrap">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight whitespace-nowrap">
            {language === 'ar' ? 'د. بيشوي ويصا كامل' : 'Dr Beshoy wisa kamel'}
          </h2>
          <span className="bg-[#f59e0b] text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-md inline-flex items-center justify-center shadow-2xs shrink-0 whitespace-nowrap">
            {language === 'ar' ? 'المطور' : 'Dev'}
          </span>
        </div>

        {/* Action Buttons: WhatsApp & Call */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* WhatsApp Button */}
          <a
            href="https://wa.me/201203730493"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-2xl bg-[#00c950] hover:bg-[#00b547] active:scale-98 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12.031 2C6.495 2 2 6.484 2 12.019c0 1.996.59 3.864 1.611 5.434L2 22l4.673-1.579a9.96 9.96 0 0 0 5.358 1.579c5.536 0 10.031-4.484 10.031-10.019C22.062 6.484 17.567 2 12.031 2zm5.789 14.218c-.244.686-1.42 1.32-1.968 1.378-.518.056-1.18.083-3.666-.948-3.08-1.277-5.06-4.409-5.213-4.614-.154-.204-1.246-1.657-1.246-3.158 0-1.502.788-2.24 1.066-2.528.278-.288.608-.36.811-.36.203 0 .406.002.583.01.189.008.441-.072.69.525.253.609.863 2.103.939 2.257.076.153.127.332.025.536-.101.203-.152.33-.304.508-.153.178-.32.398-.458.535-.152.153-.31.319-.133.624.178.305.79 1.303 1.696 2.11 1.168 1.04 2.153 1.362 2.457 1.515.305.152.483.127.66-.077.178-.203.762-.888.965-1.192.203-.305.407-.254.686-.152.279.102 1.777.838 2.081.99.305.153.508.229.584.356.076.127.076.737-.168 1.423z" />
            </svg>
            <span>{language === 'ar' ? 'واتساب' : 'WhatsApp'}</span>
          </a>

          {/* Call Button */}
          <a
            href="tel:01203730493"
            className="py-2.5 px-3 rounded-2xl bg-[#124267]/90 hover:bg-[#164f7b] border border-[#2b6592] active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Phone size={16} className="text-[#f59e0b] shrink-0" />
            <span>{language === 'ar' ? 'اتصال' : 'Call'}</span>
          </a>
        </div>
      </div>

      {/* Monthly Budget Card - Single Line with Rectangle Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <PieChart size={17} />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
            {t.settings.monthlyBudget}
          </span>
        </div>

        {isEditingBudget ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              inputMode="decimal"
              value={budgetInput}
              onChange={e => setBudgetInput(normalizeArabicNumerals(e.target.value))}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveBudget();
                if (e.key === 'Escape') {
                  setBudgetInput(budget.amount.toString());
                  setIsEditingBudget(false);
                }
              }}
              className="w-28 sm:w-32 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-2 border-blue-500 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white text-center focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleSaveBudget}
              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-colors"
              title={t.settings.saveBudget}
            >
              <Check size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setBudgetInput(budget.amount.toString());
                setIsEditingBudget(false);
              }}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer transition-colors"
              title={t.settings.cancel}
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingBudget(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 shrink-0"
            title={language === 'ar' ? 'انقر لتعديل الميزانية' : 'Click to edit budget'}
          >
            {budget.amount > 0 ? formatCurrency(budget.amount, settings.currency, language, false, numberFormat) : (language === 'ar' ? 'حدد الميزانية' : 'Set budget')}
          </button>
        )}
      </div>

      {/* Preferences: Language & Theme Switches */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        {/* Language Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Globe size={17} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t.settings.language}
              </span>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === 'ar'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span className="arabic-text" dir="rtl" lang="ar">
                العربية
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme Switch */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              theme === 'dark' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-400' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-500'
            }`}>
              {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {t.settings.theme}
              </span>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sun size={13} className="text-amber-500" />
              <span>{language === 'ar' ? 'فاتح' : 'Light'}</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-900 text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Moon size={13} className="text-blue-400" />
              <span>{language === 'ar' ? 'داكن' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Numeral System Switch */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Hash size={17} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {language === 'ar' ? 'نظام الأرقام' : 'Numeral System'}
              </span>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setNumberFormat('western')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                numberFormat === 'western'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              123
            </button>
            <button
              type="button"
              onClick={() => setNumberFormat('arabic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                numberFormat === 'arabic'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              ١٢٣
            </button>
          </div>
        </div>
      </div>

      {/* Accounts & Wallets Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div 
          onClick={() => setIsAccountsOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>{t.settings.accounts}</span>
              <bdi className="font-semibold text-slate-500 dark:text-slate-400">({formatNum(accounts.length)})</bdi>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddAccount();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 shadow-2xs transition-all cursor-pointer select-none"
            >
              <span>{language === 'ar' ? 'حساب' : 'Account'}</span>
            </button>
            <div className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${isAccountsOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {isAccountsOpen && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-64 overflow-y-auto no-scrollbar animate-in fade-in duration-200">
            {accountSummaries.summaries.map(s => {
              const acc = s.account;
              return (
                <div
                  key={acc.id}
                  onClick={() => handleOpenEditAccount(acc)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 select-none ${
                    acc.isActive 
                      ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' 
                      : 'bg-slate-100/60 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-2">
                    <AccountIcon name={acc.icon || acc.type} size={18} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-normal" title={getAccountDisplayName(acc.name, language)}>
                          {getAccountDisplayName(acc.name, language)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate leading-normal">
                        {getAccountTypeDisplayName(acc.type, language)} · <strong className={s.currentBalance < 0 ? 'text-rose-600 font-semibold' : 'text-slate-700 dark:text-slate-300 font-semibold'}>{formatCurrency(s.currentBalance, settings.currency, language, false, numberFormat)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => saveAccountItem({ ...acc, showOnHome: acc.showOnHome === false ? true : false })}
                      className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        (acc.showOnHome ?? true)
                          ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                          : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                      }`}
                      title={(acc.showOnHome ?? true) ? (language === 'ar' ? 'إخفاء من الرئيسية' : 'Hide from Home') : (language === 'ar' ? 'إظهار في الرئيسية' : 'Show on Home')}
                    >
                      {(acc.showOnHome ?? true) ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (accounts.length <= 1) {
                          showToast(
                            language === 'ar' ? 'لا يمكن حذف المحفظة الوحيدة المتبقية' : 'Cannot delete the only remaining wallet'
                          );
                          return;
                        }
                        setConfirmAction({
                          title: language === 'ar' ? `حذف محفظة "${getAccountDisplayName(acc.name, language)}"` : `Delete Wallet "${acc.name}"`,
                          desc: language === 'ar' 
                            ? 'هل أنت متأكد من حذف هذه المحفظة؟ سيتم تحويل المعاملات المرتبطة بها تلقائياً إلى المحفظة المتبقية.' 
                            : 'Are you sure you want to delete this wallet? Associated transactions will be reassigned.',
                          confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete',
                          isDanger: true,
                          onConfirm: async () => {
                            await deleteAccountItem(acc.id);
                            setConfirmAction(null);
                          },
                        });
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs cursor-pointer transition-colors"
                      title={language === 'ar' ? 'حذف المحفظة' : 'Delete Wallet'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Management */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div 
          onClick={() => setIsCategoriesOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>{t.settings.categories}</span>
              <bdi className="font-semibold text-slate-500 dark:text-slate-400">({formatNum(categories.length)})</bdi>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddCategory();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 shadow-2xs transition-all cursor-pointer select-none"
            >
              <span>{language === 'ar' ? 'فئة' : 'Category'}</span>
            </button>
            <div className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${isCategoriesOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {isCategoriesOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-56 overflow-y-auto no-scrollbar animate-in fade-in duration-200">
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => handleOpenEditCategory(cat)}
                className="p-2 rounded-xl border flex items-center justify-between gap-1.5 transition-colors cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 select-none"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 pe-1">
                  <CategoryIcon name={cat.icon} color={cat.color} size={15} />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate leading-normal" title={getCategoryDisplayName(cat.name, language)}>
                    {getCategoryDisplayName(cat.name, language)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction({
                        title: language === 'ar' ? `حذف فئة "${getCategoryDisplayName(cat.name, language)}"` : `Delete Category "${cat.name}"`,
                        desc: language === 'ar' 
                          ? 'هل أنت متأكد من حذف هذه الفئة؟ سيتم تحويل المعاملات المرتبطة بها تلقائياً إلى فئة "أخرى".' 
                          : 'Are you sure you want to delete this category? Associated expenses will be reassigned to "Other".',
                        confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete',
                        isDanger: true,
                        onConfirm: async () => {
                          await deleteCategoryItem(cat.id);
                          setConfirmAction(null);
                        },
                      });
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg text-xs cursor-pointer transition-colors"
                    title={language === 'ar' ? 'حذف الفئة' : 'Delete Category'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recurring Transactions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div 
          onClick={() => setIsRecurringOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Repeat size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>{t.settings.recurring}</span>
              {recurring.length > 0 && (
                <bdi className="font-semibold text-slate-500 dark:text-slate-400">({formatNum(recurring.length)})</bdi>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAddRecurring();
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 active:scale-95 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 shadow-2xs transition-all cursor-pointer select-none"
            >
              <span>{language === 'ar' ? 'معاملة' : 'Recurring'}</span>
            </button>
            <div className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${isRecurringOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {isRecurringOpen && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            {recurring.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                {language === 'ar' ? 'لا توجد معاملات متكررة مجدولة.' : 'No recurring transactions configured.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {recurring.map(rec => (
                  <div 
                    key={rec.id} 
                    onClick={() => handleOpenEditRecurring(rec)}
                    className="py-2.5 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-between cursor-pointer transition-colors select-none"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {rec.note}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatCurrency(rec.amount, settings.currency, language, false, numberFormat)} · {getFrequencyDisplayName(rec.frequency, language)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmAction({
                            title: language === 'ar' ? `حذف المعاملة المتكررة "${rec.note}"` : `Delete Recurring "${rec.note}"`,
                            desc: language === 'ar' 
                              ? 'هل أنت متأكد من رغبتك في حذف هذه المعاملة المتكررة؟ لن يتم تكرارها تلقائياً بعد الآن.' 
                              : 'Are you sure you want to delete this recurring transaction?',
                            confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete',
                            isDanger: true,
                            onConfirm: async () => {
                              await removeRecurringItem(rec.id);
                              setConfirmAction(null);
                            },
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        title={language === 'ar' ? 'حذف المعاملة المتكررة' : 'Delete Recurring'}
                        aria-label="Delete recurring item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy & Security Dropdown Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div
          onClick={() => setIsSecurityOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {language === 'ar' ? 'الخصوصية والأمان' : 'Privacy & Security'}
              </h2>
              {(settings.pinLockEnabled || settings.biometricLock) && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                  {language === 'ar' ? 'القفل مفعل' : 'Lock Enabled'}
                </span>
              )}
            </div>
          </div>
          <div className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${isSecurityOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>

        {isSecurityOpen && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200 text-xs">
            {/* PIN Lock Toggle with inline Change PIN button next to title */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Lock size={15} className="text-slate-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {language === 'ar' ? 'قفل التطبيق برمز PIN' : 'PIN Passcode Lock'}
                </span>
                {settings.pinLockEnabled && (
                  <button
                    type="button"
                    onClick={() => handleOpenSetPin(true)}
                    className="px-2.5 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-bold text-[11px] cursor-pointer transition-colors border border-blue-200/50 dark:border-blue-800/40"
                  >
                    {language === 'ar' ? 'تغيير الرمز' : 'Change PIN'}
                  </button>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.pinLockEnabled)}
                onClick={handleTogglePinLock}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${settings.pinLockEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${settings.pinLockEnabled ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Biometrics Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint size={16} className={biometricsAvailable ? 'text-blue-500' : 'text-slate-400'} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      {language === 'ar' ? 'بصمة الإصبع أو الوجه' : 'Fingerprint / Face ID'}
                    </span>
                    {biometricsAvailable && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-semibold">
                        {language === 'ar' ? 'مدعومة' : 'Supported'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                disabled={isEnrollingBiometrics}
                aria-checked={Boolean(settings.biometricLock)}
                onClick={handleToggleBiometrics}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${settings.biometricLock ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${settings.biometricLock ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* App Switcher Blur Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {language === 'ar' ? 'تعتيم التطبيق عند التبديل' : 'App Switcher Privacy Blur'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.privacyBlurEnabled ?? true)}
                onClick={() => updateSettings({ privacyBlurEnabled: !(settings.privacyBlurEnabled ?? true) })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${(settings.privacyBlurEnabled ?? true) ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${(settings.privacyBlurEnabled ?? true) ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Auto Privacy on Launch Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  {language === 'ar' ? 'بدء التطبيق دائماً بوضع الخصوصية' : 'Mask Amounts on App Launch'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings.autoPrivacyModeOnLaunch)}
                onClick={() => {
                  const next = !settings.autoPrivacyModeOnLaunch;
                  updateSettings({ autoPrivacyModeOnLaunch: next });
                  try {
                    localStorage.setItem('masrofy_auto_privacy_launch', String(next));
                  } catch {}
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${settings.autoPrivacyModeOnLaunch ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${settings.autoPrivacyModeOnLaunch ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Data Management: Export & Import CSV & JSON Backup (Compact 2-Row Design) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div 
          onClick={() => setIsDataStorageOpen(prev => !prev)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Download size={18} className="text-purple-600 dark:text-purple-400" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t.settings.dataStorage}
            </h2>
          </div>
          <div className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform duration-200 ${isDataStorageOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>

        {isDataStorageOpen && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            {/* Hidden File Inputs triggered via ref */}
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleBackupUpload}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCSVUpload}
              className="hidden"
            />

            {/* Row 1: Full System Backup (JSON) */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-100/70 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Lock size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                    JSON
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={downloadFullBackupJSON}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/80 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={language === 'ar' ? 'تصدير نسخة احتياطية' : 'Export JSON Backup'}
                >
                  <Download size={13} className="text-purple-600 dark:text-purple-400" />
                  <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => backupFileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={language === 'ar' ? 'استيراد نسخة احتياطية' : 'Import JSON Backup'}
                >
                  <Upload size={13} />
                  <span>{language === 'ar' ? 'استيراد' : 'Import'}</span>
                </button>
              </div>
            </div>

            {/* Row 2: Excel Spreadsheet (CVS) */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <PieChart size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                    CVS
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={downloadCSV}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/80 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={language === 'ar' ? 'تصدير ملف إكسل' : 'Export CSV'}
                >
                  <Download size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>{language === 'ar' ? 'تصدير' : 'Export'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                  title={language === 'ar' ? 'استيراد ملف إكسل' : 'Import CSV'}
                >
                  <Upload size={13} />
                  <span>{language === 'ar' ? 'استيراد' : 'Import'}</span>
                </button>
              </div>
            </div>

            {/* Reset All Data (Factory Reset) */}
            <button
              type="button"
              onClick={() => {
                setConfirmAction({
                  title: t.settings.confirmReset,
                  desc: t.settings.confirmResetDesc,
                  confirmLabel: t.settings.resetNow,
                  isDanger: true,
                  onConfirm: async () => {
                    await resetAllData();
                    showToast(language === 'ar' ? 'تمت إعادة ضبط كافة البيانات' : 'All data has been reset');
                  },
                });
              }}
              className="w-full p-2.5 rounded-xl bg-rose-50/60 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs"
            >
              <Trash2 size={15} />
              <span>{t.settings.resetData}</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="p-1 -ms-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={language === 'ar' ? 'رجوع' : 'Back'}
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingCategory ? (language === 'ar' ? 'تعديل الفئة' : 'Edit Category') : t.settings.addCategory}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddCategoryOpen(false);
                  setEditingCategory(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {t.settings.categoryName}
                </label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: سفر، استثمار، دراسة' : 'e.g. Travel, Investments, Pet'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <StyledIconSelector
                selectedIcon={newCatIcon}
                selectedColor={newCatColor}
                onSelect={(icon, color) => {
                  setNewCatIcon(icon);
                  setNewCatColor(color);
                }}
                language={language}
              />

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingCategory.id;
                      const nameToDelete = editingCategory.name;
                      setIsAddCategoryOpen(false);
                      setEditingCategory(null);
                      setConfirmAction({
                        title: language === 'ar' ? `حذف فئة "${getCategoryDisplayName(nameToDelete, language)}"` : `Delete Category "${nameToDelete}"`,
                        desc: language === 'ar' 
                          ? 'هل أنت متأكد من رغبتك في حذف هذه الفئة؟ سيتم تحويل المعاملات المرتبطة بها تلقائياً إلى فئة "أخرى".' 
                          : 'Are you sure you want to delete this category? Associated transactions will be reassigned to "Other".',
                        confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete',
                        isDanger: true,
                        onConfirm: async () => {
                          await deleteCategoryItem(idToDelete);
                          setConfirmAction(null);
                        },
                      });
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-xl cursor-pointer flex items-center gap-1 transition-colors text-xs"
                  >
                    <Trash2 size={13} />
                    <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryOpen(false)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer text-xs"
                  >
                    {t.addExpense.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!newCatName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer text-xs"
                  >
                    {t.addExpense.save}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Recurring Modal */}
      {isAddRecurringOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRecurringOpen(false)}
                  className="p-1 -ms-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={language === 'ar' ? 'رجوع' : 'Back'}
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingRecurring ? (language === 'ar' ? 'تعديل معاملة متكررة' : 'Edit Recurring') : t.settings.addRecurring}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddRecurringOpen(false);
                  setEditingRecurring(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {t.addExpense.noteOptional}
                </label>
                <input
                  type="text"
                  value={recNote}
                  onChange={e => setRecNote(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: اشتراك نتفليكس، إيجار، جيم' : 'e.g. Netflix, Rent, Gym'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {t.addExpense.amount} ({getCurrencySymbol(settings.currency, language)})
                </label>
                <input
                  type="number"
                  step="any"
                  value={recAmount}
                  onChange={e => setRecAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    {t.settings.frequency}
                  </label>
                  <select
                    value={recFreq}
                    onChange={e => setRecFreq(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="daily">{t.settings.daily}</option>
                    <option value="weekly">{t.settings.weekly}</option>
                    <option value="monthly">{t.settings.monthly}</option>
                    <option value="yearly">{t.settings.yearly}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    {t.addExpense.category}
                  </label>
                  <select
                    value={recCatId}
                    onChange={e => setRecCatId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {getCategoryDisplayName(c.name, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    {t.addExpense.paidFrom}
                  </label>
                  <select
                    value={recAccountId}
                    onChange={e => setRecAccountId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {accounts.filter(a => a.isActive).map(a => (
                      <option key={a.id} value={a.id}>
                        {getAccountDisplayName(a.name, language)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    {t.addExpense.date}
                  </label>
                  <input
                    type="date"
                    value={recNextDate}
                    onChange={e => setRecNextDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRecurringOpen(false)}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  {t.addExpense.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!recNote.trim() || !recAmount}
                  className="px-4 py-2 bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-xl"
                >
                  {t.addExpense.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal Sheet */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    setEditingAccount(null);
                  }}
                  className="p-1 -ms-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={language === 'ar' ? 'رجوع' : 'Back'}
                >
                  <ArrowLeft size={16} className="rtl:rotate-180" />
                </button>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
                  <span>{editingAccount ? t.settings.editAccountModal : t.settings.addAccountModal}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setEditingAccount(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.settings.accountName}
                </label>
                <input
                  type="text"
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: البنك الأهلي، المحفظة النقدية' : 'e.g. Main Bank, Wallet Cash'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.settings.accountType}
                  </label>
                  <select
                    value={accType}
                    onChange={e => setAccType(e.target.value as AccountType)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="cash">{getAccountTypeDisplayName('cash', language)}</option>
                    <option value="bank">{getAccountTypeDisplayName('bank', language)}</option>
                    <option value="debit_card">{getAccountTypeDisplayName('debit_card', language)}</option>
                    <option value="credit_card">{getAccountTypeDisplayName('credit_card', language)}</option>
                    <option value="mobile_wallet">{getAccountTypeDisplayName('mobile_wallet', language)}</option>
                    <option value="savings">{getAccountTypeDisplayName('savings', language)}</option>
                    <option value="other">{getAccountTypeDisplayName('other', language)}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.settings.openingBalance}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={accOpeningBalance}
                    onChange={e => setAccOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <StyledIconSelector
                targetType="account"
                selectedIcon={accIcon}
                selectedColor={accColor}
                onSelect={(icon, color) => {
                  setAccIcon(icon);
                  setAccColor(color);
                }}
                language={language}
              />

              <div className="pt-2 flex items-center justify-between gap-2">
                {editingAccount ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingAccount.id;
                      const nameToDelete = editingAccount.name;
                      setIsAccountModalOpen(false);
                      setEditingAccount(null);
                      setConfirmAction({
                        title: language === 'ar' ? `حذف محفظة "${nameToDelete}"` : `Delete Wallet "${nameToDelete}"`,
                        desc: language === 'ar' 
                          ? 'هل أنت متأكد من رغبتك في حذف هذه المحفظة نهائياً من حساباتك؟' 
                          : 'Are you sure you want to permanently delete this wallet?',
                        confirmLabel: language === 'ar' ? 'نعم، احذف' : 'Delete',
                        isDanger: true,
                        onConfirm: async () => {
                          await deleteAccountItem(idToDelete);
                          setConfirmAction(null);
                        },
                      });
                    }}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-xl cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountModalOpen(false);
                      setEditingAccount(null);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                  >
                    {t.settings.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={!accName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer"
                  >
                    {editingAccount ? (language === 'ar' ? 'تحديث الحساب' : 'Update Account') : (language === 'ar' ? 'حفظ الحساب' : 'Save Account')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Dialog Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {confirmAction.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              {confirmAction.desc}
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
              >
                {t.settings.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmAction.onConfirm;
                  setConfirmAction(null);
                  if (fn) {
                    await fn();
                  }
                }}
                className={`px-4 py-2 font-semibold text-white rounded-xl cursor-pointer ${
                  confirmAction.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Set / Change PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <KeyRound size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isDisablingPin 
                    ? (language === 'ar' ? 'إيقاف قفل التطبيق' : 'Disable Lock')
                    : isChangingPin 
                      ? (language === 'ar' ? 'تغيير رمز القفل' : 'Change Lock PIN')
                      : (language === 'ar' ? 'تعيين رمز القفل' : 'Set Lock PIN')
                  }
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setIsChangingPin(false);
                  setIsDisablingPin(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* If disabling or changing, require current PIN */}
              {(isDisablingPin || isChangingPin) && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                    {language === 'ar' ? 'أدخل رمز المرور الحالي (6 أرقام):' : 'Enter current 6-digit PIN:'}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    dir="ltr"
                    style={{ direction: 'ltr' }}
                    maxLength={6}
                    value={currentPinInput}
                    onChange={e => {
                      const normalized = normalizeArabicNumerals(e.target.value);
                      const val = normalized.replace(/\D/g, '').slice(0, 6);
                      setCurrentPinInput(val);
                      setPinError('');
                    }}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.8em] font-mono text-lg font-black py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                  />
                  {settings.biometricLock && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await authenticateWithBiometrics();
                        if (res.success) {
                          setCurrentPinInput(settings.passcode || '123456');
                          setPinError('');
                          showToast(language === 'ar' ? 'تم تأكيد الهوية بالبصمة' : 'Verified via biometrics');
                        } else {
                          setPinError(language === 'ar' ? 'فشلت المصادقة بالبصمة' : 'Biometric verification failed');
                        }
                      }}
                      className="mt-1.5 w-full py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Fingerprint size={13} />
                      <span>{language === 'ar' ? 'نسيت الرمز؟ تحقق ببصمة الإصبع' : 'Forgot PIN? Verify with Fingerprint'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* If NOT disabling, show new PIN fields */}
              {!isDisablingPin && (
                <>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                      {isChangingPin 
                        ? (language === 'ar' ? 'أدخل الرمز الجديد (6 أرقام):' : 'Enter new 6-digit PIN:')
                        : (language === 'ar' ? 'أدخل رمزاً مكوناً من 6 أرقام:' : 'Enter 6-digit PIN:')
                      }
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      dir="ltr"
                      style={{ direction: 'ltr' }}
                      maxLength={6}
                      value={pinInput}
                      onChange={e => {
                        const normalized = normalizeArabicNumerals(e.target.value);
                        const val = normalized.replace(/\D/g, '').slice(0, 6);
                        setPinInput(val);
                        setPinError('');
                      }}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.8em] font-mono text-lg font-black py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                      {language === 'ar' ? 'تأكيد الرمز مرة أخرى:' : 'Confirm PIN:'}
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      dir="ltr"
                      style={{ direction: 'ltr' }}
                      maxLength={6}
                      value={pinConfirmInput}
                      onChange={e => {
                        const normalized = normalizeArabicNumerals(e.target.value);
                        const val = normalized.replace(/\D/g, '').slice(0, 6);
                        setPinConfirmInput(val);
                        setPinError('');
                      }}
                      placeholder="••••••"
                      className="w-full text-center tracking-[0.8em] font-mono text-lg font-black py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {pinError && (
                <p className="text-xs text-rose-500 text-center font-bold">
                  {pinError}
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setIsChangingPin(false);
                    setIsDisablingPin(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={
                    isDisablingPin 
                      ? currentPinInput.length !== 6
                      : isChangingPin 
                        ? (currentPinInput.length !== 6 || pinInput.length !== 6 || pinConfirmInput.length !== 6)
                        : (pinInput.length !== 6 || pinConfirmInput.length !== 6)
                  }
                  onClick={handleSavePin}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-white cursor-pointer transition-colors shadow-xs disabled:opacity-40 ${
                    isDisablingPin ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isDisablingPin 
                    ? (language === 'ar' ? 'تأكيد الإيقاف' : 'Disable')
                    : isChangingPin 
                      ? (language === 'ar' ? 'تحديث الرمز' : 'Update PIN')
                      : (language === 'ar' ? 'حفظ وتفعيل' : 'Save & Enable')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
