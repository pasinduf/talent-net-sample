'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the user clicks the confirm button. May be async — a loading
   *  spinner is shown while the promise is pending. The modal stays open until
   *  the promise settles; call onClose() inside onConfirm when done. */
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when opened (safer default for destructive actions)
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const confirmCls = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400';

  const iconBgCls = variant === 'danger' ? 'bg-red-100' : 'bg-amber-100';
  const iconCls = variant === 'danger' ? 'text-red-600' : 'text-amber-600';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => { if (!loading) onClose(); }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex gap-4">
          {/* Icon */}
          <div className={clsx('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', iconBgCls)}>
            <svg className={clsx('w-5 h-5', iconCls)} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-modal-title"
              className="text-base font-semibold text-gray-900 leading-snug"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={handleConfirm}
            disabled={loading}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 transition-colors flex items-center gap-2',
              confirmCls
            )}
          >
            {loading && (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
}

interface ConfirmState extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * Imperative confirmation hook.
 *
 * @example
 * const { confirmModal, confirm } = useConfirmModal();
 *
 * async function handleDelete(id: string) {
 *   const ok = await confirm({
 *     title: 'Delete dimension?',
 *     description: 'This cannot be undone.',
 *   });
 *   if (!ok) return;
 *   await deleteDimension(id);
 * }
 *
 * return (
 *   <>
 *     {confirmModal}
 *     <button onClick={handleDelete}>Delete</button>
 *   </>
 * );
 */
export function useConfirmModal() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  function handleClose() {
    state?.resolve(false);
    setState(null);
  }

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  const confirmModal = state ? (
    <ConfirmModal
      isOpen
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
    />
  ) : null;

  return { confirm, confirmModal };
}
