import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Eye,
  EyeOff,
  Flame,
  Plus,
  ChevronDown,
  Receipt,
  ArrowDownRight,
  TrendingUp,
  ArrowRightLeft,
  RefreshCw,
  LogOut,
  Sparkles,
  Shield,
  Smartphone,
  Layers,
  WifiOff,
  Sun,
  Moon,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { isUserAdmin } from '../lib/admin';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
}) => {
  const { user, logout, isFirebase } = useAuth();
  const {
    activeTab,
    setActiveTab,
    isOnline,
    isSyncing,
    pendingSyncCount,
    triggerManualSync,
    isPrivacyMode,
    togglePrivacyMode,
    theme,
    toggleTheme,
    refreshData,
    isLoading,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsAddAccountOpen,
    setEditingTransaction,
    setEditingAccount,
    setIsFirebaseSetupOpen,
    setIsGoogleSheetsModalOpen,
    setIsMobileAppModalOpen,
    setIsHoldingTypesModalOpen,
  } = useFinance();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const pageMeta: Record<string, { title: string; subtitle: string; tag: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Net Worth & Wealth Overview',
      tag: 'Overview',
    },
    expenses: {
      title: 'Transactions',
      subtitle: 'Expense, Income & Transfer Logs',
      tag: 'Cash Flow',
    },
    budgeting: {
      title: 'Budgeting & Spending Limits',
      subtitle: 'Monthly Category Ceilings & Live Runway Tracking',
      tag: 'Controls',
    },
    accounts: {
      title: 'Accounts & Wallets',
      subtitle: 'Bank Accounts, Cash & E-Wallets',
      tag: 'Liquidity',
    },
    investments: {
      title: 'Portfolio & Assets',
      subtitle: 'Crypto, Stocks, RDPU & Precious Metals',
      tag: 'Investments',
    },
    stats: {
      title: 'Analytics & Reports',
      subtitle: 'Cash Flow Distribution & Asset Allocation',
      tag: 'Insights',
    },
    admin: {
      title: 'Admin Console',
      subtitle: 'Manage Users, davinwijaya16@gmail.com Access & System Settings',
      tag: 'Management',
    },
  };

  const currentMeta = pageMeta[activeTab] || pageMeta.dashboard;

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#080a0f]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#1a1f2c] h-13 flex items-center px-3 sm:px-5 lg:px-6 transition-colors">
      <div className="flex items-center justify-between w-full">
        {/* Left: Mobile Menu Trigger + Clean Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-[#121622] border border-slate-200 dark:border-[#1e2535] transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0 flex items-center gap-2">
            <h1 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">
              {currentMeta.title}
            </h1>
            <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden md:inline-block text-xs text-slate-500 dark:text-zinc-400 truncate">
              {currentMeta.subtitle}
            </span>
          </div>
        </div>

        {/* Right Action Suite: Theme + Privacy + Cloud + Quick Action + Profile */}
        <div className="flex items-center gap-2">
          {/* Google Sheets Sync Button */}
          <button
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            title="Google Sheets Sync & Cloud Backup"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
            aria-label="Google Sheets Sync"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Google Sheets</span>
          </button>

          {/* Theme Switcher Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#1d2433] bg-white dark:bg-[#10141e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle Theme Mode"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Privacy Shield Toggle */}
          <button
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? 'Privacy Mode Active: All sensitive currency values blurred with CSS filter. Click to reveal.' : 'Privacy Mode Off: Click to blur sensitive currency values.'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isPrivacyMode
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-white dark:bg-[#10141e] border-slate-200 dark:border-[#1d2433] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-300 dark:hover:border-[#2a3449]'
            }`}
            aria-label="Toggle Privacy Mode"
          >
            {isPrivacyMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
                <span className="hidden sm:inline">Privacy ON</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Privacy</span>
              </>
            )}
          </button>





          {/* User Profile Avatar Popover */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#121622] border border-transparent hover:border-slate-200 dark:hover:border-[#1e2535] transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#161b27] border border-slate-200 dark:border-[#232b3d] flex items-center justify-center text-[10px] font-mono font-bold text-slate-800 dark:text-zinc-300">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 p-1.5 bg-white dark:bg-[#0f131c] border border-slate-200 dark:border-[#1f2637] rounded-xl shadow-2xl z-50 animate-in fade-in space-y-0.5">
                <div className="px-2.5 py-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Account'}</p>
                    {isUserAdmin(user) && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                </div>

                {isUserAdmin(user) && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('admin');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-xl cursor-pointer transition-colors font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>Admin Console</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 font-mono">
                      Manage
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsFirebaseSetupOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="font-semibold">Cloud Sync</span>
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isFirebase
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {isFirebase ? 'Active' : 'Setup'}
                  </span>
                </button>

                <button
                  onClick={() => refreshData()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
                        isLoading ? 'animate-spin text-emerald-500' : ''
                      }`}
                    />
                    <span>Sync Data</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Cloud</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsMobileAppModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10 rounded-xl cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mobile App / APK</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/20 font-mono">
                    Android
                  </span>
                </button>

                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
