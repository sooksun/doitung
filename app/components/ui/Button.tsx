// app/components/ui/Button.tsx
// Brand button primitive — variants & sizes from DE Design v2 tokens.

'use client';

import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const sizeMap: Record<Size, CSSProperties> = {
  sm: { padding: '0.5rem 0.875rem', fontSize: '0.875rem', borderRadius: 'var(--de-radius-md)' },
  md: { padding: '0.75rem 1.125rem', fontSize: '0.95rem', borderRadius: 'var(--de-radius-lg)' },
  lg: { padding: '0.95rem 1.5rem', fontSize: '1rem', borderRadius: 'var(--de-radius-lg)' },
};

const variantMap: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--de-brand-600)',
    color: '#fff',
    boxShadow: 'var(--de-shadow-md)',
  },
  secondary: {
    background: 'var(--de-surface)',
    color: 'var(--de-brand-700)',
    border: '1px solid var(--de-ink-200)',
    boxShadow: 'var(--de-shadow-xs)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--de-ink-700)',
  },
  danger: {
    background: 'var(--de-danger-500)',
    color: '#fff',
    boxShadow: 'var(--de-shadow-md)',
  },
  gradient: {
    background: 'var(--de-gradient-brand)',
    color: '#fff',
    boxShadow: 'var(--de-shadow-lg)',
  },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leftIcon,
    rightIcon,
    loading = false,
    disabled,
    style,
    children,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--de-font-sans)',
    fontWeight: 600,
    lineHeight: 1.2,
    border: 'none',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.55 : 1,
    width: fullWidth ? '100%' : undefined,
    transition:
      'transform var(--de-duration-fast) var(--de-ease-out), background var(--de-duration-base) var(--de-ease-out), box-shadow var(--de-duration-base) var(--de-ease-out), filter var(--de-duration-base) var(--de-ease-out)',
    ...sizeMap[size],
    ...variantMap[variant],
    ...style,
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      style={baseStyle}
      className="de-focus-ring"
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.filter = 'brightness(1.05)';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.filter = 'brightness(1)';
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        onFocus?.(e);
      }}
      onBlur={(e) => {
        onBlur?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          style={{
            width: '1em',
            height: '1em',
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'de-spin 0.7s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
      <style jsx>{`
        @keyframes de-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
});

export default Button;
