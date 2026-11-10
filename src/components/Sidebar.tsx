import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Receipt,
  WalletCards,
  TrendingUp,
  PieChart,
  Plus,
  ArrowRightLeft,
  ArrowDownRight,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Flame,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  X,
  Wallet,
  Sparkles,
  Shield,
  Coins,
  Smartphone,
  Layers,
  Target,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatUsd, formatMasked } from '../lib/formatters';
import { isUserAdmin } from '../lib/admin';

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout, isFirebase } = useAuth();
  const {
    activeTab,
    setActiveTab,
    accounts,
    transactions,
    investments,
    budgets,
    stats,
    usdIdrRate,
    isPrivacyMode,
    togglePrivacyMode,
    theme,
    toggleTheme,
    setIsAddExpenseOpen,
    setTransactionInitialType,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsAddAccountOpen,
    setIsHoldingTypesModalOpen,
    setEditingTransaction,
    setEditingAccount,
    setIsFirebaseSetupOpen,
    setIsMobileAppModalOpen,
  } = useFinance();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
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

  const isAdmin = isUserAdmin(user);

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      description: 'Wealth overview',
    },
    {
      id: 'expenses' as const,
      label: 'Transactions',
      icon: Receipt,
      badge: transactions.length > 0 ? transactions.length : null,
      description: 'Income & expenses',
    },
    {
      id: 'budgeting' as const,
      label: 'Budgeting',
      icon: Target,
      badge: budgets.length > 0 ? budgets.length : null,
      description: 'Limits & tracking',
    },
    {
      id: 'accounts' as const,
      label: 'Accounts',
      icon: WalletCards,
      badge: accounts.length > 0 ? accounts.length : null,
      description: 'Banks & wallets',
    },
    {
      id: 'investments' as const,
      label: 'Portfolio',
      icon: TrendingUp,
      badge: investments.length > 0 ? investments.length : null,
      description: 'Investment assets',
    },
    {
      id: 'stats' as const,
      label: 'Analytics',
      icon: PieChart,
      badge: null,
      description: 'Reports & trends',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin' as const,
            label: 'Admin Panel',
            icon: Shield,
            badge: 'Admin',
            description: 'Site management',
          },
        ]
      : []),
  ];

  const netWorthIdr = stats?.totalNetWorthIdr || 0;
  const netWorthUsd = usdIdrRate > 0 ? netWorthIdr / usdIdrRate : 0;

  const handleSelectNav = (tabId: 'dashboard' | 'expenses' | 'accounts' | 'investments' | 'budgeting' | 'stats' | 'admin') => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#080a0f] border-r border-slate-200 dark:border-[#1a1f2c] text-slate-800 dark:text-zinc-200 select-none">
      {/* 1. BRAND HEADER */}
      <div className="p-3.5 border-b border-slate-200 dark:border-[#1a1f2c] flex items-center justify-between bg-slate-50 dark:bg-[#0b0e14]">
        <button
          onClick={() => handleSelectNav('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
        >
          <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-400 transition-colors shrink-0">
            <Wallet className="w-4 h-4 stroke-[2.5]" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  WealthTrack Pro
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">Personal Finance</p>
            </div>
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-200 rounded hover:bg-slate-200/70 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 2. NET WORTH GLIMPSE CARD (Shown when expanded) */}
      {!isCollapsed && (
        <div className="px-3 py-2.5 border-b border-slate-200 dark:border-[#1a1f2c] bg-slate-50 dark:bg-[#0c0f16]">
          <div className="p-2.5 rounded-xl bg-white dark:bg-[#10141e] border border-slate-200 dark:border-[#1d2332] shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
              <span className="font-medium">Net Worth</span>
              <button
                onClick={togglePrivacyMode}
                className="text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                title={isPrivacyMode ? 'Show values' : 'Hide values'}
              >
                {isPrivacyMode ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className={`font-bold text-base text-slate-900 dark:text-zinc-100 truncate tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              {formatIdr(netWorthIdr)}
            </div>
            <div className={`text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
              ≈ {formatUsd(netWorthUsd)}
            </div>
          </div>
        </div>
      )}

      {/* 3. PRIMARY ACTION BUTTON */}
      <div className="p-2.5 relative" ref={newMenuRef}>
        <button
          onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer ${
            isCollapsed ? 'p-2' : ''
          }`}
          title="Create New Transaction"
        >
          <Plus className="w-4 h-4" />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left text-xs font-medium">New Transaction</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-emerald-200 transition-transform duration-200 ${
                  isNewMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {/* Dropdown Popover */}
        {isNewMenuOpen && (
          <div
            className={`absolute z-50 mt-1.5 bg-white dark:bg-[#0f131c] border border-slate-200 dark:border-[#1f2637] rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100 ${
              isCollapsed ? 'left-16 top-0 w-64' : 'left-2.5 right-2.5 top-12'
            }`}
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-[#1c2231] bg-slate-50 dark:bg-[#0b0e15] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Quick Actions
              </span>
            </div>

            <div className="p-1 space-y-0.5">
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  setEditingTransaction(null);
                  setTransactionInitialType('expense');
                  setIsAddExpenseOpen(true);
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-[#161c29] transition-colors group cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-900 dark:text-zinc-200">Add Expense</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">Deduct from cash or bank</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  setEditingTransaction(null);
                  setTransactionInitialType('income');
                  setIsAddExpenseOpen(true);
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-[#161c29] transition-colors group cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-900 dark:text-zinc-200">Add Income</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">Salary, selling items, bonus</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  setTransferInitialMode('bank_to_investment');
                  setIsTransferOpen(true);
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-[#161c29] transition-colors group cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-200">Bank to Investment</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">Fund existing or new asset</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  setTransferInitialMode('account_to_account');
                  setIsTransferOpen(true);
                  onCloseMobile();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-[#161c29] transition-colors group cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-zinc-200">Account Transfer</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">Transfer between accounts</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MAIN NAVIGATION LINKS */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <div className="px-2 py-1">
          {!isCollapsed && (
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              TERMINAL WORKSPACES
            </span>
          )}
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs transition-all group cursor-pointer border-l-2 rounded-r-lg ${
                isActive
                  ? 'bg-emerald-50 dark:bg-[#121622] text-emerald-900 dark:text-zinc-100 border-emerald-500 font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#0f121a] border-transparent'
              } ${isCollapsed ? 'justify-center px-1.5' : ''}`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={`text-[9px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-[#151924] text-slate-600 dark:text-zinc-500 group-hover:text-slate-900 dark:group-hover:text-zinc-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* 5. FOOTER: USER PROFILE */}
      <div className="p-2.5 border-t border-slate-200 dark:border-[#1a1f2c] bg-slate-50 dark:bg-[#0b0e14] relative" ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={`w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-[#121622] transition-all text-left cursor-pointer group ${
            isCollapsed ? 'justify-center p-1' : ''
          }`}
        >
          <div className="w-7 h-7 rounded bg-slate-200 dark:bg-[#161b27] border border-slate-300 dark:border-[#232b3d] flex items-center justify-center text-[11px] font-mono font-extrabold text-slate-800 dark:text-zinc-300 shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
          </div>

          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate">{user?.name || 'Account'}</p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200 transition-transform ${
                  isUserMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {/* User Popover Menu */}
        {isUserMenuOpen && (
          <div
            className={`absolute z-50 bg-white dark:bg-[#0f131c] border border-slate-200 dark:border-[#1f2637] rounded-xl shadow-2xl p-1.5 w-56 space-y-0.5 animate-in fade-in ${
              isCollapsed ? 'left-16 bottom-2' : 'left-2.5 right-2.5 bottom-14'
            }`}
          >
            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-[#1c2231] text-[11px]">
              <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 truncate">{user?.email}</p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setActiveTab('admin');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg cursor-pointer font-semibold"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Admin Panel</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 px-1 rounded text-emerald-800 dark:text-emerald-300">Manage</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsFirebaseSetupOpen(true);
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Cloud Settings</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{isFirebase ? 'Active' : 'Setup'}</span>
            </button>

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                setIsMobileAppModalOpen(true);
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mobile App / APK</span>
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-1 rounded font-mono">APK</span>
            </button>

            <button
              onClick={() => {
                togglePrivacyMode();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isPrivacyMode ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                )}
                <span>Privacy Mode</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {isPrivacyMode ? 'Masked' : 'Visible'}
              </span>
            </button>

            <button
              onClick={() => {
                toggleTheme();
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">
                {theme}
              </span>
            </button>

            <div className="border-t border-slate-200 dark:border-slate-800 my-1" />

            <button
              onClick={() => {
                setIsUserMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <div className="fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out" style={{ width: isCollapsed ? '4.5rem' : '16rem' }}>
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer (with backdrop) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
