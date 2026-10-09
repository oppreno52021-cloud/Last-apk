import React from 'react';
import { 
  Banknote, 
  CreditCard, 
  Landmark, 
  Smartphone, 
  PiggyBank, 
  Wallet,
  ArrowLeftRight,
  Building2,
  Coins,
  Briefcase
} from 'lucide-react';
import { AccountType } from '../../types';

interface AccountIconProps {
  type?: AccountType | string;
  name?: string;
  color?: string;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export const AccountIcon: React.FC<AccountIconProps> = ({
  type = 'other',
  name,
  color,
  size = 18,
  className = '',
  showBackground = true,
}) => {
  const getIcon = () => {
    switch (name || type) {
      case 'cash':
      case 'Banknote':
        return <Banknote size={size} />;
      case 'bank':
      case 'Landmark':
        return <Landmark size={size} />;
      case 'building':
      case 'Building2':
        return <Building2 size={size} />;
      case 'credit_card':
      case 'debit_card':
      case 'card':
      case 'CreditCard':
        return <CreditCard size={size} />;
      case 'mobile_wallet':
      case 'Smartphone':
        return <Smartphone size={size} />;
      case 'savings':
      case 'PiggyBank':
        return <PiggyBank size={size} />;
      case 'coins':
      case 'Coins':
        return <Coins size={size} />;
      case 'business':
      case 'Briefcase':
        return <Briefcase size={size} />;
      case 'transfer':
      case 'instapay':
      case 'ArrowLeftRight':
        return <ArrowLeftRight size={size} />;
      case 'wallet':
      default:
        return <Wallet size={size} />;
    }
  };

  if (!showBackground) {
    return (
      <span
        style={color ? { color } : undefined}
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
      >
        {getIcon()}
      </span>
    );
  }

  const customStyle: React.CSSProperties = color
    ? { borderColor: color, color: color }
    : {};

  return (
    <div
      style={customStyle}
      className={`w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700/80 bg-transparent text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition-colors ${className}`}
    >
      {getIcon()}
    </div>
  );
};
