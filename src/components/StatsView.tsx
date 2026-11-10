import React, { useState, useEffect } from 'react';
import {
  PieChart,
  TrendingUp,
  Receipt,
  SlidersHorizontal,
  Layers,
  Building,
  Landmark,
  Coins,
  Globe,
  Wallet,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatUsd, formatMasked, CATEGORY_COLORS } from '../lib/formatters';
import { IncomeInvestmentTracker } from './Analytics/IncomeInvestmentTracker';

export const StatsView: React.FC = () => {
  const {
    stats,
    accounts,
    investments,
    isPrivacyMode,
    usdIdrRate,
    rateSource,
    rateLastUpdated,
    isRateAutoUpdate,
    setIsRateAutoUpdate,
    isRateFetching,
    fetchLatestRate,
    updateRate,
  } = useFinance();

  const [rateInput, setRateInput] = useState(usdIdrRate.toString());
  const [rateSaved, setRateSaved] = useState(false);
  const [fetchToast, setFetchToast] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    setRateInput(usdIdrRate.toString());
  }, [usdIdrRate]);

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(rateInput);
    if (!isNaN(val) && val > 0) {
      await updateRate(val, 'Manual Custom');
      setRateSaved(true);
      setTimeout(() => setRateSaved(false), 2000);
    }
  };

  const handleFetchNow = async () => {
    const res = await fetchLatestRate();
    if (res.success && res.rate) {
      setFetchToast(`Live Google rate: Rp ${Math.round(res.rate).toLocaleString('id-ID')}`);
      setTimeout(() => setFetchToast(null), 3500);
    } else {
      setFetchToast('Failed to fetch from Google');
      setTimeout(() => setFetchToast(null), 3500);
    }
  };

  const formatLastUpdated = (iso?: string | null) => {
    if (!iso) return 'Not synced yet';
    try {
      const date = new Date(iso);
      return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
        ' (' +
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ')'
      );
    } catch {
      return iso;
    }
  };

  const netWorth = stats?.totalNetWorthIdr || 0;
  const liquidCash = stats?.totalLiquidCashIdr || 0;
  const totalInvestment = stats?.totalInvestmentValueIdr || 0;
  const expenseByCategory = stats?.expenseByCategory || {};
  const incomeByCategory = stats?.incomeByCategory || {};
  const expenseByAccount = stats?.expenseByAccount || {};
  const monthlyExpenses = stats?.monthlyExpenses || 0;
  const monthlyIncomes = stats?.monthlyIncomes || 0;
  const categoryAllocations = stats?.categoryAllocations || {};

  // Asset allocation percentages
  const cashPercent = netWorth > 0 ? (liquidCash / netWorth) * 100 : 0;
  const sahamPercent = netWorth > 0 ? ((categoryAllocations['Saham']?.idrValue || 0) / netWorth) * 100 : 0;
  const rdpuPercent = netWorth > 0 ? ((categoryAllocations['RDPU']?.idrValue || 0) / netWorth) * 100 : 0;
  const btcPercent = netWorth > 0 ? ((categoryAllocations['Bitcoin']?.idrValue || 0) / netWorth) * 100 : 0;
  const etfPercent = netWorth > 0 ? ((categoryAllocations['ETF USA']?.idrValue || 0) / netWorth) * 100 : 0;
  const usdPercent = netWorth > 0 ? ((categoryAllocations['USD']?.idrValue || 0) / netWorth) * 100 : 0;

  return (
    <div className="space-y-4 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
          Analytics & Reports
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          Asset allocation weights, income vs investment timelines, and FX conversion rates
        </p>
      </div>

      {/* MONTH-BY-MONTH & YEAR-BY-YEAR INCOME VS INVESTMENT TRACKER */}
      <IncomeInvestmentTracker />

      {/* ASSET ALLOCATION MATRIX */}
      <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span>Asset Allocation Matrix</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Distribution of aggregate net worth across liquid and invested assets
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
            Total: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(netWorth, 'IDR', isPrivacyMode)}</span>
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-2.5 rounded-sm bg-slate-100 dark:bg-[#121622] overflow-hidden flex border border-slate-200 dark:border-[#1b212e]">
          <div style={{ width: `${cashPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cash & Banks: ${cashPercent.toFixed(1)}%`} />
          <div style={{ width: `${sahamPercent}%` }} className="bg-blue-600 h-full transition-all" title={`Saham: ${sahamPercent.toFixed(1)}%`} />
          <div style={{ width: `${rdpuPercent}%` }} className="bg-teal-500 h-full transition-all" title={`RDPU: ${rdpuPercent.toFixed(1)}%`} />
          <div style={{ width: `${btcPercent}%` }} className="bg-amber-500 h-full transition-all" title={`Bitcoin: ${btcPercent.toFixed(1)}%`} />
          <div style={{ width: `${etfPercent}%` }} className="bg-purple-500 h-full transition-all" title={`ETF USA: ${etfPercent.toFixed(1)}%`} />
          <div style={{ width: `${usdPercent}%` }} className="bg-emerald-500 h-full transition-all" title={`USD Cash: ${usdPercent.toFixed(1)}%`} />
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-sky-600 dark:text-sky-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-sky-500" />
              <span>CASH & BANKS</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {cashPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(liquidCash, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-blue-600" />
              <span>STOCKS (ID)</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {sahamPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Saham']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-teal-600 dark:text-teal-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-teal-500" />
              <span>RDPU (FUND)</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {rdpuPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['RDPU']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-amber-500" />
              <span>BITCOIN</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {btcPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['Bitcoin']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-purple-600 dark:text-purple-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-purple-500" />
              <span>ETF USA</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {etfPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['ETF USA']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332]">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">
              <div className="w-2 h-2 rounded-none bg-emerald-500" />
              <span>USD CASH</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
              {usdPercent.toFixed(1)}%
            </p>
            <p className={`text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatMasked(categoryAllocations['USD']?.idrValue || 0, 'IDR', isPrivacyMode)}
            </p>
          </div>
        </div>
      </div>

      {/* TWO COLUMNS: MONTHLY EXPENSE CATEGORIES & FUNDING SOURCE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 font-mono">
        {/* Category Breakdown (Toggleable between Expense & Income) */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#1b212e]">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-xs uppercase tracking-wider">
                {categoryTab === 'expense' ? 'EXPENSE DISTRIBUTION' : 'INCOME SOURCE BREAKDOWN'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                {categoryTab === 'expense'
                  ? 'Monthly outflow allocation across spending channels'
                  : 'Monthly revenue and earnings deposit sources'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 bg-slate-100 dark:bg-[#080a0f] rounded-lg border border-slate-200 dark:border-[#1d2332] text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryTab('expense')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    categoryTab === 'expense'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
                  }`}
                >
                  EXPENSES
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryTab('income')}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    categoryTab === 'income'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300'
                  }`}
                >
                  INCOMES
                </button>
              </div>

              <span
                className={`text-xs font-bold tabular-nums ${
                  categoryTab === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatIdr(
                  categoryTab === 'expense' ? monthlyExpenses : monthlyIncomes
                )}
              </span>
            </div>
          </div>

          {categoryTab === 'expense' ? (
            Object.keys(expenseByCategory).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-500 py-6 text-center">No expenses recorded this month.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expenseByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const pct = monthlyExpenses > 0 ? (amount / monthlyExpenses) * 100 : 0;
                    const color = CATEGORY_COLORS[category] || '#f97316';

                    return (
                      <div key={category} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-sans font-medium text-slate-900 dark:text-zinc-200">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                              {formatIdr(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-none bg-slate-100 dark:bg-[#121622] overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          ) : (
            Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-500 py-6 text-center">No income recorded this month.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, amount]) => {
                    const pct = monthlyIncomes > 0 ? (amount / monthlyIncomes) * 100 : 0;
                    const color = CATEGORY_COLORS[category] || '#10b981';

                    return (
                      <div key={category} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-sans font-medium text-slate-900 dark:text-zinc-200">{category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                              {formatIdr(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 rounded-none bg-slate-100 dark:bg-[#121622] overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )
          )}
        </div>

        {/* Funding Source Breakdown */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3 shadow-sm">
          <div className="pb-2 border-b border-slate-100 dark:border-[#1b212e]">
            <h3 className="font-bold text-slate-900 dark:text-zinc-200 text-xs uppercase tracking-wider">
              FUNDING SOURCE DISBURSEMENT
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-zinc-500">Accounts bearing primary transaction loads</p>
          </div>

          {Object.keys(expenseByAccount).length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-500 py-6 text-center">No expenses recorded this month.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(expenseByAccount)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([accId, item]) => {
                  const pct = monthlyExpenses > 0 ? (item.amount / monthlyExpenses) * 100 : 0;

                  return (
                    <div key={accId} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-sans font-medium text-slate-900 dark:text-zinc-200">
                          {item.name} <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase font-mono">({item.type})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-zinc-500 tabular-nums">{pct.toFixed(1)}%</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-300 tabular-nums">
                            {formatIdr(item.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-none bg-slate-100 dark:bg-[#121622] overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* SYSTEM & EXCHANGE RATE SETTINGS */}
      <div className="font-mono max-w-xl">
        {/* USD / IDR Exchange Rate Setting */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] space-y-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>USD / IDR LIVE CONVERSION TELEMETRY</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Used to value US ETF and USD balances in IDR equivalents.
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>{rateSource || 'Google Finance'}</span>
            </div>
          </div>

          {/* Rate Highlight Card */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider">BENCHMARK RATE</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-zinc-100">
                    Rp {Math.round(usdIdrRate).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500">/ 1 USD</span>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleFetchNow}
                disabled={isRateFetching}
                className="self-start sm:self-center flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2030] border border-slate-200 dark:border-[#21293a] text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRateFetching ? 'animate-spin' : ''}`} />
                <span>{isRateFetching ? 'FETCHING...' : 'SYNC GOOGLE'}</span>
              </button>
            </div>

            {/* Status & Timestamp */}
            <div className="pt-1.5 border-t border-slate-200 dark:border-[#1b212e] flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-500 dark:text-zinc-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                <span>Last updated: <strong className="text-slate-700 dark:text-zinc-400">{formatLastUpdated(rateLastUpdated)}</strong></span>
              </div>
              {fetchToast && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                  ✓ {fetchToast}
                </span>
              )}
            </div>
          </div>

          {/* Auto-Update Every 12 Hours Toggle */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 dark:text-zinc-200">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                <span>Automatic 12-hour background sync</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Synchronizes latest spot rates from Google every 12 hours.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRateAutoUpdate(!isRateAutoUpdate)}
              role="switch"
              aria-checked={isRateAutoUpdate}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 focus:outline-none ${
                isRateAutoUpdate ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-[#1b212e]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-150 ${
                  isRateAutoUpdate ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Manual Rate Override Form */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-500 mb-1">
              <span>MANUAL RATE OVERRIDE:</span>
            </div>
            <form onSubmit={handleUpdateRate} className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 dark:text-zinc-500">1 USD = Rp</span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] rounded-lg pl-22 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-100 dark:bg-[#131722] hover:bg-slate-200 dark:hover:bg-[#1a2030] text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-[#21293a] text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
              >
                {rateSaved ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" /> : null}
                <span>{rateSaved ? 'SAVED' : 'OVERRIDE'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
