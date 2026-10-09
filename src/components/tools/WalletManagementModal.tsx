import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Account, AccountType } from '../../types';
import { AccountIcon } from '../common/AccountIcon';
import { StyledIconSelector } from '../common/StyledIconSelector';
import { formatCurrency } from '../../utils/calculations';
import { getAccountDisplayName, getAccountTypeDisplayName } from '../../utils/i18n';
import { 
  X, 
  ArrowLeft,
  Plus, 
  Trash2, 
  Check, 
  Wallet, 
  Eye,
  EyeOff
} from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useBackHandler } from '../../hooks/useBackHandler';

interface WalletManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WALLET_PRESETS = [
  { name: 'كاش', nameEn: 'Cash', type: 'cash' as AccountType, color: '#10B981' },
  { name: 'فودافون كاش', nameEn: 'Vodafone Cash', type: 'mobile_wallet' as AccountType, color: '#EF4444' },
  { name: 'إنستاباي', nameEn: 'InstaPay', type: 'mobile_wallet' as AccountType, color: '#8B5CF6' },
  { name: 'البنك الأهلي', nameEn: 'National Bank', type: 'bank' as AccountType, color: '#059669' },
  { name: 'بنك مصر', nameEn: 'Banque Misr', type: 'bank' as AccountType, color: '#D97706' },
  { name: 'CIB', nameEn: 'CIB', type: 'bank' as AccountType, color: '#2563EB' },
  { name: 'فيزا مشتريات', nameEn: 'Credit Card', type: 'credit_card' as AccountType, color: '#6366F1' },
];

const WALLET_COLORS = [
  '#10B981', '#2563EB', '#8B5CF6', '#EF4444', 
  '#F59E0B', '#06B6D4', '#EC4899', '#64748B'
];

export const WalletManagementModal: React.FC<WalletManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    accounts, 
    accountSummaries, 
    saveAccountItem, 
    deleteAccountItem, 
    settings, 
    updateSettings,
    language, 
    isPrivacyMode, 
    showToast 
  } = useApp();

  const [isEditingOrAdding, setIsEditingOrAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [color, setColor] = useState('#10B981');
  const [icon, setIcon] = useState('Banknote');
  const [showOnHome, setShowOnHome] = useState(true);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useBodyScrollLock(isOpen);
  useBackHandler(isOpen, onClose, 'wallet-modal');
  useBackHandler(isEditingOrAdding, () => {
    setIsEditingOrAdding(false);
    setEditingAccount(null);
  }, 'wallet-edit');
  useBackHandler(Boolean(accountToDelete), () => setAccountToDelete(null), 'wallet-delete');

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('cash');
    setOpeningBalance('0');
    setColor('#10B981');
    setIcon('Banknote');
    setShowOnHome(true);
    setIsEditingOrAdding(true);
  };

  const handleStartEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalance(acc.openingBalance.toString());
    setColor(acc.color || '#10B981');
    setIcon(acc.icon || 'Banknote');
    setShowOnHome(acc.showOnHome ?? true);
    setIsEditingOrAdding(true);
  };

  const handleApplyPreset = (preset: typeof WALLET_PRESETS[0]) => {
    setName(language === 'ar' ? preset.name : preset.nameEn);
    setType(preset.type);
    setColor(preset.color);
    setIcon(preset.type === 'cash' ? 'Banknote' : preset.type === 'mobile_wallet' ? 'Smartphone' : preset.type === 'credit_card' ? 'CreditCard' : 'Landmark');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'ar' ? 'يرجى إدخال اسم المحفظة' : 'Please enter wallet name');
      return;
    }
    const balance = parseFloat(openingBalance) || 0;

    try {
      if (editingAccount) {
        await saveAccountItem({
          ...editingAccount,
          name: name.trim(),
          type,
          openingBalance: balance,
          color,
          icon,
          showOnHome,
        });
      } else {
        await saveAccountItem({
          id: `acc-${Date.now()}`,
          name: name.trim(),
          type,
          openingBalance: balance,
          currency: settings.currency,
          color,
          icon: icon || (type === 'cash' ? 'Banknote' : type === 'mobile_wallet' ? 'Smartphone' : 'Landmark'),
          isActive: true,
          isArchived: false,
          showOnHome,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      setIsEditingOrAdding(false);
      setEditingAccount(null);
    } catch {
      // Handled in context
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl z-10 overflow-hidden"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ms-1 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={language === 'ar' ? 'رجوع' : 'Back'}
            >
              <ArrowLeft size={18} className="rtl:rotate-180" />
            </button>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'إدارة المحافظ والحسابات' : 'Manage Wallets & Accounts'}
              </h2>
              <span className="text-[11px] text-slate-400 block">
                {language === 'ar' ? `${accounts.length} محافظ مسجلة` : `${accounts.length} active wallets`}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
          {/* Top Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block">
                {language === 'ar' ? 'إجمالي رصيد كل محافظك' : 'Total Across All Wallets'}
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block tracking-tight">
                {formatCurrency(accountSummaries.totalNetWorth, settings.currency, language, isPrivacyMode)}
              </span>
            </div>

            {!isEditingOrAdding && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus size={15} />
                <span>{language === 'ar' ? 'إضافة محفظة' : 'Add Wallet'}</span>
              </button>
            )}
          </div>

          {/* Form: Add or Edit Wallet */}
          {isEditingOrAdding ? (
            <form onSubmit={handleSave} className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {editingAccount 
                    ? (language === 'ar' ? `تعديل محفظة "${editingAccount.name}"` : `Edit "${editingAccount.name}"`)
                    : (language === 'ar' ? 'إضافة محفظة جديدة' : 'Add New Wallet')
                  }
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOrAdding(false);
                    setEditingAccount(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

              {/* Quick Presets for fast entry */}
              {!editingAccount && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {language === 'ar' ? 'اختر نموذجاً سريعاً:' : 'Quick Presets:'}
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {WALLET_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0 hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        {language === 'ar' ? preset.name : preset.nameEn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Wallet Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'ar' ? 'اسم المحفظة / الحساب' : 'Wallet Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={language === 'ar' ? 'مثال: فودافون كاش، البنك الأهلي...' : 'e.g. Vodafone Cash, Cash...'}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Wallet Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'ar' ? 'نوع المحفظة' : 'Type'}
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="cash">{language === 'ar' ? 'نقدي (كاش)' : 'Cash'}</option>
                    <option value="mobile_wallet">{language === 'ar' ? 'محفظة إلكترونية' : 'Mobile Wallet'}</option>
                    <option value="bank">{language === 'ar' ? 'حساب بنكي' : 'Bank Account'}</option>
                    <option value="credit_card">{language === 'ar' ? 'بطاقة ائتمان' : 'Credit Card'}</option>
                    <option value="savings">{language === 'ar' ? 'حساب توفير' : 'Savings'}</option>
                  </select>
                </div>

                {/* Opening Balance */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {language === 'ar' ? 'الرصيد الابتدائي' : 'Opening Balance'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {language === 'ar' ? 'لون المحفظة' : 'Color Tag'}
                </label>
                <div className="flex items-center gap-2">
                  {WALLET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                        color === c ? 'ring-2 ring-offset-2 ring-blue-600 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {color === c && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Icon selector */}
              <StyledIconSelector
                targetType="account"
                selectedIcon={icon}
                onSelect={(ic) => setIcon(ic)}
                language={language}
              />

              {/* Show on Home toggle */}
              <div className="flex items-center justify-between py-1 border-t border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-1.5">
                  <Eye size={14} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'ar' ? 'الظهور في الشاشة الرئيسية' : 'Show on Home screen'}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showOnHome}
                  onClick={() => setShowOnHome(!showOnHome)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${showOnHome ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${showOnHome ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {editingAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      if (accounts.length <= 1) {
                        showToast(language === 'ar' ? 'لا يمكن حذف المحفظة الوحيدة المتبقية' : 'Cannot delete the only remaining wallet');
                        return;
                      }
                      setAccountToDelete(editingAccount);
                    }}
                    className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title={language === 'ar' ? 'حذف المحفظة' : 'Delete Wallet'}
                  >
                    <Trash2 size={13} />
                    <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  {editingAccount ? (language === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (language === 'ar' ? 'تأكيد الإضافة' : 'Create Wallet')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingOrAdding(false);
                    setEditingAccount(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          ) : null}

          {/* Master Switch for Show Wallets on Home */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Eye size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                  {language === 'ar' ? 'الظهور في الرئيسية' : 'Show Wallets on Home'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {language === 'ar' ? 'تشغيل أو إيقاف شريط المحافظ في الشاشة الرئيسية' : 'Show or hide wallets strip on Home screen'}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showWalletsOnHome ?? true}
              onClick={() => updateSettings({ showWalletsOnHome: !(settings.showWalletsOnHome ?? true) })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${(settings.showWalletsOnHome ?? true) ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${(settings.showWalletsOnHome ?? true) ? 'ltr:translate-x-4 rtl:-translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Wallets List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block px-1">
              {language === 'ar' ? 'المحافظ الحالية:' : 'Your Wallets:'}
            </span>

            {accountSummaries.summaries.map(s => {
              const acc = s.account;

              return (
                <div
                  key={acc.id}
                  onClick={() => handleStartEdit(acc)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 select-none ${
                    acc.isActive 
                      ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800' 
                      : 'bg-slate-50 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  {/* Normal Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pe-2">
                      <AccountIcon name={acc.icon || acc.type} size={18} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-normal" title={getAccountDisplayName(acc.name, language)}>
                            {getAccountDisplayName(acc.name, language)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate mt-0.5 leading-normal">
                          {getAccountTypeDisplayName(acc.type, language)} · <strong className={s.currentBalance < 0 ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300 font-bold'}>
                            {formatCurrency(s.currentBalance, settings.currency, language, isPrivacyMode)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Show/Hide on Home Button */}
                      <button
                        type="button"
                        onClick={() => saveAccountItem({ ...acc, showOnHome: acc.showOnHome === false ? true : false })}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          (acc.showOnHome ?? true)
                            ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                            : 'text-slate-300 dark:text-slate-600 hover:text-slate-500'
                        }`}
                        title={(acc.showOnHome ?? true) ? (language === 'ar' ? 'إخفاء من الرئيسية' : 'Hide from Home') : (language === 'ar' ? 'إظهار في الرئيسية' : 'Show on Home')}
                      >
                        {(acc.showOnHome ?? true) ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>

                      {/* Delete Button with safe confirmation */}
                      <button
                        type="button"
                        onClick={() => {
                          if (accounts.length <= 1) {
                            showToast(language === 'ar' ? 'لا يمكن حذف المحفظة الوحيدة المتبقية' : 'Cannot delete the only remaining wallet');
                            return;
                          }
                          setAccountToDelete(acc);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف المحفظة' : 'Delete Wallet'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delete Wallet Confirmation Sub-Dialog */}
        {accountToDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? `حذف محفظة "${getAccountDisplayName(accountToDelete.name, language)}"` : `Delete Wallet "${accountToDelete.name}"`}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === 'ar' 
                  ? 'هل أنت متأكد من رغبتك في حذف هذه المحفظة؟ سيتم تحويل المعاملات المرتبطة بها تلقائياً إلى المحفظة المتبقية.' 
                  : 'Are you sure you want to delete this wallet? Associated transactions will be reassigned to the remaining wallet.'}
              </p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAccountToDelete(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = accountToDelete.id;
                    setAccountToDelete(null);
                    setIsEditingOrAdding(false);
                    setEditingAccount(null);
                    await deleteAccountItem(id);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  {language === 'ar' ? 'تأكيد الحذف' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

