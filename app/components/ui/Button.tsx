// app/components/ui/Button.tsx
'use client';

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    'de-btn',
    `de-btn--${variant}`,
    `de-btn--${size}`,
    fullWidth ? 'de-btn--block' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="de-btn__spinner" aria-hidden="true" />}
      {!loading && leftIcon && (
        <span className="de-btn__icon" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      {children != null && <span className="de-btn__label">{children}</span>}
      {!loading && rightIcon && (
        <span className="de-btn__icon" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});
