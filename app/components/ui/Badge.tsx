// app/components/ui/Badge.tsx
// Status pill — subtle filled style; works for KPI labels, traffic light tags, etc.

'use client';

import { CSSProperties, HTMLAttributes, ReactNode } from 'react';

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type Variant = 'soft' | 'solid' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  dot?: boolean;
  icon?: ReactNode;
}

const palette: Record<Tone, { fg: string; bg: string; border: string; solidBg: string; solidFg: string }> = {
  brand: {
    fg: 'var(--de-brand-700)',
    bg: 'var(--de-brand-50)',
    border: 'var(--de-brand-200)',
    solidBg: 'var(--de-brand-600)',
    solidFg: '#fff',
  },
  success: {
    fg: '#047857',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    solidBg: 'var(--de-success-500)',
    solidFg: '#fff',
  },
  warning: {
    fg: '#92400e',
    bg: '#fffbeb',
    border: '#fde68a',
    solidBg: 'var(--de-warning-500)',
    solidFg: '#fff',
  },
  danger: {
    fg: 'var(--de-danger-600)',
    bg: '#fff1f2',
    border: '#fecdd3',
    solidBg: 'var(--de-danger-500)',
    solidFg: '#fff',
  },
  info: {
    fg: '#0369a1',
    bg: '#f0f9ff',
    border: '#bae6fd',
    solidBg: 'var(--de-info-500)',
    solidFg: '#fff',
  },
  neutral: {
    fg: 'var(--de-ink-700)',
    bg: 'var(--de-ink-100)',
    border: 'var(--de-ink-200)',
    solidBg: 'var(--de-ink-700)',
    solidFg: '#fff',
  },
};

export default function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  icon,
  style,
  children,
  ...rest
}: BadgeProps) {
  const c = palette[tone];

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.25rem 0.625rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    lineHeight: 1.2,
    borderRadius: 'var(--de-radius-pill)',
    fontFamily: 'var(--de-font-sans)',
    letterSpacing: '0.01em',
  };

  const variantStyle: CSSProperties =
    variant === 'solid'
      ? { background: c.solidBg, color: c.solidFg }
      : variant === 'outline'
      ? { background: 'transparent', color: c.fg, border: `1px solid ${c.border}` }
      : { background: c.bg, color: c.fg, border: `1px solid ${c.border}` };

  return (
    <span style={{ ...base, ...variantStyle, ...style }} {...rest}>
      {dot && (
        <span
          aria-hidden
          style={{
            width: '0.45rem',
            height: '0.45rem',
            borderRadius: '50%',
            background: variant === 'solid' ? c.solidFg : c.fg,
            opacity: variant === 'solid' ? 0.85 : 0.9,
          }}
        />
      )}
      {icon}
      {children}
    </span>
  );
}
