export function formatIdr(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp ' + rounded.toLocaleString('id-ID');
}

export function formatUsd(amount: number): string {
  const val = amount || 0;
  return '$' + val.toLocaleString('en-US', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(amount: number, currency: 'IDR' | 'USD' = 'IDR'): string {
  if (currency === 'USD') {
    return formatUsd(amount);
  }
  return formatIdr(amount);
}

export function getPrivacyClass(isPrivacyMode: boolean, extraClass: string = ''): string {
  return `${extraClass} ${isPrivacyMode ? 'privacy-blur' : ''}`.trim();
}

export function formatMasked(
  amount: number,
  currency: 'IDR' | 'USD' = 'IDR',
  _isPrivacy: boolean = false
): string {
  return formatCurrency(amount, currency);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const today = new Date();
      if (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      ) {
        return 'Today';
      }

      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear()
      ) {
        return 'Yesterday';
      }

      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Groceries',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Health & Fitness',
  'Education',
  'Housing & Rent',
  'Personal Care',
  'Family & Kids',
  'Debt & Loans',
  'Other Expense',
] as const;

export const INCOME_CATEGORIES = [
  'Salary / Wage',
  'Bonus & Allowance',
  'Freelance & Side Gig',
  'Selling Items',
  'Reimbursement',
  'Investment Return / Dividends',
  'Business Profit',
  'Rental & Passive Income',
  'Gift & Grants',
  'Cashback & Refunds',
  'Other Income',
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  // Expense Categories
  'Food & Dining': '#f97316', // orange
  'Transportation': '#3b82f6', // blue
  'Groceries': '#10b981', // emerald
  'Bills & Utilities': '#eab308', // yellow
  'Shopping': '#ec4899', // pink
  'Entertainment': '#a855f7', // purple
  'Health & Fitness': '#06b6d4', // cyan
  'Education': '#6366f1', // indigo
  'Housing & Rent': '#64748b', // slate
  'Personal Care': '#f43f5e', // rose
  'Family & Kids': '#fb923c', // amber-orange
  'Debt & Loans': '#ef4444', // red
  'Other Expense': '#94a3b8', // slate
  'Other': '#94a3b8',

  // Income Categories
  'Salary / Wage': '#10b981', // emerald
  'Salary / Gaji': '#10b981', // backward compatibility
  'Bonus & Allowance': '#059669', // dark emerald
  'Freelance & Side Gig': '#14b8a6', // teal
  'Selling Items': '#f59e0b', // amber
  'Selling Items / Jual Barang': '#f59e0b',
  'Reimbursement': '#06b6d4', // cyan
  'Investment Return / Dividends': '#0ea5e9', // sky
  'Investment Return / Dividen': '#0ea5e9',
  'Business Profit': '#3b82f6', // blue
  'Rental & Passive Income': '#8b5cf6', // purple
  'Gift & Grants': '#ec4899', // pink
  'Cashback & Refunds': '#84cc16', // lime
  'Other Income': '#34d399', // light green
};

export const INVESTMENT_CATEGORY_DETAILS: Record<
  string,
  { label: string; currency: 'IDR' | 'USD'; badgeColor: string; iconBg: string }
> = {
  'USD': {
    label: 'USD Holdings',
    currency: 'USD',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
  },
  'Bitcoin': {
    label: 'Bitcoin (Crypto)',
    currency: 'IDR',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconBg: 'bg-amber-500/20 text-amber-400',
  },
  'Saham': {
    label: 'Indonesian Stocks',
    currency: 'IDR',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  'RDPU': {
    label: 'Money Market Fund (RDPU)',
    currency: 'IDR',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    iconBg: 'bg-teal-500/20 text-teal-400',
  },
  'ETF USA': {
    label: 'US ETF (S&P 500 / Tech)',
    currency: 'USD',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    iconBg: 'bg-purple-500/20 text-purple-400',
  },
};
