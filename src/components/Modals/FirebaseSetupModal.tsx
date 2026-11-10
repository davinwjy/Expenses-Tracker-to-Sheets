import React, { useState, useEffect } from 'react';
import {
  X,
  Flame,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ShieldCheck,
  CloudUpload,
  Smartphone,
  QrCode,
} from 'lucide-react';
import {
  getStoredFirebaseConfig,
  parseFirebaseConfigInput,
  saveFirebaseConfig,
  removeFirebaseConfig,
  isFirebaseActive,
  generateFirebaseShareUrl,
  FirebaseConfig,
} from '../../lib/firebase';
import { firestoreService } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { refreshData } = useFinance();

  const [inputConfig, setInputConfig] = useState('');
  const [currentConfig, setCurrentConfig] = useState<FirebaseConfig | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migratedCount, setMigratedCount] = useState<number | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentConfig(getStoredFirebaseConfig());
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!inputConfig.trim()) {
      setError('Please paste your Firebase configuration object or JSON');
      return;
    }

    setIsSaving(true);
    try {
      const parsed = parseFirebaseConfigInput(inputConfig);
      saveFirebaseConfig(parsed);
      setCurrentConfig(parsed);
      setSuccess('Firebase configuration saved successfully! Cloud sync is now active.');
      setInputConfig('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse Firebase configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Firebase cloud sync? The app will revert to local offline storage.')) {
      removeFirebaseConfig();
    }
  };

  const handleMigrateData = async () => {
    if (!user) return;
    setIsMigrating(true);
    setError('');
    try {
      const count = await firestoreService.uploadLocalDataToFirestore(user.id);
      setMigratedCount(count);
      setSuccess(`Successfully uploaded ${count} local items to your Firebase cloud database!`);
      await refreshData();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload local data to cloud');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0d1017] border-t sm:border border-slate-200 dark:border-[#1b212e] rounded-t sm:rounded shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#080a0f]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flame className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                  CLOUD REPLICATION (FIREBASE)
                </h3>
                {currentConfig && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ONLINE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Bidirectional real-time replication between mobile & desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Status Card */}
          {currentConfig ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cloud Sync Active!</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Connected to project: <strong className="text-slate-900 dark:text-white font-mono">{currentConfig.projectId}</strong>. Any transactions entered on mobile will instantly sync across all devices in real-time!
              </p>

              {user && (
                <div className="pt-2 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={handleMigrateData}
                    disabled={isMigrating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{isMigrating ? 'Uploading...' : 'Upload Local Offline Data to Cloud'}</span>
                  </button>
                  {migratedCount !== null && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1">
                      &check; {migratedCount} items successfully synchronized to cloud database.
                    </p>
                  )}
                </div>
              )}

              {/* Seamless Mobile Connect Card */}
              <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Connect Mobile Device to Database (Instant Link)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Open this direct link on your mobile browser (or scan QR code). Firebase cloud sync will automatically configure without manual script pasting:
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = generateFirebaseShareUrl(currentConfig);
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedShareLink(true);
                      setTimeout(() => setCopiedShareLink(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-medium text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    {copiedShareLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Copy Link to Mobile</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{showQrCode ? 'Hide QR Code' : 'Scan QR Code with Phone Camera'}</span>
                  </button>
                </div>

                {showQrCode && (
                  <div className="p-3 bg-white rounded-xl flex flex-col items-center justify-center gap-2 w-fit mx-auto mt-2 shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        generateFirebaseShareUrl(currentConfig)
                      )}`}
                      alt="Scan with mobile camera to connect Firebase"
                      className="w-40 h-40"
                    />
                    <p className="text-[10px] text-slate-800 font-semibold text-center">
                      Point your mobile camera at this QR code to connect instantly
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Step by Step Guide in English */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>3-Step Firebase Setup Guide (100% Free)</span>
                  </h4>
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    <span>Open Firebase Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                  <li>
                    <strong>Create Free Project</strong>: Go to{' '}
                    <a
                      href="https://console.firebase.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 dark:text-amber-400 underline font-medium"
                    >
                      console.firebase.google.com
                    </a>
                    , click <em>"Add project"</em> and enter a name (e.g. <code>expenses-tracker</code>).
                  </li>
                  <li>
                    <strong>Enable Features (2 Minutes)</strong>:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <li>
                        In left sidebar, select <strong>Build &gt; Authentication</strong> &gt; click <em>Get Started</em> &gt; enable <strong>Email/Password</strong>.
                      </li>
                      <li>
                        In left sidebar, select <strong>Build &gt; Firestore Database</strong> &gt; click <em>Create database</em> &gt; choose <em>Start in test mode</em> &gt; click Create.
                      </li>
                    </ul>
                  </li>
                  <li>
                    <strong>Get Web Config</strong>:
                    <p className="pl-4 pt-0.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      On project overview, click Web icon (<code>&lt;/&gt;</code>) to register web app. Copy the <code>firebaseConfig</code> object shown, then paste it below:
                    </p>
                  </li>
                </ol>
              </div>

              {/* Paste Form */}
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Paste Firebase Config
                  </label>
                  <textarea
                    value={inputConfig}
                    onChange={(e) => setInputConfig(e.target.value)}
                    placeholder={`Sample snippet:\nconst firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "myproject.firebaseapp.com",\n  projectId: "myproject",\n  ...\n};`}
                    rows={6}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none font-mono leading-relaxed"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                    Auto-parsed format: accepts standard JavaScript snippets <code>const firebaseConfig = ...</code> or raw JSON.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-95 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Flame className="w-4 h-4 fill-slate-950" />
                  <span>{isSaving ? 'Connecting...' : 'Save & Enable Real-Time Sync'}</span>
                </button>
              </form>
            </>
          )}

          {/* Security & Free Guarantee Note */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-900 dark:text-white font-semibold text-[11px]">100% Free &amp; Secure</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                Firebase's free tier (Spark Plan) covers up to 50,000 reads and 20,000 writes per day — more than enough for lifetime personal financial tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-100 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
