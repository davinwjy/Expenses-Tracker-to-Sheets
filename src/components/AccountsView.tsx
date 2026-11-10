import React from 'react';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Edit2,
  Wallet,
  Landmark,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatIdr, formatMasked } from '../lib/formatters';
import { Account } from '../types';

export const AccountsView: React.FC = () => {
  const {
    accounts,
    isPrivacyMode,
    setIsAddAccountOpen,
    setEditingAccount,
    setIsTransferOpen,
    setTransferInitialMode,
    setIsPayBillOpen,
    setPayBillCard,
  } = useFinance();

  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const paylaterAccounts = accounts.filter((a) => a.type === 'paylater');

  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCashBalance = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCcDebt = creditCards.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalPaylaterDebt = paylaterAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  const totalLiquid = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) +
    cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0) -
    totalCcDebt - totalPaylaterDebt;

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Header & Main CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Accounts & Wallets
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              · {accounts.length} total accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Bank accounts, cash reserves, e-wallets, credit cards, and paylater facilities
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setTransferInitialMode('bank_to_investment');
              setIsTransferOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-indigo-600 dark:text-indigo-300 text-xs font-medium border border-slate-200 dark:border-[#252c40] transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Fund Investment</span>
          </button>

          <button
            onClick={() => {
              setTransferInitialMode('account_to_account');
              setIsTransferOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#131722] hover:bg-slate-50 dark:hover:bg-[#1a2030] text-blue-600 dark:text-blue-300 text-xs font-medium border border-slate-200 dark:border-[#252c40] transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
            <span>Transfer</span>
          </button>

          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAddAccountOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics by Account Group (3 Cells) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm">
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono uppercase tracking-wider block">
            NET LIQUID CASH
          </span>
          <p className={`text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 font-mono tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalLiquid, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">Assets minus debt liabilities</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <span>BANKS & CASH</span>
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <p className={`text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalBankBalance + totalCashBalance, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">{bankAccounts.length + cashAccounts.length} accounts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <span>CC & PAYLATER DEBT</span>
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <p className={`text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5 ${isPrivacyMode ? 'privacy-blur' : ''}`}>
            {formatMasked(totalCcDebt + totalPaylaterDebt, 'IDR', isPrivacyMode)}
          </p>
          <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">{creditCards.length + paylaterAccounts.length} facility(ies)</span>
        </div>
      </div>

      {/* Credit Cards Section */}
      {creditCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
                CREDIT CARDS & REVOLVING DEBT
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">{creditCards.length} card facility</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {creditCards.map((card) => {
              const accentColor = card.color || '#f59e0b';
              const limit = card.creditLimit || 1;
              const debt = card.balance || 0;
              const available = Math.max(0, limit - debt);
              const utilization = Math.min(100, Math.round((debt / limit) * 100));

              return (
                <div
                  key={card.id}
                  className="relative p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] hover:border-slate-300 dark:hover:border-[#2b354a] transition-all group overflow-hidden shadow-sm"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono">{card.name}</h3>
                          {card.cardNetwork && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              {card.cardNetwork}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                          {card.last4Digits ? `•••• ${card.last4Digits}` : 'CREDIT CARD'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingAccount(card);
                        setIsAddAccountOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
                      title="Edit card parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Hero: Available Credit */}
                  <div className="space-y-0.5 mb-3 font-mono">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE CREDIT</span>
                    <p className={`text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(available, 'IDR', isPrivacyMode)}
                    </p>
                  </div>

                  {/* Sub Details: Used Credit & Total Limit */}
                  <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-lg bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-[#1d2332] font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">USED CREDIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(debt, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">TOTAL LIMIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(limit, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1 mb-3.5 font-mono">
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                      <span>LIMIT: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(limit, 'IDR', isPrivacyMode)}</span></span>
                      <span className={utilization > 70 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}>
                        {utilization}% UTILIZED
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#161a25] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span>Billing: {card.billingDate ? `Day ${card.billingDate}` : '25th'}</span>
                      <span>Due: {card.dueDate ? `Day ${card.dueDate}` : '10th'}</span>
                    </div>
                  </div>

                  {/* Pay Bill Action */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-[#1b212e]">
                    <button
                      onClick={() => {
                        setPayBillCard(card);
                        setIsPayBillOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs border border-amber-500/30 transition-colors cursor-pointer font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                      <span>PAY BILL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PayLater Section */}
      {paylaterAccounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
                PAYLATER FACILITIES & DEBT
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">{paylaterAccounts.length} facility(ies)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paylaterAccounts.map((pl) => {
              const accentColor = pl.color || '#a855f7';
              const limit = pl.creditLimit || 1;
              const debt = pl.balance || 0;
              const available = Math.max(0, limit - debt);
              const utilization = Math.min(100, Math.round((debt / limit) * 100));

              return (
                <div
                  key={pl.id}
                  className="relative p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] hover:border-slate-300 dark:hover:border-[#2b354a] transition-all group overflow-hidden shadow-sm"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: accentColor }}
                  />

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                      >
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono">{pl.name}</h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                            PAYLATER
                          </span>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                          {pl.last4Digits ? `•••• ${pl.last4Digits}` : 'PAYLATER ACCOUNT'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingAccount(pl);
                        setIsAddAccountOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
                      title="Edit paylater parameters"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Hero: Available Credit */}
                  <div className="space-y-0.5 mb-3 font-mono">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE CREDIT</span>
                    <p className={`text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                      {formatMasked(available, 'IDR', isPrivacyMode)}
                    </p>
                  </div>

                  {/* Sub Details: Used Credit & Total Limit */}
                  <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-lg bg-slate-50 dark:bg-[#080a0f] border border-slate-200/80 dark:border-[#1d2332] font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">USED CREDIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(debt, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase block">TOTAL LIMIT</span>
                      <p className={`text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                        {formatMasked(limit, 'IDR', isPrivacyMode)}
                      </p>
                    </div>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="space-y-1 mb-3.5 font-mono">
                    <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-400">
                      <span>LIMIT: <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMasked(limit, 'IDR', isPrivacyMode)}</span></span>
                      <span className={utilization > 70 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-zinc-300'}>
                        {utilization}% UTILIZED
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#161a25] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          utilization > 70 ? 'bg-rose-500' : utilization > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      <span>Billing: {pl.billingDate ? `Day ${pl.billingDate}` : '25th'}</span>
                      <span>Due: {pl.dueDate ? `Day ${pl.dueDate}` : '10th'}</span>
                    </div>
                  </div>

                  {/* Pay Bill Action */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-[#1b212e]">
                    <button
                      onClick={() => {
                        setPayBillCard(pl);
                        setIsPayBillOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-mono text-xs border border-purple-500/30 transition-colors cursor-pointer font-bold"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                      <span>PAY BILL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bank & Cash Accounts Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-800 dark:text-zinc-200 uppercase">
              LIQUID LEDGERS (BANKS & CASH)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-500">
            {bankAccounts.length + cashAccounts.length} account(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...bankAccounts, ...cashAccounts].map((acc) => {
            const accentColor = acc.color || '#3b82f6';

            return (
              <div
                key={acc.id}
                className="relative p-4 rounded-xl bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b212e] hover:border-slate-300 dark:hover:border-[#2b354a] transition-all group overflow-hidden shadow-sm"
              >
                <div
                  className="absolute top-0 inset-x-0 h-1"
                  style={{ backgroundColor: accentColor }}
                />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                    >
                      {acc.type === 'bank' && <Landmark className="w-4 h-4" />}
                      {acc.type === 'cash' && <Coins className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight font-mono">{acc.name}</h3>
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                        {acc.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingAccount(acc);
                      setIsAddAccountOpen(true);
                    }}
                    className="p-1 rounded text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
                    title="Edit account"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5 mb-4 font-mono">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase block">AVAILABLE BALANCE</span>
                  <p className={`text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-100 tabular-nums ${isPrivacyMode ? 'privacy-blur' : ''}`}>
                    {formatMasked(acc.balance, 'IDR', isPrivacyMode)}
                  </p>
                  {acc.accountNumber && (
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 tabular-nums">{acc.accountNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-2.5 border-t border-slate-100 dark:border-[#1b212e]">
                  <button
                    onClick={() => {
                      setTransferInitialMode('account_to_account');
                      setIsTransferOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#10141e] hover:bg-slate-100 dark:hover:bg-[#161c29] text-slate-700 dark:text-zinc-300 font-mono text-xs border border-slate-200 dark:border-[#1d2332] transition-colors cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    <span>TRANSFER</span>
                  </button>

                  <button
                    onClick={() => {
                      setTransferInitialMode('bank_to_investment');
                      setIsTransferOpen(true);
                    }}
                    className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-[#10141e] hover:bg-slate-100 dark:hover:bg-[#161c29] text-slate-700 dark:text-zinc-300 font-mono text-xs border border-slate-200 dark:border-[#1d2332] transition-colors cursor-pointer"
                  >
                    <TrendingUp className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    <span>FUND INVEST</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
