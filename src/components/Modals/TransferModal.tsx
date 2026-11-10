import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ArrowRightLeft,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Plus,
  Layers,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatIdr, formatUsd } from '../../lib/formatters';
import { InvestmentCategory } from '../../types';

const DEFAULT_CATEGORY_OPTIONS: { id: InvestmentCategory; label: string; badge: string; isUsd: boolean }[] = [
  { id: 'Saham', label: 'Indonesian Stocks', badge: 'IDR', isUsd: false },
  { id: 'ETF USA', label: 'US Stocks & ETFs', badge: 'USD ($)', isUsd: true },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', badge: 'IDR', isUsd: false },
  { id: 'RDPU', label: 'Money Market (RDPU)', badge: 'IDR', isUsd: false },
  { id: 'USD', label: 'USD Cash Buffer', badge: 'USD ($)', isUsd: true },
];

const PLATFORM_SUGGESTIONS = [
  'Stockbit',
  'Bibit',
  'Gotrade',
  'Ajaib',
  'Tokocrypto',
  'Indodax',
  'Interactive Brokers',
  'BCA Sekuritas',
];

export const TransferModal: React.FC = () => {
  const {
    isTransferOpen,
    setIsTransferOpen,
    transferInitialMode,
    accounts,
    investments,
    holdingTypes,
    setIsHoldingTypesModalOpen,
    usdIdrRate,
    transferFunds,
    showNotification,
  } = useFinance();

  const [mode, setMode] = useState<'account_to_account' | 'bank_to_investment'>('bank_to_investment');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [toInvestmentId, setToInvestmentId] = useState<string>('');

  // Target investment choice: 'existing' or 'new'
  const [targetType, setTargetType] = useState<'existing' | 'new'>('existing');

  // New investment fields (No currency selection needed - inferred by asset class)
  const [newInvName, setNewInvName] = useState<string>('');
  const [newInvCategory, setNewInvCategory] = useState<InvestmentCategory>('Saham');
  const [newInvPlatform, setNewInvPlatform] = useState<string>('');
  const [newInvUnits, setNewInvUnits] = useState<string>('');

  // Amount & Editable Conversion
  const [amountIdr, setAmountIdr] = useState<string>('');
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>(usdIdrRate.toString());
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isTransferOpen) {
      setIsSubmitting(false);
      setMode(transferInitialMode || 'bank_to_investment');
      resetFields();
    }
  }, [isTransferOpen, transferInitialMode, accounts, investments, usdIdrRate]);

  const resetFields = () => {
    setIsSubmitting(false);
    setFromAccountId(accounts.length > 0 ? accounts[0].id : '');
    if (accounts.length > 1) {
      setToAccountId(accounts[1].id);
    } else {
      setToAccountId('');
    }

    const firstInv = investments.length > 0 ? investments[0] : null;
    setToInvestmentId(firstInv ? firstInv.id : '');
    setTargetType(investments.length === 0 ? 'new' : 'existing');
    setNewInvName('');
    setNewInvCategory('Saham');
    setNewInvPlatform('');
    setNewInvUnits('');
    setAmountIdr('');
    setAmountUsd('');

    const initialRate = firstInv?.customExchangeRate || usdIdrRate;
    setExchangeRate(initialRate.toString());
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetFields();
    setIsTransferOpen(false);
  };

  const selectedSourceAccount = accounts.find((a) => a.id === fromAccountId);
  const selectedDestAccount = accounts.find((a) => a.id === toAccountId);
  const selectedInvestment = investments.find((i) => i.id === toInvestmentId);

  const numericAmount = Number(amountIdr) || 0;
  const numericRate = Number(exchangeRate) || selectedInvestment?.customExchangeRate || usdIdrRate;

  const selectedNewHoldingType = holdingTypes.find((h) => h.id === newInvCategory);

  const categoryOptions =
    holdingTypes && holdingTypes.length > 0
      ? holdingTypes.map((h) => ({
          id: h.id,
          label: h.label,
          badge: h.defaultCurrency === 'USD' ? 'USD ($)' : 'IDR',
          isUsd: h.defaultCurrency === 'USD',
        }))
      : DEFAULT_CATEGORY_OPTIONS;

  // Determine if target asset operates in USD
  const isUsdTarget =
    mode === 'bank_to_investment' &&
    (targetType === 'existing'
      ? selectedInvestment?.currency === 'USD' || selectedInvestment?.category === 'ETF USA' || selectedInvestment?.category === 'USD'
      : selectedNewHoldingType?.defaultCurrency === 'USD' || newInvCategory === 'ETF USA' || newInvCategory === 'USD');

  // Bidirectional amount handlers: user can edit IDR, USD amount, or Rate
  const handleAmountIdrChange = (val: string) => {
    setAmountIdr(val);
    const numIdr = Number(val);
    if (!isNaN(numIdr) && numIdr > 0) {
      const rate = Number(exchangeRate) || selectedInvestment?.customExchangeRate || usdIdrRate;
      if (rate > 0) {
        setAmountUsd((numIdr / rate).toFixed(2));
      }
    } else {
      setAmountUsd('');
    }
  };

  const handleAmountUsdChange = (val: string) => {
    setAmountUsd(val);
    const numUsd = Number(val);
    const numIdr = Number(amountIdr);
    if (!isNaN(numUsd) && numUsd > 0 && !isNaN(numIdr) && numIdr > 0) {
      // Calculate effective exchange rate from broker (IDR / USD)
      const calculatedRate = (numIdr / numUsd).toFixed(2);
      setExchangeRate(calculatedRate);
    }
  };

  const handleExchangeRateChange = (val: string) => {
    setExchangeRate(val);
    const numRate = Number(val);
    const numIdr = Number(amountIdr);
    if (!isNaN(numRate) && numRate > 0 && !isNaN(numIdr) && numIdr > 0) {
      setAmountUsd((numIdr / numRate).toFixed(2));
    }
  };

  const handleResetToGoogleRate = () => {
    setExchangeRate(usdIdrRate.toString());
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && usdIdrRate > 0) {
      setAmountUsd((numIdr / usdIdrRate).toFixed(2));
    }
  };

  const handleSelectInvestment = (invId: string) => {
    setToInvestmentId(invId);
    const inv = investments.find((i) => i.id === invId);
    const rate = inv?.customExchangeRate || usdIdrRate;
    setExchangeRate(rate.toString());
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && rate > 0) {
      setAmountUsd((numIdr / rate).toFixed(2));
    }
  };

  const handleSelectCategory = (cat: InvestmentCategory) => {
    setNewInvCategory(cat);
    const rate = Number(exchangeRate) || usdIdrRate;
    const numIdr = Number(amountIdr);
    if (!isNaN(numIdr) && numIdr > 0 && rate > 0) {
      setAmountUsd((numIdr / rate).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromAccountId) {
      setError('Select source account (Bank or Cash)');
      return;
    }

    if (numericAmount <= 0) {
      setError('Enter transfer amount in Rupiah');
      return;
    }

    if (mode === 'account_to_account') {
      if (!toAccountId) {
        setError('Select destination account');
        return;
      }
      if (fromAccountId === toAccountId) {
        setError('Source and destination accounts cannot be the same');
        return;
      }
    } else {
      if (targetType === 'existing') {
        if (!toInvestmentId) {
          setError('Select target investment asset or create a new one');
          return;
        }
      } else {
        if (!newInvName.trim()) {
          setError('Enter new investment asset name (e.g. BBCA, S&P 500 VOO, Bitcoin)');
          return;
        }
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const numericUsd = isUsdTarget && amountUsd && !isNaN(Number(amountUsd)) ? Number(amountUsd) : undefined;
      const effectiveRate = isUsdTarget && numericRate > 0 ? numericRate : undefined;

      await transferFunds({
        type: mode,
        fromAccountId,
        toAccountId: mode === 'account_to_account' ? toAccountId : undefined,
        toInvestmentId: mode === 'bank_to_investment' && targetType === 'existing' ? toInvestmentId : undefined,
        newInvestment:
          mode === 'bank_to_investment' && targetType === 'new'
            ? {
                name: newInvName.trim(),
                category: newInvCategory,
                currency: selectedNewHoldingType?.defaultCurrency || ((newInvCategory === 'ETF USA' || newInvCategory === 'USD') ? 'USD' : 'IDR'),
                platform: newInvPlatform.trim() || undefined,
                units: newInvUnits && !isNaN(Number(newInvUnits)) ? Number(newInvUnits) : undefined,
                notes: notes.trim() || undefined,
              }
            : undefined,
        amountIdr: numericAmount,
        amountUsd: numericUsd,
        exchangeRate: effectiveRate,
        date,
        notes: notes.trim() || undefined,
      });

      const fromAcc = accounts.find((a) => a.id === fromAccountId);
      const toAcc = accounts.find((a) => a.id === toAccountId);
      const toInv = investments.find((i) => i.id === toInvestmentId);
      const targetLabel = mode === 'account_to_account'
        ? (toAcc?.name || 'Destination Account')
        : (targetType === 'new' ? newInvName.trim() : (toInv?.name || 'Investment Portfolio'));

      showNotification({
        type: 'success',
        txType: 'transfer',
        title: mode === 'account_to_account' ? 'Inter-Account Transfer Successful' : 'Investment Top-Up Successful',
        message: `${fromAcc?.name || 'Account'} ➔ ${targetLabel}`,
        amount: numericAmount,
        category: mode === 'account_to_account' ? 'Cash Transfer' : newInvCategory,
        accountName: fromAcc?.name,
        date,
      });

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete transfer');
      setIsSubmitting(false);
    }
  };

  if (!isTransferOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
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
                mode === 'bank_to_investment'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {mode === 'bank_to_investment' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <ArrowRightLeft className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                {mode === 'bank_to_investment' ? 'BANK TO INVESTMENT TRANSFER' : 'INTER-ACCOUNT TRANSFER'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                {mode === 'bank_to_investment'
                  ? 'Fund investment positions directly from bank or cash accounts'
                  : 'Move balances between bank accounts, wallets, or cash'}
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

        {/* Scrollable Form Body */}
        <form
          id="transfer-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain"
        >
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Mode Switcher */}
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 dark:bg-[#080a0f] rounded border border-slate-200 dark:border-[#1d2332] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('bank_to_investment')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'bank_to_investment'
                  ? 'bg-white dark:bg-[#1b212e] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#2a3449] shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>TO INVESTMENT</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('account_to_account')}
              className={`py-1.5 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'account_to_account'
                  ? 'bg-white dark:bg-[#1b212e] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#2a3449] shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>ACCOUNT TRANSFER</span>
            </button>
          </div>

          {/* Source Account (Always in IDR) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
              SOURCE ACCOUNT (BANK / CASH) <span className="text-rose-500">*</span>
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
              required
            >
              {accounts
                .filter((a) => a.type === 'bank' || a.type === 'cash')
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()}) — Balance: {formatIdr(acc.balance)}
                  </option>
                ))}
            </select>
            {selectedSourceAccount && (
              <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                <span className="text-slate-500 dark:text-zinc-500">
                  AVAILABLE BALANCE: <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatIdr(selectedSourceAccount.balance)}</span>
                </span>
                {numericAmount > selectedSourceAccount.balance && (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    [DEFICIT {formatIdr(numericAmount - selectedSourceAccount.balance)}]
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Destination: Investment OR Account */}
          {mode === 'bank_to_investment' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                  TARGET INVESTMENT ASSET <span className="text-rose-500">*</span>
                </label>

                {/* Sub-toggle: Existing vs New Holding */}
                <div className="flex p-0.5 bg-slate-100 dark:bg-[#080a0f] rounded border border-slate-200 dark:border-[#1d2332] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTargetType('existing')}
                    disabled={investments.length === 0}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      targetType === 'existing'
                        ? 'bg-white dark:bg-[#1b212e] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#2a3449] shadow-xs font-bold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-2.5 h-2.5" />
                    <span>EXISTING ASSETS ({investments.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('new')}
                    className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer ${
                      targetType === 'new'
                        ? 'bg-white dark:bg-[#1b212e] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#2a3449] shadow-xs font-bold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+ NEW ASSET</span>
                  </button>
                </div>
              </div>

              {/* OPTION A: Existing Investment */}
              {targetType === 'existing' && (
                <div className="space-y-1.5">
                  {investments.length === 0 ? (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>No investment assets yet. Click "+ NEW ASSET" to create and fund your first position!</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={toInvestmentId}
                        onChange={(e) => handleSelectInvestment(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
                        required
                      >
                        {investments.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            [{inv.category}] {inv.name} ({inv.currency})
                          </option>
                        ))}
                      </select>
                      {selectedInvestment && (
                        <div className="p-2 rounded bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] text-[10px] text-slate-600 dark:text-zinc-400 flex items-center justify-between font-mono">
                          <span>
                            ASSET CLASS: <strong className="text-slate-900 dark:text-zinc-200">{selectedInvestment.category}</strong>
                          </span>
                          <span>
                            VALUATION BASIS:{' '}
                            <strong className={isUsdTarget ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-blue-600 dark:text-blue-400 font-bold'}>
                              {isUsdTarget ? 'USD ($) — Live Conversion' : 'IDR (Rupiah)'}
                            </strong>
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* OPTION B: Brand-New Investment (No currency buttons, automatic classification) */}
              {targetType === 'new' && (
                <div className="p-3 rounded bg-slate-50/80 dark:bg-[#080a0f] border border-emerald-500/30 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-[#1b212e]">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>CREATE NEW INVESTMENT ASSET</span>
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-zinc-500">AUTO-REGISTERED</span>
                  </div>

                  {/* Asset Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      ASSET NAME / TICKER <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newInvName}
                      onChange={(e) => setNewInvName(e.target.value)}
                      placeholder="e.g. S&P 500 (VOO), BBCA, Apple, Bitcoin..."
                      className="w-full bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                      required
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                        ASSET CLASS / HOLDING TYPE <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsHoldingTypesModalOpen(true)}
                        className="text-[9px] font-mono text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Manage or add custom holding types"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>Master Holdings</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {categoryOptions.map((cat) => {
                        const isSelected = newInvCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-[#1b212e] border-emerald-500/50 text-emerald-700 dark:text-emerald-400 shadow-xs'
                                : 'bg-white dark:bg-[#0d1017] border-slate-200 dark:border-[#1d2332] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                            }`}
                          >
                            <div className="font-bold text-xs font-mono">{cat.label}</div>
                            <div className="text-[9px] text-slate-500 dark:text-zinc-500">{cat.badge}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform / Broker & Units */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        BROKER / PLATFORM
                      </label>
                      <input
                        type="text"
                        value={newInvPlatform}
                        onChange={(e) => setNewInvPlatform(e.target.value)}
                        placeholder="e.g. Gotrade, Pluang, Bibit, IBKR..."
                        className="w-full bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                      />
                      {/* Quick platform pills */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {PLATFORM_SUGGESTIONS.slice(0, 4).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewInvPlatform(p)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 hover:bg-slate-200 dark:bg-[#161a25] dark:hover:bg-[#1f2637] text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-[#232b3d] transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        QUANTITY / UNITS (OPTIONAL)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={newInvUnits}
                        onChange={(e) => setNewInvUnits(e.target.value)}
                        placeholder="e.g. 1.25"
                        className="w-full bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                DESTINATION ACCOUNT <span className="text-rose-500">*</span>
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
                required
              >
                {accounts
                  .filter((a) => a.id !== fromAccountId && a.type !== 'credit_card' && a.type !== 'paylater')
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()}) — Balance: {formatIdr(acc.balance)}
                    </option>
                  ))}
              </select>
              {selectedDestAccount && (
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 font-mono">
                  CURRENT BALANCE:{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatIdr(selectedDestAccount.balance)}</span>
                </p>
              )}
            </div>
          )}

          {/* Amount in IDR (Always entered in Rupiah) */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1">
              TRANSFER CASH AMOUNT (IDR) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amountIdr}
                onChange={(e) => handleAmountIdrChange(e.target.value)}
                placeholder="1,000,000"
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded pl-9 pr-3 py-2 text-sm font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                required
              />
            </div>
            {amountIdr && !isNaN(Number(amountIdr)) && Number(amountIdr) > 0 && (
              <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-mono">
                <span className="text-slate-500 dark:text-zinc-500">READOUT:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatIdr(Number(amountIdr))}</span>
              </div>
            )}
          </div>

          {/* USD Conversion Box - Shown when target is USD. Converted USD amount is directly editable! */}
          {mode === 'bank_to_investment' && isUsdTarget && (
            <div className="p-3 bg-indigo-50/60 dark:bg-[#0a0d14] border border-indigo-200 dark:border-indigo-500/40 rounded space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100 dark:border-[#1b212e]">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>USD CONVERSION (INVESTMENT CREDIT)</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold">
                  EDITABLE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Converted USD Amount - Fully Editable */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-1">
                    USD AMOUNT RECEIVED ($) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={amountUsd}
                      onChange={(e) => handleAmountUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-[#111622] border border-indigo-300 dark:border-indigo-500/60 focus:border-indigo-500 rounded pl-7 pr-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-zinc-500 mt-1">
                    Enter the exact USD ($) amount credited in your investment app
                  </p>
                </div>

                {/* Broker Exchange Rate - Fully Editable */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                      BROKER RATE (IDR/USD)
                    </label>
                    <button
                      type="button"
                      onClick={handleResetToGoogleRate}
                      title="Reset to Google spot rate"
                      className="text-[9px] text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Google Spot Rate (Rp {formatIdr(usdIdrRate).replace('Rp', '').trim()})</span>
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={exchangeRate}
                      onChange={(e) => handleExchangeRateChange(e.target.value)}
                      className="w-full bg-white dark:bg-[#111622] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums text-right"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-zinc-500 mt-1">
                    Automatically calculated when you edit the received USD amount
                  </p>
                </div>
              </div>

              {/* Explanatory Banner */}
              <div className="p-2 rounded bg-white/80 dark:bg-[#0d1017] border border-indigo-100 dark:border-[#1d2332] text-[10px] text-slate-600 dark:text-zinc-400 space-y-1 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-500">Deducted from {selectedSourceAccount?.name || 'Bank'}:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {numericAmount > 0 ? `-${formatIdr(numericAmount)}` : 'Rp 0'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-500">Credited to {targetType === 'existing' ? (selectedInvestment?.name || 'Investment') : (newInvName || 'New Asset')}:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {amountUsd && Number(amountUsd) > 0 ? `+${formatUsd(Number(amountUsd))}` : '$0.00'}
                  </span>
                </div>
                {numericAmount > 0 && amountUsd && Number(amountUsd) > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-100 dark:border-[#1b212e] text-[9px] text-indigo-700 dark:text-indigo-300">
                    <span>Effective Broker Exchange Rate:</span>
                    <span className="font-bold">
                      Rp {Number(exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 2 })} / USD
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                EXECUTION DATE
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                MEMO / NOTES
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Monthly top-up, DCA GoTrade..."
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
              />
            </div>
          </div>
        </form>

        {/* Command Strip Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="transfer-modal-form"
            disabled={isSubmitting}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all shadow-md select-none ${
              isSubmitting
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-400 border border-slate-300 dark:border-zinc-700 cursor-not-allowed opacity-60 pointer-events-none'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 cursor-pointer hover:shadow-emerald-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>PROCESSING TRANSFER...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>
                  {mode === 'bank_to_investment' && targetType === 'new'
                    ? 'INITIALIZE & FUND ASSET'
                    : 'EXECUTE TRANSFER'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
