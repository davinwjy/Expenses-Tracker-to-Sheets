import React, { useState } from 'react';
import {
  TrendingUp,
  Plus,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Building,
  Landmark,
  Coins,
  Globe,
  DollarSign,
  X,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  formatIdr,
  formatUsd,
  formatMasked,
  INVESTMENT_CATEGORY_DETAILS,
} from '../lib/formatters';
import { Investment, InvestmentCategory } from '../types';

export const InvestmentsView: React.FC = () => {
  const {
    investments,
    stats,
    holdingTypes,
    isPrivacyMode,
    usdIdrRate,
    setIsAddInvestmentOpen,
    setEditingInvestment,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsHoldingTypesModalOpen,
    deleteInvestment,
  } = useFinance();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<Investment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const categoryAllocations = stats?.categoryAllocations || {};

  const filteredInvestments = investments.filter((inv) => {
    if (activeCategoryFilter === 'all') return true;
    return inv.category === activeCategoryFilter;
  });

  // Calculate totals
  let totalInvestedIdr = 0;
  let totalValueIdr = 0;
  let totalValueUsd = 0;

  investments.forEach((inv) => {
    if (inv.currency === 'USD') {
      const valUsd = inv.currentValue || 0;
      totalValueUsd += valUsd;
      totalValueIdr += valUsd * usdIdrRate;
      totalInvestedIdr += (inv.amountInvested || 0) * usdIdrRate;
    } else {
      const valIdr = inv.currentValue || 0;
      totalValueIdr += valIdr;
      totalValueUsd += valIdr / (usdIdrRate || 1);
      totalInvestedIdr += inv.amountInvested || 0;
    }
  });

  const totalPnlIdr = totalValueIdr - totalInvestedIdr;
  const totalPnlPercent = totalInvestedIdr > 0 ? (totalPnlIdr / totalInvestedIdr) * 100 : 0;

  const categoryTabs = [
    { id: 'all', label: 'All Holdings' },
    ...holdingTypes.map((ht) => ({
      id: ht.id,
      label: `${ht.label} (${ht.defaultCurrency})`,
    })),
  ];

  const handleDelete = async (id: string) => {
    try {
      await deleteInvestment(id);
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
      setDeletingId(null);
    } catch (err) {
      console.error('Delete investment failed:', err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-12">
      {/* HEADER & CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Investment Portfolio
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              · {investments.length} assets
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Multi-asset positions across stocks, mutual funds, crypto, and precious metals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsHoldingTypesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-slate-700 dark:text-zinc-300 text-xs font-medium border border-slate-200 dark:border-[#252c40] transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Asset Types</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('bank_to_investment');
              setIsTransferOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Fund Investment</span>
          </button>
        </div>
      </div>

      {/* PORTFOLIO TOTAL SUMMARY LEDGER (3 DENSE CELLS) */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider">
            TOTAL MARKET VALUE
          </span>
          <p className={`text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-zinc-100 font-mono tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalValueIdr, 'IDR', isPrivacyMode)}
          </p>
          <span className={`text-[10px] text-slate-500 dark:text-zinc-500 font-mono tabular-nums block ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            ≈ {formatMasked(totalValueUsd, 'USD', isPrivacyMode)}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider">
            COST BASIS (DEPLOYED CAPITAL)
          </span>
          <p className={`text-xl sm:text-2xl font-bold text-slate-800 dark:text-zinc-300 font-mono tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalInvestedIdr, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">Aggregated acquisition cost</span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider">
            UNREALIZED RETURN (PNL)
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums ${
                totalPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              } ${isPrivacyMode ? 'privacy-blur' : ''}`}
            >
              {totalPnlIdr >= 0 ? '+' : ''}
              {formatMasked(totalPnlIdr, 'IDR', isPrivacyMode)}
            </span>
          </div>
          <span
            className={`text-[10px] font-mono tabular-nums font-bold ${
              totalPnlIdr >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {totalPnlPercent >= 0 ? '+' : ''}
            {totalPnlPercent.toFixed(2)}% ROI
          </span>
        </div>
      </div>

      {/* HOLDINGS MATRIX (Relocated from Dashboard to Portfolio) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              HOLDINGS MATRIX
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">
              ({investments.length} Assets tracked)
            </span>
          </div>
          {activeCategoryFilter !== 'all' && (
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              SHOW ALL ASSETS
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Saham */}
          <div
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'Saham' ? 'all' : 'Saham')}
            className={`p-3 rounded-xl bg-white dark:bg-[#0d1017] border transition-all cursor-pointer shadow-sm ${
              activeCategoryFilter === 'Saham'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-blue-500/10'
                : 'border-slate-200 dark:border-[#1b212e] hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Building className="w-3 h-3" />
                STOCKS
              </span>
              <span>IDR</span>
            </div>
            <p className={`text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Saham']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
            <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5">
              {categoryAllocations['Saham']?.count || 0} holding(s)
            </p>
          </div>

          {/* RDPU */}
          <div
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'RDPU' ? 'all' : 'RDPU')}
            className={`p-3 rounded-xl bg-white dark:bg-[#0d1017] border transition-all cursor-pointer shadow-sm ${
              activeCategoryFilter === 'RDPU'
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 shadow-teal-500/10'
                : 'border-slate-200 dark:border-[#1b212e] hover:border-teal-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <Landmark className="w-3 h-3" />
                RDPU
              </span>
              <span>IDR</span>
            </div>
            <p className={`text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['RDPU']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
            <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5">
              {categoryAllocations['RDPU']?.count || 0} holding(s)
            </p>
          </div>

          {/* Bitcoin */}
          <div
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'Bitcoin' ? 'all' : 'Bitcoin')}
            className={`p-3 rounded-xl bg-white dark:bg-[#0d1017] border transition-all cursor-pointer shadow-sm ${
              activeCategoryFilter === 'Bitcoin'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-amber-500/10'
                : 'border-slate-200 dark:border-[#1b212e] hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Coins className="w-3 h-3" />
                BITCOIN
              </span>
              <span>IDR</span>
            </div>
            <p className={`text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Bitcoin']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
            <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 mt-0.5">
              {categoryAllocations['Bitcoin']?.count || 0} holding(s)
            </p>
          </div>

          {/* ETF USA */}
          <div
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'ETF USA' ? 'all' : 'ETF USA')}
            className={`p-3 rounded-xl bg-white dark:bg-[#0d1017] border transition-all cursor-pointer shadow-sm ${
              activeCategoryFilter === 'ETF USA'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 shadow-purple-500/10'
                : 'border-slate-200 dark:border-[#1b212e] hover:border-purple-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                ETF USA
              </span>
              <span>USD</span>
            </div>
            <p className={`text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['ETF USA']?.usdValue || 0, 'USD', isPrivacyMode)}
            </p>
            <p className={`text-[10px] font-mono tabular-nums text-slate-500 dark:text-zinc-500 mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              ≈ {formatMasked(categoryAllocations['ETF USA']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          {/* USD */}
          <div
            onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'USD' ? 'all' : 'USD')}
            className={`p-3 rounded-xl bg-white dark:bg-[#0d1017] border transition-all cursor-pointer shadow-sm ${
              activeCategoryFilter === 'USD'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-emerald-500/10'
                : 'border-slate-200 dark:border-[#1b212e] hover:border-emerald-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-zinc-500 mb-1">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                USD CASH
              </span>
              <span>USD</span>
            </div>
            <p className={`text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['USD']?.usdValue || 0, 'USD', isPrivacyMode)}
            </p>
            <p className={`text-[10px] font-mono tabular-nums text-slate-500 dark:text-zinc-500 mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              ≈ {formatMasked(categoryAllocations['USD']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>
        </div>
      </div>

      {/* CATEGORY FILTER TABS */}
      <div className="flex overflow-x-auto gap-1 pb-1 border-b border-slate-200 dark:border-[#1b212e]">
        {categoryTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategoryFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
              activeCategoryFilter === tab.id
                ? 'bg-emerald-50 dark:bg-[#151a26] text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-[#232c40]'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#10141e]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SPLIT MASTER-DETAIL WORKSPACE */}
      <div className="flex flex-col lg:flex-row gap-3.5 items-start">
        {/* MASTER TABLE */}
        <div className="flex-1 w-full overflow-x-auto rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm">
          {filteredInvestments.length === 0 ? (
            <div className="p-10 text-center font-mono">
              <TrendingUp className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-300">No assets in this category</p>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">
                Use "FUND FROM BANK" to initialize and fund an investment position.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#090b10] text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500 select-none">
                  <th className="py-2.5 px-3 font-semibold">Asset / Ticker</th>
                  <th className="py-2.5 px-3 font-semibold">Class</th>
                  <th className="py-2.5 px-3 font-semibold">Broker / App</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Units / Lots</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Cost Basis</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Market Value</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Unrealized PnL</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#171b26]">
                {filteredInvestments.map((inv) => {
                  const isUsd = inv.currency === 'USD';
                  const effectiveRate = (inv.customExchangeRate && inv.customExchangeRate > 0) ? inv.customExchangeRate : usdIdrRate;
                  const cost = inv.amountInvested || 0;
                  const current = inv.currentValue || 0;
                  const pnl = current - cost;
                  const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
                  const idrEquivalent = isUsd ? current * effectiveRate : current;
                  const isSelected = selectedAsset?.id === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedAsset(inv)}
                      className={`transition-colors cursor-pointer group ${
                        isSelected
                          ? 'bg-slate-100 dark:bg-[#141824] border-l-2 border-emerald-500'
                          : 'hover:bg-slate-50 dark:hover:bg-[#10141e]'
                      }`}
                    >
                      {/* Asset Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {inv.name}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${inv.currency === 'USD' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                            {inv.currency}
                          </span>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                        {inv.category}
                      </td>

                      {/* Broker */}
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                        {inv.platform || '—'}
                      </td>

                      {/* Units */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-zinc-300">
                        {inv.units !== undefined && inv.units !== null ? inv.units : '—'}
                      </td>

                      {/* Cost Basis */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                          {formatMasked(cost, inv.currency, isPrivacyMode)}
                        </span>
                      </td>

                      {/* Market Value */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-zinc-100">
                        <div className={isPrivacyMode ? 'privacy-blur' : ''}>
                          <div>{formatMasked(current, inv.currency, isPrivacyMode)}</div>
                          {isUsd && (
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                              ≈ {formatMasked(idrEquivalent, 'IDR', isPrivacyMode)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Return */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        <div className={isPrivacyMode ? 'privacy-blur' : ''}>
                          <span
                            className={`font-semibold ${
                              pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {pnl >= 0 ? '+' : ''}
                            {formatMasked(pnl, inv.currency, isPrivacyMode)}
                          </span>
                          <div
                            className={`text-[10px] ${
                              pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ({pnlPercent >= 0 ? '+' : ''}
                            {pnlPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 inline transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* INSTANT DETAIL INSPECTION DRAWER (360px) */}
        {selectedAsset && (
          <div className="w-full lg:w-90 bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] rounded-xl p-4 space-y-4 animate-in fade-in shrink-0 shadow-md">
            {/* Drawer Header */}
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-100 dark:border-[#1b212e]">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                  ASSET TELEMETRY
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 font-mono truncate">
                  {selectedAsset.name}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                  <span>{selectedAsset.category}</span>
                  {selectedAsset.platform && (
                    <>
                      <span>·</span>
                      <span>{selectedAsset.platform}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-[#161a25] cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Telemetry Table */}
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase">CURRENT VALUE</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                    {formatMasked(selectedAsset.currentValue || 0, selectedAsset.currency, isPrivacyMode)}
                  </span>
                  {selectedAsset.currency === 'USD' && (
                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums">
                      ≈ {formatMasked((selectedAsset.currentValue || 0) * (selectedAsset.customExchangeRate || usdIdrRate), 'IDR', isPrivacyMode)}
                      {selectedAsset.customExchangeRate ? (
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block font-mono">
                          (Broker FX: Rp {selectedAsset.customExchangeRate.toLocaleString('id-ID')})
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase">COST BASIS</span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                  {formatMasked(selectedAsset.amountInvested || 0, selectedAsset.currency, isPrivacyMode)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
                <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase">UNREALIZED RETURN</span>
                {(() => {
                  const cost = selectedAsset.amountInvested || 0;
                  const current = selectedAsset.currentValue || 0;
                  const pnl = current - cost;
                  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                  return (
                    <div className="text-right">
                      <span
                        className={`font-bold tabular-nums ${
                          pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}
                        {formatMasked(pnl, selectedAsset.currency, isPrivacyMode)}
                      </span>
                      <div
                        className={`text-[10px] tabular-nums ${
                          pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pnlPct >= 0 ? '+' : ''}
                        {pnlPct.toFixed(2)}% ROI
                      </div>
                    </div>
                  );
                })()}
              </div>

              {selectedAsset.units !== undefined && selectedAsset.units !== null && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase">UNITS / LOTS</span>
                  <span className="font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
                    {selectedAsset.units}
                  </span>
                </div>
              )}

              {selectedAsset.notes && (
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] text-[11px] text-slate-600 dark:text-zinc-400">
                  <span className="text-[9px] uppercase text-slate-500 dark:text-zinc-500 block mb-0.5">NOTES</span>
                  <p className="italic">"{selectedAsset.notes}"</p>
                </div>
              )}
            </div>

            {/* Quick Actions inside Drawer */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#1b212e]">
              <button
                onClick={() => {
                  setTransferInitialMode('bank_to_investment');
                  setIsTransferOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer shadow-sm"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>FUND FROM BANK ACCOUNT</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setEditingInvestment(selectedAsset);
                    setIsAddInvestmentOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 font-mono text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                  <span>EDIT ASSET</span>
                </button>

                {deletingId === selectedAsset.id ? (
                  <button
                    onClick={() => handleDelete(selectedAsset.id)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-rose-600 text-white font-mono text-xs font-bold cursor-pointer"
                  >
                    <span>CONFIRM?</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setDeletingId(selectedAsset.id)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-xs border border-slate-200 dark:border-[#21293a] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>DELETE</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
