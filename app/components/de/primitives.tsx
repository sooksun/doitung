// app/components/de/primitives.tsx
// TSQMn redesign — core inline-styled primitives (atoms).
// Faithful TSX port of the prototype's UI library. All colors via --de-* tokens.
'use client';

import React, { useState } from 'react';
import { DeIcon, type DeIconName } from './lucide-icons';

type CSS = React.CSSProperties;

/* ---------------- Button ---------------- */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: DeIconName;
  iconRight?: DeIconName;
  loading?: boolean;
  full?: boolean;
  style?: CSS;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  children,
  loading,
  full,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: { h: 34, px: 12, fs: 13, gap: 6 },
    md: { h: 42, px: 16, fs: 14, gap: 8 },
    lg: { h: 50, px: 24, fs: 16, gap: 10 },
  }[size];
  const variants: Record<ButtonVariant, CSS> = {
    primary: { background: 'var(--de-primary)', color: 'var(--de-on-primary)', border: '1px solid transparent' },
    secondary: { background: 'var(--de-accent-soft)', color: 'var(--de-accent)', border: '1px solid var(--de-border)' },
    ghost: { background: 'transparent', color: 'var(--de-text-secondary)', border: '1px solid transparent' },
    outline: { background: 'var(--de-bg-surface)', color: 'var(--de-text-primary)', border: '1px solid var(--de-border-strong)' },
    danger: { background: 'var(--de-danger)', color: '#fff', border: '1px solid transparent' },
    gradient: { background: 'var(--de-gradient-brand)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--sh-md)' },
  };
  const hoverBg: Record<ButtonVariant, string> = {
    primary: 'var(--de-primary-hover)',
    secondary: 'var(--de-accent-soft)',
    ghost: 'var(--de-bg-subtle)',
    outline: 'var(--de-bg-subtle)',
    danger: '#DC2626',
    gradient: 'var(--de-gradient-brand)',
  };
  const [hover, setHover] = useState(false);
  const isDisabled = disabled || loading;
  return (
    <button
      disabled={isDisabled}
      onMouseEnter={(e) => { setHover(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { setHover(false); onMouseLeave?.(e); }}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
        height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fs, fontWeight: 500,
        borderRadius: 'var(--r-md)', whiteSpace: 'nowrap', position: 'relative',
        width: full ? '100%' : undefined,
        transition: 'all var(--dur-fast) var(--ease)', ...variants[variant],
        ...(hover && !isDisabled ? { background: hoverBg[variant], transform: 'translateY(-1px)', boxShadow: variant === 'ghost' ? 'none' : 'var(--sh-md)' } : {}),
        ...(isDisabled ? { opacity: 0.5, cursor: 'not-allowed', transform: 'none' } : {}),
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'de-spin 0.7s linear infinite' }} />
      ) : icon ? (
        <DeIcon name={icon} size={sizes.fs + 4} />
      ) : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <DeIcon name={iconRight} size={sizes.fs + 4} /> : null}
    </button>
  );
}

/* ---------------- Card ---------------- */
export type CardVariant = 'default' | 'elevated' | 'bordered' | 'glass' | 'gradient';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  variant?: CardVariant;
  hover?: boolean;
  style?: CSS;
}

export function Card({ variant = 'default', hover, children, style, onMouseEnter, onMouseLeave, ...rest }: CardProps) {
  const [h2, setH2] = useState(false);
  const variants: Record<CardVariant, CSS> = {
    default: { background: 'var(--de-bg-surface)', border: '1px solid var(--de-border)', boxShadow: 'var(--sh-xs)' },
    elevated: { background: 'var(--de-bg-surface)', border: 'none', boxShadow: 'var(--sh-md)' },
    bordered: { background: 'var(--de-bg-surface)', border: '1px solid var(--de-border)', boxShadow: 'none' },
    glass: { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
    gradient: { background: 'var(--de-gradient-card)', border: '1px solid var(--de-border)', boxShadow: 'var(--sh-xs)' },
  };
  return (
    <div
      onMouseEnter={(e) => { if (hover) setH2(true); onMouseEnter?.(e); }}
      onMouseLeave={(e) => { if (hover) setH2(false); onMouseLeave?.(e); }}
      style={{
        borderRadius: 'var(--r-lg)', transition: 'all var(--dur-normal) var(--ease)', ...variants[variant],
        ...(h2 ? { transform: 'translateY(-3px)', boxShadow: 'var(--sh-lg)' } : {}), ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export type BadgeTone = 'brand' | 'blue' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeVariant = 'soft' | 'solid' | 'outline';

export interface BadgeProps {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  dot?: boolean;
  children?: React.ReactNode;
  style?: CSS;
}

export function Badge({ tone = 'neutral', variant = 'soft', dot, children, style }: BadgeProps) {
  const map: Record<BadgeTone, [string, string, string]> = {
    brand: ['var(--de-purple-600)', 'var(--de-purple-50)', 'var(--de-purple-200)'],
    blue: ['var(--de-blue-600)', 'var(--de-blue-50)', 'var(--de-blue-200)'],
    success: ['var(--de-success)', 'var(--de-success-soft)', 'rgba(16,185,129,0.3)'],
    warning: ['#B45309', 'var(--de-warning-soft)', 'rgba(245,158,11,0.3)'],
    danger: ['var(--de-danger)', 'var(--de-danger-soft)', 'rgba(239,68,68,0.3)'],
    neutral: ['var(--de-text-secondary)', 'var(--de-bg-subtle)', 'var(--de-border)'],
  };
  const c = map[tone];
  const styles: CSS =
    variant === 'solid'
      ? { background: c[0], color: '#fff', border: '1px solid transparent' }
      : variant === 'outline'
      ? { background: 'transparent', color: c[0], border: `1px solid ${c[2]}` }
      : { background: c[1], color: c[0], border: '1px solid transparent' };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
        fontSize: 12.5, fontWeight: 500, borderRadius: 'var(--r-full)', lineHeight: 1.4,
        whiteSpace: 'nowrap', ...styles, ...style,
      }}
    >
      {dot ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: c[0] }} /> : null}
      {children}
    </span>
  );
}

/* ---------------- TrafficLight ---------------- */
export type TrafficStatus = 'green' | 'yellow' | 'red';
export const trafficColor = (s: string) =>
  ({ green: 'var(--de-success)', yellow: 'var(--de-warning)', red: 'var(--de-danger)' } as Record<string, string>)[s] || 'var(--de-slate-400)';
export const trafficLabel = (s: string) =>
  ({ green: 'ดีเยี่ยม', yellow: 'พอใช้', red: 'ต้องปรับปรุง' } as Record<string, string>)[s] || '-';

export function TrafficLight({ status, showLabel }: { status: TrafficStatus; showLabel?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: trafficColor(status), boxShadow: `0 0 0 3px ${trafficColor(status)}22` }} />
      {showLabel ? <span style={{ fontSize: 13, color: 'var(--de-text-secondary)' }}>{trafficLabel(status)}</span> : null}
    </span>
  );
}

/* ---------------- Input ---------------- */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  icon?: DeIconName;
  error?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
  style?: CSS;
  wrapStyle?: CSS;
}

export function Input({ label, icon, error, hint, type = 'text', rightSlot, style, wrapStyle, onFocus, onBlur, ...rest }: InputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...wrapStyle }}>
      {label ? <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--de-text-primary)' }}>{label}</label> : null}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px',
          background: 'var(--de-bg-surface)', borderRadius: 'var(--r-md)',
          border: `1px solid ${error ? 'var(--de-danger)' : focus ? 'var(--de-border-focus)' : 'var(--de-border-strong)'}`,
          boxShadow: focus ? `0 0 0 3px ${error ? 'var(--de-danger-soft)' : 'var(--de-ring)'}` : 'none',
          transition: 'all var(--dur-fast) var(--ease)',
        }}
      >
        {icon ? <DeIcon name={icon} size={18} style={{ color: 'var(--de-text-tertiary)' }} /> : null}
        <input
          type={type}
          onFocus={(e) => { setFocus(true); onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--de-text-primary)', fontSize: 15, minWidth: 0, ...style }}
          {...rest}
        />
        {rightSlot}
      </div>
      {error ? (
        <span style={{ fontSize: 12, color: 'var(--de-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <DeIcon name="alert" size={13} /> {error}
        </span>
      ) : null}
      {hint && !error ? <span style={{ fontSize: 12, color: 'var(--de-text-tertiary)' }}>{hint}</span> : null}
    </div>
  );
}

/* ---------------- Avatar ---------------- */
export function Avatar({ initials, size = 38, tone = 'brand' }: { initials: string; size?: number; tone?: 'brand' | 'accent' }) {
  const bg = tone === 'brand' ? 'var(--de-gradient-brand)' : 'var(--de-accent-soft)';
  const color = tone === 'brand' ? '#fff' : 'var(--de-accent)';
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: bg, color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 600, flexShrink: 0, letterSpacing: '0.02em',
      }}
    >
      {initials}
    </span>
  );
}
