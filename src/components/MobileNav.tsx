import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  PieChart,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const MobileNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setEditingTransaction,
    isMobileQuickMenuOpen: isQuickMenuOpen,
    setIsMobileQuickMenuOpen: setIsQuickMenuOpen,
  } = useFinance();

  return (
    <>
      {/* Backdrop */}
      {isQuickMenuOpen && (
        <div
          onClick={() => setIsQuickMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Streamlined Quick Action Sheet */}
      {isQuickMenuOpen && (
        <div className="fixed bottom-20 inset-x-4 z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-2 animate-in slide-in-from-bottom-5 max-w-sm mx-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">Quick Action</span>
            <button
              onClick={() => setIsQuickMenuOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setEditingTransaction(null);
                setTransactionInitialType('expense');
                setIsAddExpenseOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent text-slate-900 dark:text-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Record Expense</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Deduct from Bank or Cash</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setEditingTransaction(null);
                setTransactionInitialType('income');
                setIsAddExpenseOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent text-slate-900 dark:text-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Record Income</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Salary, bonus, freelance deposit</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setTransferInitialMode('bank_to_investment');
                setIsTransferOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent text-slate-900 dark:text-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Bank to Investment</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Directly fund stocks, crypto, USD</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickMenuOpen(false);
                setTransferInitialMode('account_to_account');
                setIsTransferOpen(true);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-transparent text-slate-900 dark:text-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Account Transfer</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Transfer between accounts</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sleek Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#080a0f]/95 backdrop-blur-lg border-t border-slate-200 dark:border-[#1a1f2c] px-2 py-1.5 transition-colors">
        <div className="grid grid-cols-5 items-center w-full max-w-md mx-auto">
          {/* Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded transition-colors cursor-pointer ${
              activeTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono uppercase mt-0.5 tracking-tight truncate max-w-full">Dashboard</span>
          </button>

          {/* Transactions */}
          <button
            onClick={() => setActiveTab('expenses')}
            className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded transition-colors cursor-pointer ${
              activeTab === 'expenses'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono uppercase mt-0.5 tracking-tight truncate max-w-full">Transactions</span>
          </button>

          {/* Clean Center Action Button - Exactly Centered in Column 3 */}
          <div className="flex items-center justify-center w-full h-full">
            <button
              onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer"
              aria-label="New Action"
            >
              <Plus className={`w-4 h-4 stroke-[2.8] transition-transform duration-100 ${isQuickMenuOpen ? 'rotate-45' : ''}`} />
            </button>
          </div>

          {/* Accounts */}
          <button
            onClick={() => setActiveTab('accounts')}
            className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            <WalletCards className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono uppercase mt-0.5 tracking-tight truncate max-w-full">Accounts</span>
          </button>

          {/* Portfolio / Assets */}
          <button
            onClick={() => setActiveTab('investments')}
            className={`w-full flex flex-col items-center justify-center py-1 px-1 rounded transition-colors cursor-pointer ${
              activeTab === 'investments'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'
            }`}
          >
            <PieChart className="w-4 h-4 shrink-0" />
            <span className="text-[9px] font-mono uppercase mt-0.5 tracking-tight truncate max-w-full">Assets</span>
          </button>
        </div>
      </div>
    </>
  );
};
