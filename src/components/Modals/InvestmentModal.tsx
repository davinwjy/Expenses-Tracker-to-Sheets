import React, { useState, useEffect } from 'react';
import { X, Check, TrendingUp, RotateCcw, AlertCircle, Trash2, Layers } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { InvestmentCategory } from '../../types';
import { formatIdr, formatUsd } from '../../lib/formatters';

const DEFAULT_INVESTMENT_CATEGORIES: { id: InvestmentCategory; label: string; defaultCurrency: 'IDR' | 'USD'; example: string }[] = [
  { id: 'Saham', label: 'Indonesian Stocks (Saham)', defaultCurrency: 'IDR', example: 'e.g. BBCA, BBRI, ASII' },
  { id: 'RDPU', label: 'Money Market (RDPU)', defaultCurrency: 'IDR', example: 'e.g. Sucorinvest Stable Fund' },
  { id: 'Bitcoin', label: 'Crypto (Bitcoin)', defaultCurrency: 'IDR', example: 'e.g. Cold storage, Indodax, Pintu' },
  { id: 'ETF USA', label: 'US Stocks & ETFs', defaultCurrency: 'USD', example: 'e.g. VOO, QQQ, SCHD, SPY' },
  { id: 'USD', label: 'USD Holdings & Cash', defaultCurrency: 'USD', example: 'e.g. Wise USD balance, Broker cash' },
];

export const InvestmentModal: React.FC = () => {
  const {
    isAddInvestmentOpen,
    setIsAddInvestmentOpen,
    editingInvestment,
    setEditingInvestment,
    holdingTypes,
    setIsHoldingTypesModalOpen,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    usdIdrRate,
  } = useFinance();

  const [category, setCategory] = useState<InvestmentCategory>('Saham');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [customExchangeRate, setCustomExchangeRate] = useState<string>('');
  const [name, setName] = useState('');
  const [amountInvested, setAmountInvested] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [units, setUnits] = useState('');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoriesList = holdingTypes && holdingTypes.length > 0
    ? holdingTypes.map((h) => ({
        id: h.id,
        label: h.label,
        defaultCurrency: h.defaultCurrency,
        example: h.example || `e.g. ${h.label}`,
      }))
    : DEFAULT_INVESTMENT_CATEGORIES;

  const selectedCategoryMeta = categoriesList.find((c) => c.id === category) || {
    id: category,
    label: category,
    defaultCurrency: currency,
    example: '',
  };
  const isUsd = currency === 'USD';
  const effectiveRate = isUsd
    ? (Number(customExchangeRate) > 0 ? Number(customExchangeRate) : usdIdrRate)
    : usdIdrRate;

  useEffect(() => {
    if (isAddInvestmentOpen) {
      setIsSubmitting(false);
      if (editingInvestment) {
        setCategory(editingInvestment.category);
        const matched = categoriesList.find((c) => c.id === editingInvestment.category);
        const resolvedCurrency = matched ? matched.defaultCurrency : ((editingInvestment.category === 'ETF USA' || editingInvestment.category === 'USD') ? 'USD' : 'IDR');
        setCurrency(resolvedCurrency);
        setCustomExchangeRate(editingInvestment.customExchangeRate ? editingInvestment.customExchangeRate.toString() : '');
        setName(editingInvestment.name);
        setAmountInvested(editingInvestment.amountInvested.toString());
        setCurrentValue(editingInvestment.currentValue.toString());
        setUnits(editingInvestment.units !== undefined ? editingInvestment.units.toString() : '');
        setPlatform(editingInvestment.platform || '');
        setNotes(editingInvestment.notes || '');
      } else {
        resetFields();
      }
      setError('');
      setConfirmDelete(false);
    }
  }, [isAddInvestmentOpen, editingInvestment]);

  const resetFields = () => {
    setIsSubmitting(false);
    setCategory('Saham');
    setCurrency('IDR');
    setCustomExchangeRate('');
    setName('');
    setAmountInvested('');
    setCurrentValue('');
    setUnits('');
    setPlatform('');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    resetFields();
    setEditingInvestment(null);
    setIsAddInvestmentOpen(false);
  };

  const handleCategoryChange = (newCat: InvestmentCategory) => {
    setCategory(newCat);
    const matched = categoriesList.find((c) => c.id === newCat);
    const resolvedCurrency = matched ? matched.defaultCurrency : ((newCat === 'ETF USA' || newCat === 'USD') ? 'USD' : 'IDR');
    setCurrency(resolvedCurrency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an investment name or ticker');
      return;
    }

    const parsedInvested = Number(amountInvested);
    if (isNaN(parsedInvested) || parsedInvested < 0) {
      setError('Please enter a valid invested amount');
      return;
    }

    const parsedCurrent = currentValue !== '' ? Number(currentValue) : parsedInvested;
    if (isNaN(parsedCurrent) || parsedCurrent < 0) {
      setError('Please enter a valid current value');
      return;
    }

    const parsedCustomRate = isUsd && customExchangeRate && !isNaN(Number(customExchangeRate)) && Number(customExchangeRate) > 0
      ? Number(customExchangeRate)
      : undefined;

    const matched = categoriesList.find((c) => c.id === category);
    const resolvedCurrency: 'IDR' | 'USD' = matched ? matched.defaultCurrency : ((category === 'ETF USA' || category === 'USD') ? 'USD' : 'IDR');

    setIsSubmitting(true);
    try {
      if (editingInvestment) {
        await updateInvestment(editingInvestment.id, {
          name: name.trim(),
          category,
          currency: resolvedCurrency,
          amountInvested: parsedInvested,
          currentValue: parsedCurrent,
          customExchangeRate: parsedCustomRate,
          units: units ? Number(units) : undefined,
          platform: platform.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addInvestment({
          name: name.trim(),
          category,
          currency: resolvedCurrency,
          amountInvested: parsedInvested,
          currentValue: parsedCurrent,
          customExchangeRate: parsedCustomRate,
          units: units ? Number(units) : undefined,
          platform: platform.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save investment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingInvestment) return;
    setIsSubmitting(true);
    try {
      await deleteInvestment(editingInvestment.id);
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete investment');
      setIsSubmitting(false);
    }
  };

  const invNumber = Number(amountInvested) || 0;
  const curNumber = currentValue !== '' ? Number(currentValue) : invNumber;
  const pnl = curNumber - invNumber;
  const pnlPercent = invNumber > 0 ? (pnl / invNumber) * 100 : 0;

  if (!isAddInvestmentOpen || !editingInvestment) return null;

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
            <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                MODIFY ASSET POSITION
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Update holding valuation, broker notes, and position details
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
        <form id="investment-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                ASSET CLASSIFICATION <span className="text-rose-500">*</span>
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
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-[#080a0f] rounded border border-slate-200 dark:border-[#1d2332] text-xs">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`py-1 px-2 rounded text-center whitespace-nowrap transition-all cursor-pointer flex-1 min-w-[75px] ${
                    category === cat.id
                      ? 'bg-white dark:bg-[#1b212e] text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-[#2a3449] shadow-xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span className="block text-[11px] font-mono">{cat.id}</span>
                  <span className="block text-[9px] opacity-75 font-mono">({cat.defaultCurrency})</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
              <span className="text-slate-500 dark:text-zinc-500">
                CATEGORY: <strong className="text-emerald-600 dark:text-emerald-400">{selectedCategoryMeta.id}</strong> • {selectedCategoryMeta.example}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-zinc-500 uppercase tracking-wider text-[9px]">DENOMINATION:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isUsd ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'}`}>
                  {isUsd ? 'USD ($)' : 'IDR (Rp)'}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Broker Exchange Rate (Only shown when currency is USD) */}
          {isUsd && (
            <div className="p-2.5 rounded bg-indigo-50/60 dark:bg-[#0d1017] border border-indigo-200 dark:border-indigo-500/30 space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                  BROKER / APP EXCHANGE RATE (IDR per USD)
                </label>
                <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-500">CUSTOM RATE</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                  Rp
                </span>
                <input
                  type="number"
                  step="any"
                  value={customExchangeRate}
                  onChange={(e) => setCustomExchangeRate(e.target.value)}
                  placeholder={usdIdrRate.toString()}
                  className="w-full bg-white dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded pl-8 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Current system spot rate: <strong className="text-slate-700 dark:text-zinc-300 font-mono tabular-nums">{formatIdr(usdIdrRate)}</strong>. Fill this in if your broker uses a specific deposit/buying exchange rate (e.g. Rp 16,250).
              </p>
            </div>
          )}

          {/* Asset Name / Ticker */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
              ASSET TICKER / IDENTIFIER <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selectedCategoryMeta.example}
              className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Amount Invested & Current Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                PRINCIPAL COST ({isUsd ? 'USD' : 'IDR'}) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                  {isUsd ? '$' : 'Rp'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amountInvested}
                  onChange={(e) => setAmountInvested(e.target.value)}
                  placeholder={isUsd ? '100.00' : '1,000,000'}
                  className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded pl-8 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                MARKET VALUATION ({isUsd ? 'USD' : 'IDR'})
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500">
                  {isUsd ? '$' : 'Rp'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder={amountInvested || (isUsd ? '100.00' : '1,000,000')}
                  className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded pl-8 pr-3 py-2 text-xs font-bold text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Live PnL Preview */}
          {invNumber > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-[#080a0f] rounded border border-slate-200 dark:border-[#1d2332] flex flex-wrap items-center justify-between text-xs gap-2">
              <div>
                <span className="text-slate-500 dark:text-zinc-500">UNREALIZED PnL: </span>
                <span className={`font-bold font-mono tabular-nums ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {pnl >= 0 ? '+' : ''}
                  {isUsd ? formatUsd(pnl) : formatIdr(pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                </span>
              </div>
              {isUsd && (
                <div className="text-slate-500 dark:text-zinc-500 text-[10px]">
                  IDR VALUATION: <strong className="text-slate-900 dark:text-zinc-200 font-mono tabular-nums">{formatIdr(curNumber * effectiveRate)}</strong>
                  {customExchangeRate ? <span className="text-indigo-600 dark:text-indigo-400 ml-1">(Broker Rate: Rp {Number(customExchangeRate).toLocaleString('en-US')})</span> : null}
                </div>
              )}
            </div>
          )}

          {/* Units & Platform */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                QUANTITY / UNITS (OPTIONAL)
              </label>
              <input
                type="number"
                step="any"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder={category === 'Bitcoin' ? 'e.g. 0.015 BTC' : 'e.g. 10 shares'}
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                PLATFORM / BROKER (OPTIONAL)
              </label>
              <input
                type="text"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="e.g. GoTrade, Bibit, Ajaib..."
                className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
              POSITION NOTES (OPTIONAL)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. DCA recurring, thesis..."
              className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] focus:border-emerald-500 rounded px-3 py-2 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
            />
          </div>
        </form>

        {/* Command Strip Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-between gap-2">
          {editingInvestment ? (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-2.5 py-1.5 rounded bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
                >
                  CONFIRM PURGE
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer transition-colors"
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
              form="investment-modal-form"
              disabled={isSubmitting}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSubmitting ? 'SAVING...' : 'UPDATE POSITION'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
