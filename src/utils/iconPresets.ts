export interface StyledIconChoice {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
}

// 1. Preset icons specifically for Categories (Food, Transport, Bills, Health, etc.) - NO bank/wallet account icons
export const PRESET_CATEGORY_ICONS: StyledIconChoice[] = [
  { id: 'food', nameAr: 'طعام ومأكولات', nameEn: 'Food & Meals', icon: 'Utensils', color: '#EF4444' },
  { id: 'groceries', nameAr: 'سوبرماركت وبقالة', nameEn: 'Groceries', icon: 'ShoppingCart', color: '#F97316' },
  { id: 'transport', nameAr: 'مواصلات وبنزين', nameEn: 'Transport', icon: 'Car', color: '#0EA5E9' },
  { id: 'bills', nameAr: 'فواتير وكهرباء', nameEn: 'Bills & Utilities', icon: 'Zap', color: '#F59E0B' },
  { id: 'coffee', nameAr: 'قهوة وكافيه', nameEn: 'Coffee & Drinks', icon: 'Coffee', color: '#B45309' },
  { id: 'health', nameAr: 'صحة وصيدلية', nameEn: 'Health & Pharmacy', icon: 'HeartPulse', color: '#EC4899' },
  { id: 'shopping', nameAr: 'تسوق وملابس', nameEn: 'Shopping & Clothes', icon: 'ShoppingBag', color: '#A855F7' },
  { id: 'entertainment', nameAr: 'ترفيه وألعاب', nameEn: 'Entertainment', icon: 'Gamepad2', color: '#8B5CF6' },
  { id: 'home', nameAr: 'سكن ومستلزمات', nameEn: 'Home & Housing', icon: 'Home', color: '#0D9488' },
  { id: 'education', nameAr: 'تعليم ودراسة', nameEn: 'Education', icon: 'GraduationCap', color: '#4F46E5' },
  { id: 'gym', nameAr: 'رياضة وجيم', nameEn: 'Sports & Gym', icon: 'Dumbbell', color: '#06B6D4' },
  { id: 'travel', nameAr: 'سفر ورحلات', nameEn: 'Travel & Trips', icon: 'Plane', color: '#3B82F6' },
  { id: 'salary', nameAr: 'راتب ودخل عمل', nameEn: 'Salary & Work', icon: 'Briefcase', color: '#15803D' },
  { id: 'gift', nameAr: 'هدايا ومكافآت', nameEn: 'Gifts & Rewards', icon: 'Gift', color: '#D946EF' },
  { id: 'electronics', nameAr: 'إلكترونيات وأجهزة', nameEn: 'Electronics', icon: 'Laptop', color: '#6366F1' },
  { id: 'general', nameAr: 'عام ومصروفات أخرى', nameEn: 'General / Other', icon: 'Tag', color: '#64748B' },
];

// 2. Preset icons specifically for Accounts / Wallets (Cash, Banks, Cards, Mobile Wallets, Savings)
export const PRESET_ACCOUNT_ICONS: StyledIconChoice[] = [
  { id: 'cash', nameAr: 'كاش ونقد', nameEn: 'Cash & Notes', icon: 'Banknote', color: '#10B981' },
  { id: 'wallet', nameAr: 'محفظة', nameEn: 'Wallet', icon: 'Wallet', color: '#475569' },
  { id: 'bank_account', nameAr: 'حساب بنكي', nameEn: 'Bank Account', icon: 'Landmark', color: '#1E3A8A' },
  { id: 'building', nameAr: 'مؤسسة / فرع بنك', nameEn: 'Bank Branch', icon: 'Building2', color: '#0F766E' },
  { id: 'credit_card', nameAr: 'بطاقة ائتمان', nameEn: 'Credit Card', icon: 'CreditCard', color: '#2563EB' },
  { id: 'mobile_wallet', nameAr: 'محفظة هاتف', nameEn: 'Mobile Wallet', icon: 'Smartphone', color: '#EA580C' },
  { id: 'savings', nameAr: 'حصالة وادخار', nameEn: 'Savings Box', icon: 'PiggyBank', color: '#059669' },
  { id: 'coins', nameAr: 'عملات وفكة', nameEn: 'Coins', icon: 'Coins', color: '#D97706' },
  { id: 'instapay', nameAr: 'تحويل سريع', nameEn: 'Transfer', icon: 'ArrowLeftRight', color: '#7C3AED' },
  { id: 'business', nameAr: 'حساب عمل / تجاري', nameEn: 'Business Account', icon: 'Briefcase', color: '#334155' },
];

// Backward compatibility
export const PRESET_STYLED_ICONS = PRESET_CATEGORY_ICONS;
