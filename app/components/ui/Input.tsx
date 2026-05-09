// app/components/ui/Input.tsx
// Labelled input with helper text + error state. Forwards ref so forms work.

'use client';

import { CSSProperties, forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerStyle?: CSSProperties;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, leftIcon, rightSlot, containerStyle, id, style, onFocus, onBlur, disabled, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? `de-input-${reactId}`;
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const fieldStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: disabled ? 'var(--de-surface-sunken)' : 'var(--de-surface)',
    border: `1px solid ${
      hasError
        ? 'var(--de-danger-500)'
        : focused
        ? 'var(--de-brand-500)'
        : 'var(--de-ink-200)'
    }`,
    borderRadius: 'var(--de-radius-lg)',
    padding: '0 0.875rem',
    transition:
      'border-color var(--de-duration-base) var(--de-ease-out), box-shadow var(--de-duration-base) var(--de-ease-out), background var(--de-duration-base) var(--de-ease-out)',
    boxShadow: focused && !hasError ? 'var(--de-shadow-glow)' : 'none',
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: '0.75rem 0',
    fontFamily: 'var(--de-font-sans)',
    fontSize: '1rem',
    color: 'var(--de-ink-900)',
    width: '100%',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--de-ink-700)',
          }}
        >
          {label}
        </label>
      )}

      <div style={fieldStyle}>
        {leftIcon && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--de-ink-400)',
              fontSize: '1.05rem',
            }}
          >
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          style={inputStyle}
          aria-invalid={hasError || undefined}
          aria-describedby={
            error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined
          }
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot}
      </div>

      {error ? (
        <span
          id={`${inputId}-error`}
          style={{
            fontSize: '0.8rem',
            color: 'var(--de-danger-600)',
          }}
        >
          {error}
        </span>
      ) : helper ? (
        <span
          id={`${inputId}-helper`}
          style={{ fontSize: '0.8rem', color: 'var(--de-ink-500)' }}
        >
          {helper}
        </span>
      ) : null}
    </div>
  );
});

export default Input;
