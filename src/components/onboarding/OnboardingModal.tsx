import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, PieChart, ShieldCheck, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { updateSettings, updateBudgetAmount, t } = useApp();
  const [step, setStep] = useState(0);
  const [budgetVal, setBudgetVal] = useState('20000');

  if (!isOpen) return null;

  const screens = [
    {
      icon: Zap,
      color: '#3B82F6',
      title: t.onboarding.step1Title,
      subtitle: t.onboarding.step1Desc,
    },
    {
      icon: PieChart,
      color: '#8B5CF6',
      title: t.onboarding.step2Title,
      subtitle: t.onboarding.step2Desc,
    },
    {
      icon: ShieldCheck,
      color: '#10B981',
      title: t.onboarding.step3Title,
      subtitle: t.onboarding.step3Desc,
    },
  ];

  const handleFinish = async () => {
    const bNum = parseFloat(budgetVal) || 20000;
    await updateBudgetAmount(bNum);
    await updateSettings({
      currency: 'EGP',
      currencySymbol: 'ج.م',
      hasCompletedOnboarding: true,
    });
    onComplete();
  };

  const current = screens[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-5">
        {/* Step Indicator */}
        <div className="flex justify-center gap-1.5">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Hero Icon */}
        <div className="py-2 flex justify-center">
          <div
            style={{ backgroundColor: `${current.color}15`, color: current.color }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
          >
            <Icon size={32} />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {current.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-2">
            {current.subtitle}
          </p>
        </div>

        {/* Quick config on step 2 */}
        {step === 2 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-start text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                {t.onboarding.budget}
              </label>
              <input
                type="number"
                value={budgetVal}
                onChange={e => setBudgetVal(e.target.value)}
                placeholder="20000"
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-2 flex items-center justify-between gap-3">
          {step < 2 ? (
            <>
              <button
                type="button"
                onClick={handleFinish}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-2 cursor-pointer"
              >
                {t.onboarding.skip}
              </button>
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{t.onboarding.next}</span>
                <ArrowRight size={14} className="rtl:rotate-180" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Check size={16} />
              <span>{t.onboarding.start}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
