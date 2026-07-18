// ---------------------------------------------------------------------------
// App-wide dialog system replacing native confirm()/alert() popups.
// Promise-based: `if (await confirmDialog({...}))` reads like the native call.
// One dialog at a time; Escape / backdrop click cancels.
// ---------------------------------------------------------------------------
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
}

interface DialogState extends ConfirmOptions {
  mode: 'confirm' | 'alert';
}

interface DialogContextValue {
  confirmDialog: (opts: ConfirmOptions | string) => Promise<boolean>;
  alertDialog: (message: string, title?: string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((ok: boolean) => {
    setDialog(null);
    resolveRef.current?.(ok);
    resolveRef.current = null;
  }, []);

  const confirmDialog = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const o = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => {
      resolveRef.current?.(false); // cancel any dialog already open
      resolveRef.current = resolve;
      setDialog({ mode: 'confirm', danger: true, ...o });
    });
  }, []);

  const alertDialog = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = () => resolve();
      setDialog({ mode: 'alert', message, title });
    });
  }, []);

  // Escape cancels; focus the primary button when a dialog opens.
  useEffect(() => {
    if (!dialog) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <DialogContext.Provider value={{ confirmDialog, alertDialog }}>
      {children}
      {dialog && (
        <div className="dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div className="dialog-card" role="dialog" aria-modal="true">
            <h2 className="dialog-title">
              {dialog.title ?? (dialog.mode === 'confirm' ? 'Are you sure?' : 'Notice')}
            </h2>
            <p className="dialog-message">{dialog.message}</p>
            <div className="dialog-actions">
              {dialog.mode === 'confirm' && (
                <button className="btn" onClick={() => close(false)}>
                  {dialog.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                className={`btn ${dialog.mode === 'alert' ? 'primary' : dialog.danger ? 'danger' : 'primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel ?? (dialog.mode === 'alert' ? 'OK' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}
