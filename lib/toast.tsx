// lib/toast.tsx
// Toast utility functions for showing alerts, info, confirm, etc.

import React from 'react';
import { toast, ToastOptions, Id } from 'react-toastify';

// Default options
const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: 'light',
};

/**
 * Show success toast
 */
export const toastSuccess = (message: string, options?: ToastOptions): Id => {
  return toast.success(message, { ...defaultOptions, ...options });
};

/**
 * Show error toast
 */
export const toastError = (message: string, options?: ToastOptions): Id => {
  return toast.error(message, { ...defaultOptions, autoClose: 5000, ...options });
};

/**
 * Show info toast
 */
export const toastInfo = (message: string, options?: ToastOptions): Id => {
  return toast.info(message, { ...defaultOptions, ...options });
};

/**
 * Show warning toast
 */
export const toastWarning = (message: string, options?: ToastOptions): Id => {
  return toast.warning(message, { ...defaultOptions, ...options });
};

/**
 * Show loading toast (returns toastId for dismissing)
 */
export const toastLoading = (message: string, options?: ToastOptions): Id => {
  return toast.loading(message, { ...defaultOptions, autoClose: false, ...options });
};

/**
 * Dismiss a specific toast
 */
export const toastDismiss = (toastId?: Id) => {
  toast.dismiss(toastId);
};

/**
 * Show promise toast (for async operations)
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  {
    pending,
    success,
    error,
  }: {
    pending: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
): Promise<T> => {
  return toast.promise(
    promise,
    {
      pending,
      success,
      error,
    } as any,
    defaultOptions
  ) as Promise<T>;
};

export interface ToastConfirmOptions {
  /** Optional bold heading shown above the message */
  title?: string;
  /** Confirm button label (default: "ยืนยัน") */
  confirmLabel?: string;
  /** Cancel button label (default: "ยกเลิก") */
  cancelLabel?: string;
  /** Style the confirm button as a destructive action (red). Default true. */
  danger?: boolean;
}

/**
 * Confirm dialog rendered as a toast.
 *
 *   const ok = await toastConfirm('ลบรายการนี้?', { danger: true });
 *   if (!ok) return;
 *
 * Resolves `true` when the user clicks confirm, `false` for cancel or any
 * other dismissal (X button, programmatic close, route change). The message
 * body honours `\n` (whiteSpace: pre-line).
 */
export function toastConfirm(
  message: string,
  options: ToastConfirmOptions = {}
): Promise<boolean> {
  const {
    title,
    confirmLabel = 'ยืนยัน',
    cancelLabel = 'ยกเลิก',
    danger = true,
  } = options;

  const confirmBg = danger ? '#ef4444' : '#4f46e5';

  return new Promise<boolean>((resolve) => {
    // Guard so the dismissal path (X button, programmatic dismiss, route
    // change) doesn't double-fire after a user already pressed a button.
    // Without this, the promise would never resolve when the toast is
    // closed by any means other than the two buttons.
    let settled = false;
    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    toast(
      ({ closeToast }) => (
        <div style={{ padding: '0.25rem 0.5rem 0.5rem', fontFamily: 'inherit' }}>
          {title && (
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#111827' }}>
              {title}
            </div>
          )}
          <div
            style={{
              marginBottom: '0.85rem',
              fontSize: '0.875rem',
              color: '#374151',
              whiteSpace: 'pre-line',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                settle(false);
                closeToast?.();
              }}
              style={{
                padding: '0.4rem 0.95rem',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '0.4rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                settle(true);
                closeToast?.();
              }}
              style={{
                padding: '0.4rem 0.95rem',
                background: confirmBg,
                color: 'white',
                border: 'none',
                borderRadius: '0.4rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      {
        ...defaultOptions,
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
        draggable: false,
        style: { width: '320px' },
        onClose: () => settle(false),
      }
    );
  });
}

/**
 * Alert using toast (simple alert replacement)
 */
export const toastAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): Id => {
  switch (type) {
    case 'success':
      return toastSuccess(message);
    case 'error':
      return toastError(message);
    case 'warning':
      return toastWarning(message);
    default:
      return toastInfo(message);
  }
};

