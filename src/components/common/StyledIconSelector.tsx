import React from 'react';
import { PRESET_CATEGORY_ICONS, PRESET_ACCOUNT_ICONS } from '../../utils/iconPresets';
import { 
  Check,
  Banknote,
  CreditCard,
  Landmark,
  Building2,
  Smartphone,
  PiggyBank,
  Coins,
  Wallet,
  ArrowLeftRight,
  Briefcase,
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  Coffee,
  HeartPulse,
  ShoppingBag,
  Gamepad2,
  Home,
  GraduationCap,
  Dumbbell,
  Plane,
  Gift,
  Laptop,
  Tag
} from 'lucide-react';

interface StyledIconSelectorProps {
  selectedIcon: string;
  selectedColor?: string;
  onSelect: (icon: string, color: string) => void;
  language?: string;
  targetType?: 'category' | 'account';
}

function renderItemIcon(iconName: string, size = 18) {
  switch (iconName) {
    // Accounts
    case 'Banknote': return <Banknote size={size} />;
    case 'Wallet': return <Wallet size={size} />;
    case 'Landmark': return <Landmark size={size} />;
    case 'Building2': return <Building2 size={size} />;
    case 'CreditCard': return <CreditCard size={size} />;
    case 'Smartphone': return <Smartphone size={size} />;
    case 'PiggyBank': return <PiggyBank size={size} />;
    case 'Coins': return <Coins size={size} />;
    case 'ArrowLeftRight': return <ArrowLeftRight size={size} />;
    // Categories & Common
    case 'Briefcase': return <Briefcase size={size} />;
    case 'Utensils': return <Utensils size={size} />;
    case 'ShoppingCart': return <ShoppingCart size={size} />;
    case 'Car': return <Car size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Coffee': return <Coffee size={size} />;
    case 'HeartPulse': return <HeartPulse size={size} />;
    case 'ShoppingBag': return <ShoppingBag size={size} />;
    case 'Gamepad2': return <Gamepad2 size={size} />;
    case 'Home': return <Home size={size} />;
    case 'GraduationCap': return <GraduationCap size={size} />;
    case 'Dumbbell': return <Dumbbell size={size} />;
    case 'Plane': return <Plane size={size} />;
    case 'Gift': return <Gift size={size} />;
    case 'Laptop': return <Laptop size={size} />;
    case 'Tag':
    default:
      return <Tag size={size} />;
  }
}

export const StyledIconSelector: React.FC<StyledIconSelectorProps> = ({
  selectedIcon,
  onSelect,
  language = 'ar',
  targetType = 'category',
}) => {
  const list = targetType === 'account' ? PRESET_ACCOUNT_ICONS : PRESET_CATEGORY_ICONS;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
        {targetType === 'account'
          ? (language === 'ar' ? 'أيقونة المحفظة:' : 'Wallet Icon:')
          : (language === 'ar' ? 'أيقونة التصنيف:' : 'Category Icon:')
        }
      </label>

      {/* Clean circular icons grid - single border, no nested wrappers */}
      <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
        {list.map((item) => {
          const isSelected = selectedIcon === item.icon || selectedIcon === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.icon, item.color || '#64748B')}
              title={language === 'ar' ? item.nameAr : item.nameEn}
              aria-label={language === 'ar' ? item.nameAr : item.nameEn}
              className={`w-10 h-10 rounded-full border flex items-center justify-center bg-transparent transition-all cursor-pointer relative shrink-0 ${
                isSelected
                  ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/15 dark:ring-white/20 text-slate-900 dark:text-white font-bold scale-105 z-10'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {renderItemIcon(item.icon, 18)}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
