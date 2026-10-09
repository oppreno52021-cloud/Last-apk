import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { HomeScreen } from '../home/HomeScreen';
import { TransactionsScreen } from '../transactions/TransactionsScreen';
import { InsightsScreen } from '../insights/InsightsScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { BottomNavigation } from './BottomNavigation';
import { AddExpenseModal } from '../expense/AddExpenseModal';
import { TransactionDetailModal } from '../transactions/TransactionDetailModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { LockScreen } from '../security/LockScreen';
import { Toast } from '../ui/Toast';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useBackHandler } from '../../hooks/useBackHandler';
import { navigationManager } from '../../utils/navigationManager';
import { Shield } from 'lucide-react';

export const MobileShell: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    isAddExpenseOpen, 
    openAddExpense,
    closeAddExpense, 
    editingExpense, 
    setEditingExpense, 
    viewingExpense, 
    setViewingExpense,
    settings,
    isLoading,
    language,
    showToast,
    expenses,
    accounts,
    categories,
    recurring,
    updateSettings
  } = useApp();

  const isLockEnabled = Boolean(settings.pinLockEnabled || settings.biometricLock);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Derive onboarding state reliably from persisted data
  useEffect(() => {
    if (!isLoading) {
      const isExistingUser = Boolean(
        settings.hasCompletedOnboarding ||
        expenses.length > 0 ||
        accounts.length > 0 ||
        categories.length > 0 ||
        recurring.length > 0
      );

      if (!isExistingUser) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
        if (!settings.hasCompletedOnboarding) {
          updateSettings({ hasCompletedOnboarding: true });
        }
      }
    }
  }, [isLoading, settings.hasCompletedOnboarding, expenses.length, accounts.length, categories.length, recurring.length, updateSettings]);
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const pin = localStorage.getItem('masrofy_pin_lock') === 'true';
      const bio = localStorage.getItem('masrofy_biometric_lock') === 'true';
      return pin || bio;
    } catch {
      return false;
    }
  });
  const [isAppBlurred, setIsAppBlurred] = useState(false);

  // Sync isLocked whenever isLockEnabled becomes active
  useEffect(() => {
    if (isLockEnabled) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [isLockEnabled]);

  useEffect(() => {
    if (!isLockEnabled) {
      setIsLocked(false);
      return;
    }

    const lockAppImmediately = () => {
      setIsLocked(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (settings.privacyBlurEnabled ?? true) {
          setIsAppBlurred(true);
        }
        lockAppImmediately();
      } else {
        if (settings.privacyBlurEnabled ?? true) {
          setIsAppBlurred(false);
        }
        lockAppImmediately();
      }
    };

    const handlePageHide = () => {
      lockAppImmediately();
    };

    const handleBlur = () => {
      lockAppImmediately();
    };

    const handleLockNow = () => {
      lockAppImmediately();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('masrofy_lock_now', handleLockNow);

    // Native Android App Lifecycle listener via Capacitor
    let capacitorListener: any = null;
    try {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            lockAppImmediately();
          } else {
            lockAppImmediately();
          }
        }).then(listener => {
          capacitorListener = listener;
        }).catch(() => {});
      }
    } catch {}

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('masrofy_lock_now', handleLockNow);
      if (capacitorListener?.remove) {
        capacitorListener.remove();
      }
    };
  }, [isLockEnabled, settings.privacyBlurEnabled]);

  // Onboarding back handler
  useBackHandler(showOnboarding, () => setShowOnboarding(false), 'onboarding');

  // Unified Tab & Back Navigation:
  useEffect(() => {
    navigationManager.init(
      activeTab, 
      (tab) => {
        setActiveTab(tab);
      },
      () => {}
    );
  }, [setActiveTab]);

  useEffect(() => {
    navigationManager.setTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    navigationManager.setLocked(Boolean(isLockEnabled && isLocked));
  }, [isLockEnabled, isLocked]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Mobile-first viewport container */}
      <main className="w-full max-w-md min-h-screen flex flex-col relative bg-slate-50 dark:bg-slate-950 sm:shadow-sm sm:border-x sm:border-slate-200/80 dark:sm:border-slate-800">
        {/* Screen Body with safe area padding */}
        <div className="flex-1 w-full px-4 pt-3 pb-24">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{settings.language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</span>
            </div>
          ) : (
            <>
              {activeTab === 'home' && <HomeScreen />}
              {activeTab === 'transactions' && <TransactionsScreen />}
              {activeTab === 'insights' && <InsightsScreen />}
              {activeTab === 'settings' && <SettingsScreen />}
            </>
          )}
        </div>

        {/* Bottom Navigation with Center Elevated + Button */}
        <BottomNavigation />
      </main>

      {/* Add Expense / Income Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          closeAddExpense();
          setEditingExpense(null);
        }}
        editExpense={editingExpense}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
        onEdit={(exp) => {
          setViewingExpense(null);
          setEditingExpense(exp);
          openAddExpense();
        }}
      />

      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* App Switcher Privacy Blur Veil */}
      {isAppBlurred && !isLocked && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white text-center select-none animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 shadow-lg">
            <Shield size={32} />
          </div>
          <span className="text-base font-extrabold text-slate-200">
            {language === 'ar' ? 'مصروفي محمي بالخصوصية' : 'Masrofy Privacy Guard'}
          </span>
        </div>
      )}

      {/* Biometric & Passcode Lock Screen */}
      {isLockEnabled && isLocked && (
        <LockScreen
          onUnlock={() => setIsLocked(false)}
          savedPasscode={settings.passcode || '123456'}
          biometricEnabled={Boolean(settings.biometricLock)}
          pinEnabled={Boolean(settings.pinLockEnabled)}
          language={language === 'en' ? 'en' : 'ar'}
        />
      )}

      {/* Global Toast with Undo support */}
      <Toast />
    </div>
  );
};
