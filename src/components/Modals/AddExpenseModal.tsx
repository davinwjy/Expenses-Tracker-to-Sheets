import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, AlertCircle, ArrowDownRight, Receipt, Loader2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIdr, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../lib/formatters';

function getGmtPlus7DateString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const gmt7Date = new Date(utc + (3600000 * 7));
  return gmt7Date.toISOString().split('T')[0];
}

export const AddExpenseModal: React.FC = () => {
  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    transactionInitialType,
    accounts,
    transactions,
    addTransaction,
    editingTransaction,
    setEditingTransaction,
    updateTransaction,
    showNotification,
  } = useFinance();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState<string>(getGmtPlus7DateString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clean form every time modal opens or resets
  useEffect(() => {
    if (isAddExpenseOpen) {
      setIsSubmitting(false);
      if (editingTransaction) {
        const txType = editingTransaction.type === 'income' ? 'income' : 'expense';
        setType(txType);
        setAmount(editingTransaction.amount.toString());
        setAccountId(editingTransaction.accountId);
        const fallbackCat = txType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
        setCategory(editingTransaction.category || fallbackCat);
        setDate(editingTransaction.date);
        setNotes(editingTransaction.notes || '');
      } else {
        const initType = transactionInitialType || 'expense';
        setType(initType);
        setAmount('');
        setAccountId(accounts.length > 0 ? accounts[0].id : '');
        setCategory(initType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
        setDate(getGmtPlus7DateString());
        setNotes('');
      }
      setError('');
    }
  }, [isAddExpenseOpen, editingTransaction, accounts, transactionInitialType]);

  const resetForm = () => {
    setIsSubmitting(false);
    const initType = transactionInitialType || 'expense';
    setType(initType);
    setAmount('');
    setAccountId(accounts.length > 0 ? accounts[0].id : '');
    setCategory(initType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setDate(getGmtPlus7DateString());
    setNotes('');
    setError('');
  };

  const handleTypeChange = (newType: 'expense' | 'income') => {
    if (newType === type) return;
    setType(newType);
    if (newType === 'income') {
      // Switch category if current category is not in income categories
      if (!(INCOME_CATEGORIES as readonly string[]).includes(category)) {
        setCategory(INCOME_CATEGORIES[0]);
      }
    } else {
      // Switch category if current category is not in expense categories
      if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
        setCategory(EXPENSE_CATEGORIES[0]);
      }
    }
  };

  const handleClose = () => {
    resetForm();
    setEditingTransaction(null);
    setIsAddExpenseOpen(false);
  };

  const handleQuickAdd = (inc: number) => {
    const current = Number(amount) || 0;
    setAmount((current + inc).toString());
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  const availableBalance = React.useMemo(() => {
    if (!selectedAccount) return 0;
    if (selectedAccount.type === 'credit_card' || selectedAccount.type === 'paylater') {
      if (selectedAccount.creditLimit === undefined) return 0;
      let revertedDebt = selectedAccount.balance;
      if (
        editingTransaction &&
        editingTransaction.accountId === selectedAccount.id &&
        editingTransaction.type === 'expense'
      ) {
        revertedDebt = Math.max(0, revertedDebt - editingTransaction.amount);
      }
      return Math.max(0, selectedAccount.creditLimit - revertedDebt);
    }
    let revertedBal = selectedAccount.balance;
    if (
      editingTransaction &&
      editingTransaction.accountId === selectedAccount.id &&
      editingTransaction.type === 'expense'
    ) {
      revertedBal += editingTransaction.amount;
    }
    return revertedBal;
  }, [selectedAccount, editingTransaction]);

  const parsedNumAmount = Number(amount);
  const isInsufficientBalance = Boolean(
    type === 'expense' &&
    selectedAccount &&
    !isNaN(parsedNumAmount) &&
    parsedNumAmount > 0 &&
    parsedNumAmount > availableBalance
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setIsSubmitting(false);
      return;
    }

    if (!accountId) {
      setError('Please select a Bank or Cash account');
      setIsSubmitting(false);
      return;
    }

    if (type === 'expense' && selectedAccount) {
      if (parsedAmount > availableBalance) {
        if (selectedAccount.type === 'credit_card' || selectedAccount.type === 'paylater') {
          setError(
            `Credit limit insufficient (${formatIdr(availableBalance)}). Expense amount ${formatIdr(
              parsedAmount
            )} cannot be submitted.`
          );
        } else {
          setError(
            `Insufficient balance (${formatIdr(availableBalance)}). Expense amount ${formatIdr(
              parsedAmount
            )} cannot be submitted.`
          );
        }
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      } else {
        await addTransaction({
          type,
          amount: parsedAmount,
          accountId,
          category,
          date,
          notes,
        });
      }

      // Trigger sleek success popup notification
      const targetAcc = accounts.find((a) => a.id === accountId);
      const accName = targetAcc ? targetAcc.name : 'Account';
      showNotification({
        type: 'success',
        txType: type,
        title: editingTransaction
          ? (type === 'expense' ? 'Expense Updated Successfully' : 'Income Updated Successfully')
          : (type === 'expense' ? 'Expense Recorded Successfully' : 'Income Recorded Successfully'),
        message: notes?.trim() ? notes.trim() : undefined,
        amount: parsedAmount,
        category,
        accountName: accName,
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction');
      setIsSubmitting(false);
    }
  };

  if (!isAddExpenseOpen) return null;

  // Active categories for select dropdown
  const activeCategories: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryOptions = activeCategories.includes(category)
    ? [...activeCategories]
    : [category, ...activeCategories];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card (Bottom sheet on mobile, centered modal on desktop) */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1017] border-t sm:border border-slate-200 dark:border-[#1b212e] rounded-t sm:rounded shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#080a0f]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Command Strip Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${
                type === 'expense'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {type === 'expense' ? (
                <Receipt className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                {editingTransaction
                  ? editingTransaction.type === 'income'
                    ? 'EDIT INCOME LOG'
                    : 'EDIT EXPENSE LOG'
                  : type === 'expense'
                  ? 'RECORD CASH OUTFLOW'
                  : 'RECORD CASH INFLOW'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                {type === 'expense'
                  ? 'Immediate debit from selected account ledger'
                  : 'Immediate credit to selected account ledger'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              title="Reset fields"
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="expense-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              FLOW DIRECTION
            </div>
            <div className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-[#080a0f] rounded border border-slate-300 dark:border-[#1d2332] text-xs font-semibold">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTypeChange('expense')}
                className={`py-1.5 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Receipt className="w-3 h-3" />
                <span>EXPENSE (-)</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTypeChange('income')}
                className={`py-1.5 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  type === 'income'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <ArrowDownRight className="w-3 h-3" />
                <span>INCOME (+)</span>
              </button>
            </div>
          </div>

          {/* Amount in IDR */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
              {type === 'expense' ? 'OUTFLOW AMOUNT (IDR)' : 'INFLOW AMOUNT (IDR)'}{' '}
              <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                disabled={isSubmitting}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50,000"
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded pl-9 pr-3 py-2 text-sm font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums disabled:opacity-60 disabled:cursor-not-allowed"
                required
                autoFocus
              />
            </div>

            {/* Live Formatted IDR Preview */}
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-mono">
                <span className="text-slate-500 dark:text-zinc-500">FORMATTED VALUE:</span>
                <span className={`font-bold tabular-nums ${type === 'expense' ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatIdr(Number(amount))}
                </span>
              </div>
            )}

            {/* Insufficient balance warning under amount */}
            {isInsufficientBalance && (
              <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-mono">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                <span>
                  Amount exceeds available balance (short by{' '}
                  <strong className="text-rose-700 dark:text-rose-200 tabular-nums">
                    {formatIdr(parsedNumAmount - availableBalance)}
                  </strong>
                  )
                </span>
              </div>
            )}

            {/* Quick Increment Buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {[10000, 50000, 100000, 250000, 500000, 1000000, 5000000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickAdd(inc)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#080a0f] dark:hover:bg-[#161a25] active:bg-slate-300 dark:active:bg-[#1f2637] text-[10px] font-medium text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-[#1d2332] hover:border-slate-400 dark:hover:border-zinc-500 transition-colors cursor-pointer font-mono tabular-nums disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +{inc >= 1000000 ? `${inc / 1000000}M` : `${inc / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Source Account (Bank / Cash) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {type === 'expense'
                  ? 'SOURCE LEDGER (DEBIT)'
                  : 'DESTINATION LEDGER (CREDIT)'}{' '}
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              {selectedAccount && (
                <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                  {selectedAccount.type === 'credit_card' || selectedAccount.type === 'paylater'
                    ? 'AVAILABLE LIMIT: '
                    : 'BALANCE: '}
                  <strong
                    className={`tabular-nums ${
                      isInsufficientBalance ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatIdr(availableBalance)}
                  </strong>
                </span>
              )}
            </div>
            <select
              value={accountId}
              disabled={isSubmitting}
              onChange={(e) => setAccountId(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-[#080a0f] border rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed ${
                isInsufficientBalance
                  ? 'border-rose-500/60 focus:border-rose-500'
                  : 'border-slate-300 dark:border-[#1d2332] focus:border-emerald-500'
              }`}
              required
            >
              {accounts.length === 0 && <option value="">No accounts found - add one first</option>}
              {accounts.map((acc) => {
                const isCredit = acc.type === 'credit_card' || acc.type === 'paylater';
                const avail = isCredit ? Math.max(0, (acc.creditLimit || 0) - acc.balance) : acc.balance;
                return (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()}) — {isCredit ? `Available Limit: ${formatIdr(avail)} (Used: ${formatIdr(acc.balance)})` : `Balance: ${formatIdr(acc.balance)}`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Category - Specific to Expense or Income */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                CLASSIFICATION / CATEGORY <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  type === 'income'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                }`}
              >
                {type === 'income' ? 'INCOME TAXONOMY' : 'EXPENSE TAXONOMY'}
              </span>
            </div>
            <select
              value={category}
              disabled={isSubmitting}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                VALUE DATE
              </label>
              <input
                type="date"
                value={date}
                disabled={isSubmitting}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                MEMO / DESCRIPTOR
              </label>
              <input
                type="text"
                value={notes}
                disabled={isSubmitting}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  type === 'income'
                    ? 'e.g. Monthly salary, bonus...'
                    : 'e.g. Lunch with team, taxi...'
                }
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </form>

        {/* Command Strip Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            DISCARD
          </button>
          <button
            type="submit"
            form="expense-modal-form"
            disabled={isSubmitting || isInsufficientBalance}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all shadow-md select-none ${
              isSubmitting
                ? 'bg-slate-300 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-400 dark:border-zinc-700 cursor-not-allowed opacity-60 pointer-events-none'
                : isInsufficientBalance
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/40 cursor-not-allowed opacity-75'
                : type === 'expense'
                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white cursor-pointer hover:shadow-rose-600/20'
                : 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 cursor-pointer hover:shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {type === 'expense' ? 'SAVING EXPENSE...' : 'SAVING INCOME...'}
                </span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {isInsufficientBalance
                    ? 'INSUFFICIENT BALANCE'
                    : editingTransaction
                    ? 'SAVE CHANGES'
                    : type === 'expense'
                    ? 'SAVE EXPENSE'
                    : 'SAVE INCOME'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
