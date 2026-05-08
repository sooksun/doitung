// app/components/ui/Card.tsx
// Surface card — supports flat/raised/glass elevations and optional interactive hover.

'use client';

import { CSSProperties, forwardRef, HTMLAttributes } from 'react';

type Elevation = 'flat' | 'raised' | 'floating' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: Elevation;
  interactive?: boolean;
  padding?: string;
  /** Optional accent strip on the left edge */
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'none';
}

const elevationMap: Record<Elevation, CSSProperties> = {
  flat: {
    background: 'var(--de-surface)',
    border: '1px solid var(--de-ink-200)',
    boxShadow: 'var(--de-shadow-xs)',
  },
  raised: {
    background: 'var(--de-surface)',
    border: '1px solid var(--de-ink-100)',
    boxShadow: 'var(--de-shadow-md)',
  },
  floating: {
    background: 'var(--de-surface)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: 'var(--de-shadow-xl)',
  },
  glass: {
    background: 'var(--de-surface-glass)',
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: 'var(--de-shadow-lg)',
  },
};

const accentColor = {
  brand: 'var(--de-brand-600)',
  success: 'var(--de-success-500)',
  warning: 'var(--de-warning-500)',
  danger: 'var(--de-danger-500)',
  info: 'var(--de-info-500)',
  none: 'transparent',
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    elevation = 'raised',
    interactive = false,
    padding = 'var(--de-space-6)',
    accent = 'none',
    style,
    children,
    onMouseEnter,
    onMouseLeave,
    ...rest
  },
  ref,
) {
  const baseStyle: CSSProperties = {
    position: 'relative',
    borderRadius: 'var(--de-radius-xl)',
    padding,
    transition:
      'transform var(--de-duration-base) var(--de-ease-out), box-shadow var(--de-duration-base) var(--de-ease-out)',
    cursor: interactive ? 'pointer' : 'default',
    overflow: 'hidden',
    ...elevationMap[elevation],
    ...style,
  };

  return (
    <div
      ref={ref}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (interactive) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = 'var(--de-shadow-xl)';
        }
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (interactive) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow =
            elevation === 'glass'
              ? 'var(--de-shadow-lg)'
              : elevation === 'floating'
              ? 'var(--de-shadow-xl)'
              : elevation === 'raised'
              ? 'var(--de-shadow-md)'
              : 'var(--de-shadow-xs)';
        }
        onMouseLeave?.(e);
      }}
      {...rest}
    >
      {accent !== 'none' && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            right: 'auto',
            width: '4px',
            background: accentColor[accent],
          }}
        />
      )}
      {children}
    </div>
  );
});

export default Card;
