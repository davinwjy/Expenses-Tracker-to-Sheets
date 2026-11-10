import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  AlertCircle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatMasked, formatDate, CATEGORY_COLORS } from '../lib/formatters';
import { BudgetProgress } from '../types';

export const BudgetingView: React.FC = () => {
  const {
    budgets,
    transactions,
    isPrivacyMode,
    setIsBudgetModalOpen,
    setEditingBudget,
    setEditingTransaction,
    saveBudget,
    deleteBudget,
    getBudgetProgressForMonth,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    showNotification,
  } = useFinance();

  // Month navigation: default to current month YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterStatus, setFilterStatus] = useState<'all' | 'danger' | 'warning' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Month formatting helpers
  const monthDisplay = useMemo(() => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month, 1);
    setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleResetCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  // Compute budget telemetry
  const {
    items,
    unbudgetedItems,
    totalBudgeted,
    totalSpent,
    totalRemaining,
    overallPercent,
    isOverBudget,
    overBudgetCount,
  } = getBudgetProgressForMonth(selectedMonth);

  const warningCount = useMemo(() => items.filter((i) => i.status === 'warning').length, [items]);
  const safeCount = useMemo(() => items.filter((i) => i.status === 'safe').length, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterStatus, searchQuery]);

  // Get transactions for expanded category
  const getCategoryTransactions = (catName: string) => {
    return transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.category === catName &&
        tx.date &&
        tx.date.startsWith(selectedMonth)
    );
  };

  const handleEditBudget = (item: BudgetProgress) => {
    const found = budgets.find((b) => b.id === item.budgetId);
    if (found) {
      setEditingBudget(found);
    } else {
      setEditingBudget({
        id: '',
        userId: '',
        category: item.category,
        monthlyLimit: item.monthlyLimit,
        createdAt: '',
        updatedAt: '',
      });
    }
    setIsBudgetModalOpen(true);
  };

  const handleQuickAddUnbudgeted = (categoryName: string, defaultLimit: number = 2000000) => {
    saveBudget(categoryName, defaultLimit, selectedMonth);
    showNotification({
      type: 'success',
      title: 'Budget Limit Set',
      message: `${categoryName}: limit set to ${formatIdr(defaultLimit)}/month`,
      amount: defaultLimit,
      category: categoryName,
    });
  };

  const handleDeleteBudget = async (id: string, categoryName: string) => {
    if (!window.confirm(`Delete budget limit for ${categoryName}?`)) return;
    try {
      await deleteBudget(id);
      showNotification({
        type: 'info',
        title: 'Budget Limit Removed',
        message: `Limit for ${categoryName} has been removed`,
      });
    } catch (err: any) {
      console.error('Failed to delete budget:', err);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-12">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
            Budgeting & Spending Limits
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Set monthly category spending ceilings and track remaining runway in real time.
          </p>
        </div>

        {/* Month Navigation & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-[#131722] border border-slate-200 dark:border-[#21293a] rounded-lg p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2030] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-0.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 min-w-[130px] text-center">
              {monthDisplay}
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a2030] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              onClick={handleResetCurrentMonth}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-600 dark:text-zinc-300 text-xs font-medium border border-slate-200 dark:border-[#21293a] cursor-pointer transition-colors shadow-sm"
            >
              Current Month
            </button>
          )}

          <button
            onClick={() => {
              setEditingBudget(null);
              setIsBudgetModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Set Limit</span>
          </button>
        </div>
      </div>

      {/* OVERVIEW CARD */}
      <div className="bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* 2. OVERALL MACRO CONSUMPTION BAR */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#1b212e] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Spent This Month:</span>
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold tabular-nums">
                {formatMasked(totalSpent, 'IDR', isPrivacyMode)}
              </strong>
              <span className="text-slate-300 dark:text-zinc-600">/</span>
              <span className="text-slate-500 dark:text-zinc-400 tabular-nums">
                {formatMasked(totalBudgeted, 'IDR', isPrivacyMode)} limit
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isOverBudget
                    ? 'text-rose-600 dark:text-rose-400'
                    : overallPercent >= 75
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {overallPercent.toFixed(1)}% Used
              </span>
            </div>
          </div>

          {/* Master visual indicator bar */}
          <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#141a27] border border-slate-200/80 dark:border-[#212a40] overflow-hidden">
            <div
              style={{ width: `${Math.min(100, overallPercent)}%` }}
              className={`h-full transition-all duration-300 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : overallPercent >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>Rp 0</span>
            <span
              className={`font-medium tabular-nums ${
                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              } ${isPrivacyMode ? 'privacy-blur' : ''}`}
            >
              {isOverBudget
                ? `Over budget by ${formatIdr(totalSpent - totalBudgeted)}`
                : `${formatIdr(totalRemaining)} remaining buffer`}
            </span>
            <span>Total Limit: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(totalBudgeted, 'IDR', isPrivacyMode)}</span></span>
          </div>
        </div>

        {/* Macro Telemetry Cards */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-[#161d2b]">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230]">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium block">Active Categories</span>
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-200 mt-0.5">{items.length} Budgeted</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230]">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium block">Monthly Ceiling</span>
            <p className={`text-sm font-semibold text-slate-900 dark:text-zinc-200 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalBudgeted, 'IDR', isPrivacyMode)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230]">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium block">Total Spent</span>
            <p className={`text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(totalSpent, 'IDR', isPrivacyMode)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#1b2230]">
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium block">Remaining Buffer</span>
            <p
              className={`text-sm font-semibold tabular-nums mt-0.5 ${
                isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              } ${isPrivacyMode ? 'privacy-blur' : ''}`}
            >
              {isOverBudget
                ? `-${formatIdr(totalSpent - totalBudgeted)}`
                : formatMasked(totalRemaining, 'IDR', isPrivacyMode)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH STRIP */}
      <div className="p-3 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { id: 'all', label: `All (${items.length})` },
              { id: 'safe', label: `On Track (${safeCount})` },
              { id: 'warning', label: `Warning (${warningCount})` },
              { id: 'danger', label: `Over Limit (${overBudgetCount})` },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                filterStatus === s.id
                  ? 'bg-slate-900 text-white dark:bg-emerald-500/15 dark:text-emerald-400 border border-transparent dark:border-emerald-500/30'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#161c29]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. CATEGORY BUDGET CARDS GRID */}
      {filteredItems.length === 0 ? (
        <div className="p-10 text-center rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3 shadow-sm">
          <Target className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
            {items.length === 0
              ? 'No Category Budgets Configured'
              : 'No Budgets Match the Current Filter'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            {items.length === 0
              ? 'Set monthly spending limits for categories to monitor runway consumption and receive over-limit alerts.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => {
                setEditingBudget(null);
                setIsBudgetModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition-colors cursor-pointer"
            >
              Set First Budget Limit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const isExpanded = expandedCategory === item.category;
            const catTransactions = isExpanded ? getCategoryTransactions(item.category) : [];

            return (
              <div
                key={item.category}
                className={`p-5 rounded-xl bg-white dark:bg-[#0d1017] border transition-all space-y-3.5 shadow-sm ${
                  item.status === 'danger'
                    ? 'border-rose-300 dark:border-rose-500/40'
                    : item.status === 'warning'
                    ? 'border-amber-300 dark:border-amber-500/40'
                    : 'border-slate-200 dark:border-[#1b212e] hover:border-slate-300 dark:hover:border-[#273248]'
                }`}
              >
                {/* Card Header: Category & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[item.category] ||
                          (item.status === 'danger'
                            ? '#f43f5e'
                            : item.status === 'warning'
                            ? '#f59e0b'
                            : '#10b981'),
                      }}
                    />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                        {item.category}
                      </h4>
                      <span className="text-xs text-slate-400 dark:text-zinc-500">
                        {item.transactionCount} transactions this month
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        item.status === 'danger'
                          ? 'text-rose-600 dark:text-rose-400'
                          : item.status === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.percentUsed.toFixed(0)}% used
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#151a26] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                      className={`h-full transition-all duration-300 ${
                        item.status === 'danger'
                          ? 'bg-rose-500'
                          : item.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`text-slate-700 dark:text-zinc-300 font-medium tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(item.actualSpent, 'IDR', isPrivacyMode)}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-500 tabular-nums">
                      of <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(item.monthlyLimit, 'IDR', isPrivacyMode)}</span> limit
                    </span>
                  </div>
                </div>

                {/* Runway Buffer Line */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#161c29] flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-zinc-400">
                    {item.remaining < 0 ? 'Over limit by:' : 'Remaining:'}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      item.remaining < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    } ${isPrivacyMode ? 'privacy-blur' : ''}`}
                  >
                    {item.remaining < 0
                      ? formatIdr(Math.abs(item.remaining))
                      : formatIdr(item.remaining)}
                  </span>
                </div>

                {/* Actions & Drilldown Trigger */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditBudget(item)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 bg-slate-100 dark:bg-[#141a27] hover:bg-slate-200 dark:hover:bg-[#1a2336] transition-colors cursor-pointer"
                    >
                      Edit Limit
                    </button>

                    <button
                      onClick={() => {
                        setEditingTransaction(null);
                        setTransactionInitialType('expense');
                        setIsAddExpenseOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    >
                      + Expense
                    </button>

                    {item.budgetId && (
                      <button
                        onClick={() => item.budgetId && handleDeleteBudget(item.budgetId, item.category)}
                        className="px-2 py-1 rounded-md text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete budget"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : item.category)
                    }
                    className="flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Transactions' : 'View Transactions'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expanded Transactions Drilldown */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#182030] space-y-2 animate-in fade-in">
                    <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      {item.category} Transactions ({monthDisplay}):
                    </div>
                    {catTransactions.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-zinc-500 italic py-1">
                        No transactions recorded for this category in {monthDisplay}.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {catTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/60 dark:border-[#1b2230] text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">
                                {formatDate(tx.date)}
                              </span>
                              <span className="truncate text-slate-800 dark:text-zinc-300 font-medium">
                                {tx.notes || tx.category}
                              </span>
                            </div>
                            <span className="font-semibold text-rose-600 dark:text-rose-400 shrink-0 ml-2 tabular-nums">
                              -{formatIdr(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. UNBUDGETED SPENDING CATEGORIES SECTION */}
      {unbudgetedItems.length > 0 && (
        <div className="mt-6 p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">
                  Unbudgeted Spending Detected ({unbudgetedItems.length} Categories)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  These categories have outflow in {monthDisplay} but no spending limit assigned yet.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {unbudgetedItems.map((unb) => (
              <div
                key={unb.category}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#090c12] border border-slate-200/70 dark:border-[#192233] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate">{unb.category}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Spent: <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">{formatIdr(unb.actualSpent)}</span> ({unb.transactionCount} tx)
                  </p>
                </div>
                <button
                  onClick={() => handleQuickAddUnbudgeted(unb.category, Math.max(1000000, Math.ceil(unb.actualSpent * 1.25 / 100000) * 100000))}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-100 dark:hover:bg-[#1a2233] border border-slate-200 dark:border-[#222e44] text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                >
                  Set Limit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
