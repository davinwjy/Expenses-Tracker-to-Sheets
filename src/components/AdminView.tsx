import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Users,
  Server,
  Receipt,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  Megaphone,
  Activity,
  ArrowRight,
  TrendingUp,
  WalletCards,
  Coins,
  Lock,
  ArrowLeft,
  Sliders,
  DollarSign,
  Radio,
  FileSpreadsheet,
  Building2,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { isUserAdmin } from '../lib/admin';
import { api } from '../lib/api';
import { formatIdr, formatUsd } from '../lib/formatters';
import { AdminOverviewStats, AdminUserListItem, SystemSettings, SystemAnnouncement } from '../types';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { setActiveTab, usdIdrRate, refreshAnnouncement } = useFinance();

  const isAdmin = isUserAdmin(user);

  // Sub-tab selection: 'overview' | 'users' | 'transactions' | 'settings'
  const [subTab, setSubTab] = useState<'overview' | 'users' | 'transactions' | 'settings'>('overview');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Data states
  const [overview, setOverview] = useState<AdminOverviewStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUserListItem[]>([]);
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // User management search & modal states
  const [userSearch, setUserSearch] = useState('');
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [userToDelete, setUserToDelete] = useState<AdminUserListItem | null>(null);

  // Settings form states
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);

  // Filter for transactions audit log
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all');
  const [txSearch, setTxSearch] = useState('');

  // Fetch all admin data
  const loadAdminData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [ovRes, uRes, txRes, setRes] = await Promise.allSettled([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminTransactions(150),
        api.getAdminSystemSettings(),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (uRes.status === 'fulfilled') setUsersList(uRes.value.users || []);
      if (txRes.status === 'fulfilled') setTransactionsList(txRes.value.transactions || []);
      if (setRes.status === 'fulfilled') {
        const s = setRes.value.settings;
        setSystemSettings(s);
        setAnnouncementMsg(s?.announcement?.message || '');
        setAnnouncementType(s?.announcement?.type || 'info');
        setAnnouncementEnabled(s?.announcement?.enabled || false);
        setMaintenanceMode(s?.maintenanceMode || false);
        setAllowRegistration(s?.allowNewRegistrations !== false);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // User role toggle (Admin / User)
  const handleToggleUserRole = async (targetUser: AdminUserListItem) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await api.setAdminUserRole(targetUser.id, nextRole);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
      );
      showStatus(`User ${targetUser.email} role updated to ${nextRole.toUpperCase()}`);
      loadAdminData(true);
    } catch (err: any) {
      showStatus(err.message || 'Failed to update user role', 'error');
    }
  };

  // Add new admin email directly
  const handleAddAdminEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAdminEmailInput.trim()) return;

    const emailToAdd = newAdminEmailInput.trim().toLowerCase();
    try {
      const res = await api.addAdminEmail(emailToAdd);
      showStatus(`Admin privilege granted to ${emailToAdd}`);
      setNewAdminEmailInput('');
      if (systemSettings) {
        setSystemSettings({
          ...systemSettings,
          adminEmails: res.adminEmails || [...systemSettings.adminEmails, emailToAdd],
        });
      }
      loadAdminData(true);
    } catch (err: any) {
      showStatus(err.message || 'Failed to add admin email', 'error');
    }
  };

  // Remove admin email
  const handleRemoveAdminEmail = async (email: string) => {
    if (email === 'davinwijaya16@gmail.com') {
      showStatus('Cannot remove primary master super admin davinwijaya16@gmail.com', 'error');
      return;
    }

    try {
      const res = await api.removeAdminEmail(email);
      showStatus(`Admin privilege removed for ${email}`);
      if (systemSettings) {
        setSystemSettings({
          ...systemSettings,
          adminEmails: res.adminEmails || systemSettings.adminEmails.filter((e) => e !== email),
        });
      }
      loadAdminData(true);
    } catch (err: any) {
      showStatus(err.message || 'Failed to remove admin email', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteAdminUser(userToDelete.id);
      showStatus(`User ${userToDelete.email} and all data deleted`);
      setUsersList((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      loadAdminData(true);
    } catch (err: any) {
      showStatus(err.message || 'Failed to delete user', 'error');
    }
  };

  // Save Announcement Settings
  const handleSaveAnnouncement = async () => {
    try {
      const updated = await api.updateAdminSystemSettings({
        announcement: {
          id: systemSettings?.announcement?.id || 'ann_' + Date.now(),
          message: announcementMsg,
          type: announcementType,
          enabled: announcementEnabled,
          updatedAt: new Date().toISOString(),
        },
        maintenanceMode,
        allowNewRegistrations: allowRegistration,
      });

      if (updated.settings) {
        setSystemSettings(updated.settings);
      }
      await refreshAnnouncement();
      showStatus('Site announcement and configuration updated live!');
    } catch (err: any) {
      showStatus(err.message || 'Failed to update system settings', 'error');
    }
  };

  // Export full DB backup
  const handleExportDB = async () => {
    try {
      const dump = await api.exportDatabase();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dump, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `wealthtrack-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatus('System database exported successfully');
    } catch (err) {
      showStatus('Failed to export database', 'error');
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearch) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  // Filtered audit transactions
  const filteredTransactions = useMemo(() => {
    return transactionsList.filter((tx) => {
      const matchType = txTypeFilter === 'all' || tx.type === txTypeFilter;
      const matchSearch =
        !txSearch ||
        (tx.category && tx.category.toLowerCase().includes(txSearch.toLowerCase())) ||
        (tx.notes && tx.notes.toLowerCase().includes(txSearch.toLowerCase())) ||
        (tx.userEmail && tx.userEmail.toLowerCase().includes(txSearch.toLowerCase())) ||
        (tx.userName && tx.userName.toLowerCase().includes(txSearch.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [transactionsList, txTypeFilter, txSearch]);

  // If user is not authorized as Admin
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/30 rounded-3xl p-8 text-center shadow-lg dark:shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Restricted Administrator Area</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
            Access to the Admin Panel is restricted to authorized Administrators.
            Primary admin privileges are assigned to <span className="font-semibold text-emerald-600 dark:text-emerald-400">davinwijaya16@gmail.com</span>.
          </p>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl mb-6 text-xs text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Your Current Email:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email || 'Not signed in'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Admin Whitelist:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">davinwijaya16@gmail.com</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs border border-slate-300 dark:border-transparent transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Main Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold border animate-in slide-in-from-top-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ADMIN HEADER BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-[#0e1726] border border-slate-200 dark:border-slate-800/90 shadow-md dark:shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Admin Management Console
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                Super Admin Access
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              WealthTrack management console to control user accounts, admin access rights (primary{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">davinwijaya16@gmail.com</span>),
              global announcements, and real-time transaction audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadAdminData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700/60 shadow-sm transition-colors cursor-pointer"
              title="Refresh admin statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              onClick={handleExportDB}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700/60 shadow-sm transition-colors cursor-pointer"
              title="Download backup JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Backup DB</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>User View</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'overview'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Overview & Health</span>
          </button>

          <button
            onClick={() => setSubTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'users'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Access</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('transactions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'transactions'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Audit & Transactions</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono">
              {transactionsList.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              subTab === 'settings'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Site Settings & Broadcast</span>
            {announcementEnabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ---------------- 1. SUB-TAB: OVERVIEW & SYSTEM HEALTH ---------------- */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Registered Users */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.totalUsers ?? usersList.length}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {overview?.adminCount || systemSettings?.adminEmails.length || 1} Admins
                </span>
                <span>• Active members</span>
              </p>
            </div>

            {/* Card 2: Total Accounts Managed */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Banks & Cash Accounts</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <WalletCards className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.totalAccounts ?? 0}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Liquid banking & cash accounts across all users
              </p>
            </div>

            {/* Card 3: Total Transactions Recorded */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Transactions</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {overview?.totalTransactions ?? transactionsList.length}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Volume: {formatIdr(overview?.totalVolumeIdr || 0)}
              </p>
            </div>

            {/* Card 4: Total Wealth Tracked */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tracked Wealth (IDR)</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                {formatIdr(overview?.totalTrackedAssetsIdr || 0)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Combined cash + investment assets
              </p>
            </div>
          </div>

          {/* Infrastructure Health & Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">System Health & Engine Status</h3>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  All Systems Operational
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Database Engine</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {overview?.dbType || 'Express JSON File DB (Persistent)'}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-sync enabled
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">USD/IDR Exchange Engine</div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Live Rate: {formatIdr(usdIdrRate)}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Source: Google Finance & Live Market API
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Server Node Uptime</div>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200">
                    {Math.floor((overview?.uptimeSeconds || 3600) / 60)} minutes uptime
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Vite dev server mounted on port 3000</div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Designated Master Super Admin</div>
                  <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    davinwijaya16@gmail.com
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Permanent super-admin rights granted</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Quick Admin Actions
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setSubTab('users')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 transition-colors">
                        Manage User Accounts
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Add or promote admin emails</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </button>

                <button
                  onClick={() => setSubTab('settings')}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Megaphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400 transition-colors">
                        Broadcast Announcement
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {announcementEnabled ? 'Active on all screens' : 'Banner disabled'}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </button>

                <button
                  onClick={handleExportDB}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
                        Full DB Snapshot (JSON)
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Instant offline safety backup</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 2. SUB-TAB: USER MANAGEMENT ---------------- */}
      {subTab === 'users' && (
        <div className="space-y-6">
          {/* Add Admin Email Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Grant Admin Access to New User
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter an email address to grant instant Administrator privileges.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddAdminEmail} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  placeholder="e.g. davinwijaya16@gmail.com"
                  value={newAdminEmailInput}
                  onChange={(e) => setNewAdminEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Grant Admin Access</span>
              </button>
            </form>

            {/* Current Admin Emails List */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Administrators List ({systemSettings?.adminEmails.length || 2}):
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {(systemSettings?.adminEmails || ['davinwijaya16@gmail.com', 'davinwijaya1996@gmail.com']).map((email) => {
                  const isMaster = email.toLowerCase() === 'davinwijaya16@gmail.com';
                  return (
                    <div
                      key={email}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border ${
                        isMaster
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{email}</span>
                      {isMaster ? (
                        <span className="text-[10px] px-1 bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 rounded">
                          Master
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminEmail(email)}
                          className="hover:text-rose-500 p-0.5 text-slate-400 transition-colors cursor-pointer"
                          title="Remove admin privilege"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User List Header & Search */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">All Registered Users ({usersList.length})</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  View registered user accounts, managed ledgers, transaction counts, and role assignments.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user (name / email)..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                    <th className="pb-3 pl-2">User / Name</th>
                    <th className="pb-3">Email Address</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Accounts</th>
                    <th className="pb-3">Transactions</th>
                    <th className="pb-3">Tracked Net Worth</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No users match the current search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isTargetMaster = u.email.toLowerCase() === 'davinwijaya16@gmail.com';
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-800 dark:text-white shrink-0">
                                {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                                {u.name || 'Member'}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 font-mono text-slate-700 dark:text-slate-300">{u.email}</td>

                          <td className="py-3">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                                <Shield className="w-3 h-3" />
                                {isTargetMaster ? 'SUPER ADMIN' : 'ADMIN'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium border border-slate-200 dark:border-transparent">
                                Member
                              </span>
                            )}
                          </td>

                          <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                            {u.accountsCount ?? 0} acc
                          </td>

                          <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                            {u.transactionsCount ?? 0} txs
                          </td>

                          <td className="py-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatIdr(u.totalNetWorthIdr || 0)}
                          </td>

                          <td className="py-3 pr-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Role Button */}
                              <button
                                onClick={() => handleToggleUserRole(u)}
                                disabled={isTargetMaster}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                  u.role === 'admin'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-50'
                                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                                }`}
                                title={
                                  isTargetMaster
                                    ? 'Master admin cannot be demoted'
                                    : u.role === 'admin'
                                    ? 'Demote to regular user'
                                    : 'Promote to administrator'
                                }
                              >
                                {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setUserToDelete(u)}
                                disabled={isTargetMaster || u.id === user?.id}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  isTargetMaster
                                    ? 'Master admin cannot be deleted'
                                    : u.id === user?.id
                                    ? 'Cannot delete your own active account'
                                    : 'Delete user account'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. SUB-TAB: GLOBAL AUDIT & TRANSACTIONS ---------------- */}
      {subTab === 'transactions' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                Global Transaction Audit Log ({transactionsList.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time transaction audit trail across all expenses, incomes, and transfers for all registered users.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
                <option value="bank_to_investment">Investment</option>
              </select>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search transactions or users..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Funding Account</th>
                  <th className="pb-3">Notes</th>
                  <th className="pb-3 pr-2 text-right">Amount (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No transactions match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 pl-2 font-mono text-slate-500 dark:text-slate-400 text-[11px]">{tx.date}</td>
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.userName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{tx.userEmail}</div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            tx.type === 'expense'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : tx.type === 'income'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : tx.type === 'transfer'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">{tx.category}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">{tx.accountName || 'Account'}</td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">{tx.notes || '—'}</td>
                      <td className="py-2.5 pr-2 text-right font-mono font-bold">
                        <span
                          className={
                            tx.type === 'expense'
                              ? 'text-rose-600 dark:text-rose-400'
                              : tx.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }
                        >
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatIdr(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- 4. SUB-TAB: SITE SETTINGS & ANNOUNCEMENTS ---------------- */}
      {subTab === 'settings' && (
        <div className="space-y-6">
          {/* Global Announcement Banner Configuration */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Website Announcement Banner (Site-wide)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Display a top notification banner across all user sessions and views.
                </p>
              </div>

              {/* Enable / Disable Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {announcementEnabled ? 'Banner Active' : 'Banner Inactive'}
                </span>
                <input
                  type="checkbox"
                  checked={announcementEnabled}
                  onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors p-1 ${
                    announcementEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      announcementEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Input Message */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Announcement Message:
              </label>
              <textarea
                rows={2}
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder="Example: Scheduled system maintenance on Sunday at 02:00 AM. Your data remains completely safe!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Banner Type Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Banner Style & Color Scheme:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'info', label: 'Info (Blue)', bg: 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300' },
                  { id: 'warning', label: 'Warning (Yellow)', bg: 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300' },
                  { id: 'success', label: 'Success (Green)', bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300' },
                  { id: 'alert', label: 'Urgent Alert (Red)', bg: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAnnouncementType(item.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      announcementType === item.id
                        ? `${item.bg} ring-2 ring-emerald-500`
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            {announcementEnabled && announcementMsg && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Live Banner Preview:
                </span>
                <div
                  className={`mt-1.5 p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    announcementType === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                      : announcementType === 'alert'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                      : announcementType === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span>{announcementMsg}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveAnnouncement}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save & Publish Announcement</span>
            </button>
          </div>

          {/* System Control Policies */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              Access Policies & Maintenance Mode
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Allow Public User Registrations</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    When disabled, only existing registered accounts can log in.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Maintenance Mode Indicator</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Display a maintenance notice indicator to active users.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleSaveAnnouncement}
              className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs border border-slate-300 dark:border-slate-700 shadow-sm transition-colors cursor-pointer"
            >
              Save System Policies
            </button>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm User Deletion</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Are you sure you want to permanently delete user{' '}
                <span className="font-semibold text-rose-600 dark:text-rose-400">{userToDelete.email}</span>?
              </p>
              <p className="text-[11px] text-slate-500 pt-1">
                All bank accounts, transactions, and investment holdings associated with this user will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
