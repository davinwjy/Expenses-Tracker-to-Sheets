import React, { useState } from 'react';
import {
  Wallet,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
  Flame,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FirebaseSetupModal } from './Modals/FirebaseSetupModal';

export const AuthModal: React.FC = () => {
  const { login, register, quickDemoLogin, resetPassword, isFirebase } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setShowResetPrompt(false);
    setShowRegisterPrompt(false);

    if (!email || !password) {
      setError('Mohon isi email dan password Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      console.warn('Authentication error:', err);
      const msg = err?.message || '';
      const code = err?.code || '';

      if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
        setError(`Akun "${email}" belum terdaftar di database.`);
        setShowRegisterPrompt(true);
      } else if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password')
      ) {
        setError('Password salah atau akun belum dibuat. Periksa password atau reset jika lupa.');
        setShowResetPrompt(true);
        setShowRegisterPrompt(true);
      } else if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
        setError(`Email "${email}" sudah terdaftar. Silakan login atau gunakan reset password.`);
        setShowResetPrompt(true);
      } else if (code === 'auth/weak-password' || msg.includes('weak-password')) {
        setError('Password terlalu lemah. Minimal 6 karakter.');
      } else if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
        setError('Terlalu banyak percobaan gagal. Akses dibatasi sementara demi keamanan. Silakan reset password.');
        setShowResetPrompt(true);
      } else {
        setError(msg || 'Gagal melakukan autentikasi. Silakan periksa kredensial Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetPassword = async () => {
    if (!email) {
      setError('Silakan ketik alamat email Anda pada kolom di bawah.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMsg(`Link reset password telah dikirim ke ${email}. Buka inbox Gmail Anda untuk mengatur ulang password.`);
      setShowResetPrompt(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim link reset password. Pastikan email benar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await quickDemoLogin();
    } catch (err: any) {
      setError(err?.message || 'Failed to start demo session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#08090c] relative overflow-hidden font-mono">
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14182415_1px,transparent_1px),linear-gradient(to_bottom,#14182415_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d1017] border border-[#1b212e] rounded shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
        {/* Command Strip Brand Header */}
        <div className="p-5 text-center border-b border-[#1b212e] bg-[#080a0f]">
          <div className="inline-flex w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-2.5">
            <Wallet className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-zinc-100 tracking-wider uppercase">
            WEALTHTRACK TERMINAL
          </h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Multi-Asset Portfolio & Liquidity Ledger System
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>CLOUD AUTH & REAL-TIME REPLICATION</span>
          </div>
        </div>

        {/* Tab switch (2 Tabs: Sign In | Register) */}
        <div className="p-5">
          <div className="grid grid-cols-2 p-0.5 bg-[#080a0f] rounded border border-[#1d2332] text-xs font-semibold mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccessMsg('');
                setShowResetPrompt(false);
                setShowRegisterPrompt(false);
              }}
              className={`py-1.5 rounded transition-all cursor-pointer ${
                mode === 'login' ? 'bg-[#1b212e] text-emerald-400 border border-[#2a3449] font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccessMsg('');
                setShowResetPrompt(false);
                setShowRegisterPrompt(false);
              }}
              className={`py-1.5 rounded transition-all cursor-pointer ${
                mode === 'register' ? 'bg-[#1b212e] text-emerald-400 border border-[#2a3449] font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Cloud sync benefit badge */}
          <div className="mb-3.5 p-2 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="text-[10px] text-emerald-300 leading-tight">
              Tersinkronisasi otomatis via Cloud di PC, Laptop, dan HP secara instan.
            </span>
          </div>

          {error && (
            <div className="p-3 mb-3.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>

              {(showResetPrompt || showRegisterPrompt) && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-rose-500/20">
                  {showResetPrompt && (
                    <button
                      type="button"
                      onClick={handleSendResetPassword}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Kirim Link Reset Password</span>
                    </button>
                  )}
                  {showRegisterPrompt && mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError('');
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Daftar Akun Baru Sekarang</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 mb-3.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  FULL NAME
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Davin Wijaya"
                    className="w-full bg-[#080a0f] border border-[#1d2332] focus:border-emerald-500 rounded pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                EMAIL IDENTIFIER
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#080a0f] border border-[#1d2332] focus:border-emerald-500 rounded pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  ACCESS KEY / PASSWORD
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleSendResetPassword}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080a0f] border border-[#1d2332] focus:border-emerald-500 rounded pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50 mt-1 uppercase"
            >
              <span>
                {isSubmitting
                  ? 'AUTHENTICATING...'
                  : mode === 'login'
                  ? 'AUTHORIZE TERMINAL SESSION'
                  : 'REGISTER ACCOUNT'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-4 pt-3.5 border-t border-[#1b212e] space-y-1.5">
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded bg-[#080a0f] hover:bg-[#161a25] border border-[#1d2332] text-xs font-semibold text-emerald-400 transition-all cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>EXPLORE INSTANT DEMO ACCOUNT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('davinwijaya16@gmail.com');
                setPassword('password123');
                if (mode === 'register') {
                  setName('Davin Wijaya');
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded bg-[#080a0f] hover:bg-[#161a25] border border-[#1d2332] text-[10px] text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>PRE-FILL: davinwijaya16@gmail.com</span>
            </button>

            {/* Direct Firebase setup link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsFirebaseModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
              >
                <Flame className="w-3 h-3" />
                <span>{isFirebase ? '🔥 Firebase Cloud Sync Active' : '🔥 Hubungkan ke Firebase (Sinkron Real-Time)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <FirebaseSetupModal isOpen={isFirebaseModalOpen} onClose={() => setIsFirebaseModalOpen(false)} />
    </div>
  );
};
