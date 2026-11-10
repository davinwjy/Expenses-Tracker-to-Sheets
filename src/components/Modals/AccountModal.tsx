import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { AccountType } from '../../types';
import { formatIdr } from '../../lib/formatters';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#64748b', // slate
];

const CARD_NETWORKS = ['Visa', 'Mastercard', 'JCB', 'Amex', 'GPN', 'UnionPay'];

export const AccountModal: React.FC = () => {
  const {
    isAddAccountOpen,
    setIsAddAccountOpen,
    editingAccount,
    setEditingAccount,
    addAccount,
    updateAccount,
    deleteAccount,
  } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#3b82f6');
  
  // Credit card specific states
  const [creditLimit, setCreditLimit] = useState('');
  const [billingDate, setBillingDate] = useState('25');
  const [dueDate, setDueDate] = useState('10');
  const [cardNetwork, setCardNetwork] = useState('Visa');
  const [last4Digits, setLast4Digits] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isAddAccountOpen) {
      setIsSubmitting(false);
      if (editingAccount) {
        setName(editingAccount.name);
        setType(editingAccount.type);
        setBalance(editingAccount.balance.toString());
        setAccountNumber(editingAccount.accountNumber || '');
        setColor(editingAccount.color || '#3b82f6');
        setCreditLimit(editingAccount.creditLimit ? editingAccount.creditLimit.toString() : '');
        setBillingDate(editingAccount.billingDate ? editingAccount.billingDate.toString() : '25');
        setDueDate(editingAccount.dueDate ? editingAccount.dueDate.toString() : '10');
        setCardNetwork(editingAccount.cardNetwork || 'Visa');
        setLast4Digits(editingAccount.last4Digits || '');
      } else {
        resetFields();
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [isAddAccountOpen, editingAccount]);

  const resetFields = () => {
    setIsSubmitting(false);
    setName('');
    setType('bank');
    setBalance('0');
    setAccountNumber('');
    setColor('#3b82f6');
    setCreditLimit('15000000');
    setBillingDate('25');
    setDueDate('10');
    setCardNetwork('Visa');
    setLast4Digits('');
    setError('');
  };

  const handleClose = () => {
    resetFields();
    setEditingAccount(null);
    setIsAddAccountOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an account name');
      return;
    }

    const parsedBalance = Number(balance);
    if (isNaN(parsedBalance)) {
      setError('Please enter a valid numeric balance / debt');
      return;
    }

    let parsedLimit = undefined;
    if (type === 'credit_card' || type === 'paylater') {
      parsedLimit = Number(creditLimit);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        setError('Please enter a valid credit limit');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        type,
        balance: parsedBalance,
        accountNumber: accountNumber.trim() || undefined,
        color,
      };

      if (type === 'credit_card' || type === 'paylater') {
        payload.creditLimit = parsedLimit;
        payload.billingDate = Number(billingDate) || 25;
        payload.dueDate = Number(dueDate) || 10;
        payload.cardNetwork = cardNetwork;
        payload.last4Digits = last4Digits.trim() || undefined;
      }

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        await addAccount(payload);
      }

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAccount) return;
    setIsSubmitting(true);
    try {
      await deleteAccount(editingAccount.id);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account');
      setIsSubmitting(false);
    }
  };

  if (!isAddAccountOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-md bg-white dark:bg-[#0d1017] border-t sm:border border-slate-200 dark:border-[#1b212e] rounded-t sm:rounded shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#080a0f]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                {editingAccount ? 'EDIT ACCOUNT RECORD' : 'CREATE ACCOUNT RECORD'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                {editingAccount ? 'Update account parameters or balance' : 'Bank, E-Wallet, Cash or Credit Card'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetFields}
              title="Reset fields"
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form id="account-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Type Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
              ACCOUNT TYPE
            </label>
            <div className="grid grid-cols-4 p-0.5 bg-slate-100 dark:bg-[#080a0f] rounded border border-slate-300 dark:border-[#1d2332] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setType('bank')}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  type === 'bank' ? 'bg-white dark:bg-[#1b212e] text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-[#2a3449] font-bold shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                BANK
              </button>
              <button
                type="button"
                onClick={() => setType('credit_card')}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  type === 'credit_card' ? 'bg-white dark:bg-[#1b212e] text-amber-600 dark:text-amber-400 border border-slate-300 dark:border-[#2a3449] font-bold shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                CC
              </button>
              <button
                type="button"
                onClick={() => setType('paylater')}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  type === 'paylater' ? 'bg-white dark:bg-[#1b212e] text-purple-600 dark:text-purple-400 border border-slate-300 dark:border-[#2a3449] font-bold shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                PAYLATER
              </button>
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`py-1.5 rounded transition-all cursor-pointer ${
                  type === 'cash' ? 'bg-white dark:bg-[#1b212e] text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-[#2a3449] font-bold shadow-sm' : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                CASH
              </button>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
              {type === 'credit_card' || type === 'paylater' ? 'FACILITY / PROVIDER NAME' : 'ACCOUNT IDENTIFIER'} <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'credit_card' ? 'e.g. BCA Visa Platinum, Mandiri Card' : type === 'paylater' ? 'e.g. GoPayLater, ShopeePayLater, Kredivo' : 'e.g. BCA Main, Cash Wallet...'}
              className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Credit Card / PayLater Specific Fields */}
          {(type === 'credit_card' || type === 'paylater') && (
            <div className="space-y-3.5 p-3 rounded bg-slate-50 dark:bg-[#0b0e14] border border-slate-200 dark:border-[#1b212e]">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                    CREDIT LIMIT (IDR) <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="20000000"
                    className="w-full bg-white dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-amber-500 rounded px-3 py-2 text-xs font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums focus:outline-none"
                    required
                  />
                </div>
                {type === 'credit_card' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                      CARD NETWORK
                    </label>
                    <select
                      value={cardNetwork}
                      onChange={(e) => setCardNetwork(e.target.value)}
                      className="w-full bg-white dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
                    >
                      {CARD_NETWORKS.map((net) => (
                        <option key={net} value={net}>{net}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={`grid ${type === 'credit_card' ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                {type === 'credit_card' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                      LAST 4 DIGITS
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={last4Digits}
                      onChange={(e) => setLast4Digits(e.target.value)}
                      placeholder="4821"
                      className="w-full bg-white dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                    BILLING DATE
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                    DUE DATE
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-amber-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Balance / Current Debt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                {type === 'credit_card' || type === 'paylater'
                  ? 'USED CREDIT / CURRENT DEBT (IDR)'
                  : 'CURRENT BALANCE (IDR)'}{' '}
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              {(type === 'credit_card' || type === 'paylater') && (
                <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-500">
                  (Enter 0 if unused)
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                Rp
              </span>
              <input
                type="number"
                step="any"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded pl-9 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                required
              />
            </div>
            {balance && !isNaN(Number(balance)) && (
              <div className="mt-1.5 p-2 rounded bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] space-y-1 text-[11px] font-mono">
                {type === 'credit_card' || type === 'paylater' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-zinc-500">AVAILABLE CREDIT LIMIT:</span>
                      <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatIdr(Math.max(0, Number(creditLimit || 0) - Number(balance)))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-zinc-500">USED CREDIT (DEBT):</span>
                      <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        {formatIdr(Number(balance))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-zinc-500">FORMATTED VALUE:</span>
                    <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatIdr(Number(balance))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Number (Optional) */}
          {type !== 'credit_card' && type !== 'paylater' && type !== 'cash' && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
                ACCOUNT NUMBER / MAPPING (OPTIONAL)
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 521098231 or •••• 4821"
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-300 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
              />
            </div>
          )}

          {/* Color Tag */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
              COLOR ACCENT
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded border transition-transform cursor-pointer ${
                    color === c ? 'scale-110 border-slate-900 dark:border-white ring-2 ring-emerald-500/50' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </form>

        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-between gap-2">
          {editingAccount ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-2.5 py-1.5 rounded bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
                >
                  CONFIRM PURGE
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE</span>
              </button>
            )
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
            >
              DISCARD
            </button>
            <button
              type="submit"
              form="account-modal-form"
              disabled={isSubmitting}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'SAVING...' : editingAccount ? 'UPDATE' : 'COMMIT'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
