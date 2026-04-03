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

/**
 * Confirm dialog using toast (custom implementation)
 * Note: This is a simple implementation. For complex confirm dialogs, consider using a modal library.
 */
export const toastConfirm = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  const toastId = toast(
    ({ closeToast }) => (
      <div style={{ padding: '0.5rem' }}>
        <div style={{ marginBottom: '1rem', fontWeight: '500' }}>{message}</div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              onConfirm();
              closeToast();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            ยืนยัน
          </button>
          <button
            onClick={() => {
              if (onCancel) onCancel();
              closeToast();
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            ยกเลิก
          </button>
        </div>
      </div>
    ),
    {
      ...defaultOptions,
      autoClose: false,
      closeOnClick: false,
      closeButton: true,
    }
  );
};

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

