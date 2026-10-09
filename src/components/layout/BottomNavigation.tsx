import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, ArrowLeftRight, LineChart, Settings, Plus } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, openAddExpense, language, t } = useApp();

  return (
    <nav 
      role="navigation" 
      aria-label={language === 'ar' ? 'شريط التنقل الرئيسي' : 'Main Navigation'}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t sm:border-x border-slate-200/80 dark:border-slate-800 transition-colors pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]"
    >
      <div className="px-3 py-1.5 flex items-center justify-between">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Home size={20} strokeWidth={activeTab === 'home' ? 2.3 : 1.8} />
          <span className="text-[11px] font-medium mt-1 tracking-tight">
            {t.nav.home}
          </span>
        </button>

        {/* Tab 2: Transactions */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowLeftRight size={20} strokeWidth={activeTab === 'transactions' ? 2.3 : 1.8} />
          <span className="text-[11px] font-medium mt-1 tracking-tight">
            {t.nav.transactions}
          </span>
        </button>

        {/* CENTER ACTION BUTTON: SQUARE WITH ROUNDED CORNERS INLINE WITH FOOTER */}
        <div className="flex-1 flex items-center justify-center py-0.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              openAddExpense();
            }}
            title={t.nav.addExpense}
            aria-label={t.nav.addExpense}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/30 flex items-center justify-center transition-all cursor-pointer focus:outline-hidden"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>

        {/* Tab 3: Insights */}
        <button
          type="button"
          onClick={() => setActiveTab('insights')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'insights'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LineChart size={20} strokeWidth={activeTab === 'insights' ? 2.3 : 1.8} />
          <span className="text-[11px] font-medium mt-1 tracking-tight">
            {t.nav.insights}
          </span>
        </button>

        {/* Tab 4: Settings */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.3 : 1.8} />
          <span className="text-[11px] font-medium mt-1 tracking-tight">
            {t.nav.settings}
          </span>
        </button>
      </div>
    </nav>
  );
};
