import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Trash2, Sliders, Target, Calendar } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { EXPENSE_CATEGORIES, formatIdr } from '../../lib/formatters';

const PRESET_AMOUNTS = [
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
  { label: '5M', value: 5000000 },
  { label: '10M', value: 10000000 },
];

export const BudgetModal: React.FC = () => {
  const {
    isBudgetModalOpen,
    setIsBudgetModalOpen,
    editingBudget,
    setEditingBudget,
    saveBudget,
    deleteBudget,
    transactions,
    showNotification,
  } = useFinance();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [limit, setLimit] = useState<string>('');
  const [scope, setScope] = useState<'recurring' | 'specific'>('recurring');
  const [specificMonth, setSpecificMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Collect all unique categories from transactions to offer as choices
  const availableCategories = React.useMemo(() => {
    const set = new Set<string>(EXPENSE_CATEGORIES);
    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.category && tx.category.trim()) {
        set.add(tx.category.trim());
      }
    });
    return Array.from(set);
  }, [transactions]);

  useEffect(() => {
    if (isBudgetModalOpen) {
      setError('');
      setIsSubmitting(false);
      setConfirmDelete(false);

      if (editingBudget) {
        if (availableCategories.includes(editingBudget.category)) {
          setCategory(editingBudget.category);
          setIsCustomCategory(false);
          setCustomCategory('');
        } else {
          setIsCustomCategory(true);
          setCustomCategory(editingBudget.category);
        }
        setLimit(editingBudget.monthlyLimit ? String(editingBudget.monthlyLimit) : '');
        if (editingBudget.month) {
          setScope('specific');
          setSpecificMonth(editingBudget.month);
        } else {
          setScope('recurring');
        }
      } else {
        setCategory(availableCategories[0] || EXPENSE_CATEGORIES[0]);
        setIsCustomCategory(false);
        setCustomCategory('');
        setLimit('2000000');
        setScope('recurring');
      }
    }
  }, [isBudgetModalOpen, editingBudget, availableCategories]);

  if (!isBudgetModalOpen) return null;

  const handleClose = () => {
    setIsBudgetModalOpen(false);
    setEditingBudget(null);
    setConfirmDelete(false);
  };

  const handlePresetClick = (amount: number) => {
    setLimit(String(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    const targetCategory = isCustomCategory ? customCategory.trim() : category.trim();
    if (!targetCategory) {
      setError('Please select or enter a category name');
      return;
    }

    const parsedLimit = parseFloat(limit.replace(/[^0-9.]/g, ''));
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      setError('Please enter a valid monthly limit greater than Rp 0');
      return;
    }

    const targetMonth = scope === 'specific' ? specificMonth : undefined;

    setIsSubmitting(true);
    try {
      await saveBudget(
        targetCategory,
        parsedLimit,
        targetMonth,
        editingBudget?.id
      );

      showNotification({
        type: 'success',
        title: editingBudget ? 'Budget Limit Updated' : 'Budget Limit Saved',
        message: `${targetCategory}: monthly target ${formatIdr(parsedLimit)}`,
        amount: parsedLimit,
        category: targetCategory,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save budget limit');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBudget?.id) return;
    setIsSubmitting(true);
    try {
      await deleteBudget(editingBudget.id);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLimitNumber = parseFloat(limit.replace(/[^0-9.]/g, '')) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1d2436] rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900 dark:text-zinc-100 font-mono">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#1b2234] flex items-center justify-between bg-slate-50 dark:bg-[#0f131e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-900 dark:text-zinc-100 font-mono">
                {editingBudget ? 'EDIT CATEGORY BUDGET' : 'SET CATEGORY BUDGET'}
              </h3>
              <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                Monthly spending ceiling & real-time tracker
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded flex items-center gap-2.5 text-xs text-rose-300 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Expense Category</span>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
              >
                {isCustomCategory ? 'Choose from list' : '+ Custom category'}
              </button>
            </label>

            {isCustomCategory ? (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Gym & Supplements, Cloud Subscriptions"
                className="w-full bg-[#111622] border border-[#212a40] focus:border-emerald-500 focus:outline-none rounded px-3 py-2 text-xs font-medium text-zinc-100 transition-all placeholder:text-zinc-600 font-mono"
                required
                autoFocus
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#111622] border border-[#212a40] focus:border-emerald-500 focus:outline-none rounded px-3 py-2 text-xs font-medium text-zinc-100 transition-all cursor-pointer font-mono"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0f131e] text-zinc-200">
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Monthly Limit Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Monthly Spending Limit (IDR)
              </label>
              {currentLimitNumber > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatIdr(currentLimitNumber)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono font-bold text-zinc-500">
                Rp
              </span>
              <input
                type="text"
                value={limit}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setLimit(val);
                }}
                placeholder="2000000"
                className="w-full bg-[#111622] border border-[#212a40] focus:border-emerald-500 focus:outline-none rounded pl-10 pr-3 py-2 text-sm font-bold text-zinc-100 transition-all font-mono placeholder:text-zinc-600"
                required
              />
            </div>

            {/* Quick preset amount chips */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-500 mr-1">PRESETS:</span>
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetClick(p.value)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                    currentLimitNumber === p.value
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-[#141a27] border-[#222b3e] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Scope (Recurring vs Month-Specific) */}
          <div className="space-y-2 pt-1 border-t border-[#1b2234]">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Budget Period Scope</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('recurring')}
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  scope === 'recurring'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#111622] border-[#20293d] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                  <span>Recurring Every Month</span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  Applies continuously each month
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('specific')}
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                  scope === 'specific'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-[#111622] border-[#20293d] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                  <span>Specific Month Only</span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  One-time monthly target
                </p>
              </button>
            </div>

            {scope === 'specific' && (
              <div className="pt-1.5">
                <input
                  type="month"
                  value={specificMonth}
                  onChange={(e) => setSpecificMonth(e.target.value)}
                  className="w-full bg-[#111622] border border-[#212a40] focus:border-emerald-500 focus:outline-none rounded px-3 py-1.5 text-xs font-mono text-zinc-200"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-[#1b2234] flex items-center justify-between gap-3">
            {editingBudget ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-2.5 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold transition-all cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1.5 rounded text-zinc-400 hover:text-white font-mono text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-xs transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isSubmitting ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
