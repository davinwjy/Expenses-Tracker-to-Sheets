import React, { useState, useRef, useEffect } from 'react';
import {
  Wallet,
  Eye,
  EyeOff,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Receipt,
  ArrowDownRight,
  LogOut,
  User as UserIcon,
  RefreshCw,
  ChevronDown,
  Flame,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

export const Navbar: React.FC = () => {
  const { user, logout, isFirebase } = useAuth();
  const {
    activeTab,
    setActiveTab,
    isPrivacyMode,
    togglePrivacyMode,
    refreshData,
    isLoading,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsAddAccountOpen,
    setIsHoldingTypesModalOpen,
    setEditingTransaction,
    setEditingAccount,
    setIsFirebaseSetupOpen,
  } = useFinance();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'investments', label: 'Portfolio' },
    { id: 'stats', label: 'Analytics' },
  ] as const;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand Logo */}
          <div className="flex items-center gap-7">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/15 group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                WealthTrack
              </span>
            </button>

            {/* Desktop Clean Navigation Tabs */}
            <nav className="hidden md:flex items-center p-1 bg-slate-900/80 rounded-xl border border-slate-800/80">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Privacy Toggle + Unified '+ New' Action + Profile Menu */}
          <div className="flex items-center gap-2">
            {/* Minimal Privacy Shield Button */}
            <button
              onClick={togglePrivacyMode}
              title={isPrivacyMode ? 'Privacy Mode Active: Nominals hidden' : 'Hide nominals in public'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                isPrivacyMode
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {isPrivacyMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Hidden</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Privacy</span>
                </>
              )}
            </button>

            {/* Realtime Firebase Cloud Sync Button */}
            <button
              onClick={() => setIsFirebaseSetupOpen(true)}
              title={isFirebase ? 'Firebase Real-Time Cloud Sync: Active' : 'Setup Firebase Real-Time Cloud Sync'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isFirebase
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${isFirebase ? 'text-amber-400 fill-amber-400/30' : 'text-slate-400'}`} />
              <span className="hidden lg:inline">{isFirebase ? 'Cloud Active' : 'Firebase'}</span>
            </button>

            {/* Clean '+ New' Dropdown Menu (Replaces the 3 cluttered colorful buttons!) */}
            <div className="relative" ref={newMenuRef}>
              <button
                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New Action</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isNewMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isNewMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Action
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Shortcut</span>
                  </div>

                  {/* Frequent Actions */}
                  <div className="p-1.5 space-y-1">
                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        setEditingTransaction(null);
                        setTransactionInitialType('expense');
                        setIsAddExpenseOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-500/25 transition-all">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 group-hover:text-white">Record Expense</div>
                        <div className="text-[10px] text-slate-400 truncate">Log daily expense & deduct balance</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        setEditingTransaction(null);
                        setTransactionInitialType('income');
                        setIsAddExpenseOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 group-hover:text-white">Record Income</div>
                        <div className="text-[10px] text-slate-400 truncate">Log salary, bonus, side gig & deposit</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        setTransferInitialMode('bank_to_investment');
                        setIsTransferOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-500/25 transition-all">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 group-hover:text-white">Bank to Investment</div>
                        <div className="text-[10px] text-slate-400 truncate">Top-up stocks, crypto, RDPU</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsNewMenuOpen(false);
                        setTransferInitialMode('account_to_account');
                        setIsTransferOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-500/25 transition-all">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-100 group-hover:text-white">Account Transfer</div>
                        <div className="text-[10px] text-slate-400 truncate">Transfer between accounts</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile & Secondary Settings Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-200">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 p-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
                  {/* User info */}
                  <div className="px-2.5 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{user?.name || 'Account'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  </div>

                  {/* Firebase Real-Time Cloud Sync Modal */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsFirebaseSetupOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-amber-300 hover:bg-amber-500/10 rounded-lg cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold">🔥 Real-Time Cloud Sync</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isFirebase
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isFirebase ? 'Active' : 'Setup'}
                    </span>
                  </button>

                  {/* Refresh Cloud Data */}
                  <button
                    onClick={() => {
                      refreshData();
                    }}
                    disabled={isLoading}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                      <span>Sync Data</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Cloud</span>
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
