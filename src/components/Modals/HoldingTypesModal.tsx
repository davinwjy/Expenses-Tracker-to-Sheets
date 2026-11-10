import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Trash2,
  AlertCircle,
  Check,
  ShieldCheck,
  TrendingUp,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { HoldingType } from '../../types';

const COLOR_OPTIONS: { id: string; label: string; class: string; border: string }[] = [
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-500/15 text-blue-400', border: 'border-blue-500/30' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-500/15 text-purple-400', border: 'border-purple-500/30' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/30' },
  { id: 'teal', label: 'Teal', class: 'bg-teal-500/15 text-teal-400', border: 'border-teal-500/30' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-500/15 text-rose-400', border: 'border-rose-500/30' },
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-500/15 text-indigo-400', border: 'border-indigo-500/30' },
];

export const HoldingTypesModal: React.FC = () => {
  const {
    isHoldingTypesModalOpen,
    setIsHoldingTypesModalOpen,
    holdingTypes,
    addHoldingType,
    updateHoldingType,
    deleteHoldingType,
    investments,
  } = useFinance();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [example, setExample] = useState('');
  const [badgeColor, setBadgeColor] = useState('blue');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isHoldingTypesModalOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setDefaultCurrency('IDR');
    setExample('');
    setBadgeColor('blue');
    setError('');
    setDeletingId(null);
  };

  const handleClose = () => {
    resetForm();
    setSuccess('');
    setIsHoldingTypesModalOpen(false);
  };

  const handleStartEdit = (ht: HoldingType) => {
    setEditingId(ht.id);
    setLabel(ht.label);
    setDefaultCurrency(ht.defaultCurrency);
    setExample(ht.example || '');
    setBadgeColor(ht.badgeColor || (ht.defaultCurrency === 'USD' ? 'purple' : 'blue'));
    setError('');
    setSuccess('');
    setDeletingId(null);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Please enter a holding type name');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateHoldingType(editingId, {
          label: trimmedLabel,
          defaultCurrency,
          example: example.trim() || undefined,
          badgeColor,
        });
        setSuccess(`Holding type "${trimmedLabel}" updated successfully.`);
        resetForm();
      } else {
        await addHoldingType({
          label: trimmedLabel,
          defaultCurrency,
          example: example.trim() || undefined,
          badgeColor,
        });
        setSuccess(`Holding type "${trimmedLabel}" created successfully.`);
        resetForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save holding type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await deleteHoldingType(id);
      setSuccess('Holding type deleted successfully.');
      setDeletingId(null);
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete holding type');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1017] border-t sm:border border-slate-200 dark:border-[#1b212e] rounded-t sm:rounded shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom-5 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 font-mono text-slate-900 dark:text-zinc-100">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0 bg-slate-100 dark:bg-[#080a0f]">
          <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
        </div>

        {/* Command Strip Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-[#1b212e] bg-slate-50 dark:bg-[#080a0f] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs sm:text-sm tracking-wider uppercase">
                MASTER HOLDINGS / ASSET CLASSES
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                Manage holding categories, native currency (IDR / USD) and platform display
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#161a25] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Form: Add or Edit Holding Type */}
          <form onSubmit={handleSubmit} className="p-3.5 rounded bg-slate-50 dark:bg-[#080a0f] border border-slate-200 dark:border-[#1d2332] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#1a1f2c]">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-3 h-3 text-amber-500 dark:text-amber-400" /> : <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                <span className={editingId ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}>
                  {editingId ? `EDIT HOLDING TYPE: ${label || editingId}` : 'ADD NEW HOLDING TYPE'}
                </span>
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>

            {/* Name / Label */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                HOLDING TYPE NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Gold / Metals, SBN Bonds, P2P Lending, Real Estate..."
                className="w-full bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
                required
              />
            </div>

            {/* Base Currency Choice */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                BASE DENOMINATION (CURRENCY) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDefaultCurrency('IDR')}
                  className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    defaultCurrency === 'IDR'
                      ? 'bg-emerald-50 dark:bg-[#1b212e] text-emerald-700 dark:text-emerald-400 border border-emerald-500/50 shadow-xs'
                      : 'bg-white dark:bg-[#0d1017] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-[#1a1f2c]'
                  }`}
                >
                  <span>Rp IDR (Indonesian Rupiah)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultCurrency('USD')}
                  className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    defaultCurrency === 'USD'
                      ? 'bg-indigo-50 dark:bg-[#1b212e] text-indigo-700 dark:text-indigo-400 border border-indigo-500/50 shadow-xs'
                      : 'bg-white dark:bg-[#0d1017] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 border border-slate-200 dark:border-[#1a1f2c]'
                  }`}
                >
                  <span>$ USD (US Dollar)</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">
                Positions in this holding class are natively recorded in {defaultCurrency}.
              </p>
            </div>

            {/* Example / Ticker Notes */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                EXAMPLE ASSETS / PLATFORMS (OPTIONAL)
              </label>
              <input
                type="text"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="e.g. Antam, Pluang Gold, ORI024, Sucor, Gotrade..."
                className="w-full bg-white dark:bg-[#0d1017] border border-slate-200 dark:border-[#1d2332] focus:border-indigo-500 rounded px-3 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none font-mono"
              />
            </div>

            {/* Color Accent */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1">
                BADGE ACCENT COLOR
              </label>
              <div className="flex flex-wrap gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setBadgeColor(c.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${c.class} ${
                      badgeColor === c.id ? `${c.border} ring-1 ring-slate-400 dark:ring-white/30` : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 bg-slate-200 hover:bg-slate-300 dark:bg-[#141923] dark:hover:bg-[#1a2030] border border-slate-300 dark:border-[#202737] transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold cursor-pointer transition-all disabled:opacity-50 ${
                  editingId
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white font-mono'
                }`}
              >
                {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>
                  {isSubmitting
                    ? 'SAVING...'
                    : editingId
                    ? 'SAVE CHANGES'
                    : '+ CREATE HOLDING TYPE'}
                </span>
              </button>
            </div>
          </form>

          {/* List of Existing Holding Types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                REGISTERED HOLDING TYPES ({holdingTypes.length})
              </span>
              <span className="text-[9px] text-slate-500 dark:text-zinc-500 font-mono">IDR & USD</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-[#171b26] rounded border border-slate-200 dark:border-[#1d2332] bg-slate-50 dark:bg-[#080a0f] overflow-hidden">
              {holdingTypes.map((ht) => {
                const isUsd = ht.defaultCurrency === 'USD';
                const taggedCount = investments.filter((i) => i.category === ht.id).length;
                const isBeingEdited = editingId === ht.id;

                return (
                  <div
                    key={ht.id}
                    className={`p-3 flex items-center justify-between gap-2 transition-colors ${
                      isBeingEdited ? 'bg-amber-500/10 dark:bg-[#151a26] border-l-2 border-l-amber-500' : 'hover:bg-slate-100 dark:hover:bg-[#0d1017]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">{ht.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                            isUsd
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {ht.defaultCurrency}
                        </span>
                        {ht.isSystem && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>DEFAULT</span>
                          </span>
                        )}
                      </div>
                      {ht.example && (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 truncate">{ht.example}</p>
                      )}
                      <p className="text-[9px] text-slate-500 dark:text-zinc-600 mt-0.5 flex items-center gap-1 font-mono">
                        <TrendingUp className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-500" />
                        <span>{taggedCount} active asset{taggedCount !== 1 ? 's' : ''} in portfolio</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Edit Button for all holdings */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(ht)}
                        title="Edit holding type"
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          isBeingEdited
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200 dark:hover:bg-[#182030]'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button (Only for custom holdings) */}
                      {!ht.isSystem && (
                        <div>
                          {deletingId === ht.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(ht.id)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                DELETE?
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-1.5 py-1 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white text-[10px] cursor-pointer"
                              >
                                CANCEL
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(ht.id)}
                              title={
                                taggedCount > 0
                                  ? 'Cannot delete while active assets use this category'
                                  : 'Delete holding type'
                              }
                              disabled={taggedCount > 0}
                              className={`p-1.5 rounded transition-colors ${
                                taggedCount > 0
                                  ? 'text-slate-300 dark:text-zinc-700 cursor-not-allowed opacity-40'
                                  : 'text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Command Strip Footer */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#080a0f] border-t border-slate-200 dark:border-[#1b212e] flex items-center justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-200 hover:bg-slate-300 dark:bg-[#131722] dark:hover:bg-[#1a2030] border border-slate-300 dark:border-[#21293a] transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
