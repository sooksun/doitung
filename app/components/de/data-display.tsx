// app/components/de/data-display.tsx
// TSQMn redesign — composite display + control components built on the atoms.
'use client';

import React, { useEffect, useState } from 'react';
import { Card } from './primitives';
import { DeIcon, type DeIconName } from './lucide-icons';

type CSS = React.CSSProperties;

/* ---------------- StatCard ---------------- */
export function StatCard({
  icon,
  value,
  label,
  trend,
  trendDir = 'up',
  accent = 'purple',
  delay = 0,
}: {
  icon: DeIconName;
  value: React.ReactNode;
  label: string;
  trend?: string;
  trendDir?: 'up' | 'down';
  accent?: 'purple' | 'blue' | 'success' | 'warning';
  delay?: number;
}) {
  const colors: Record<string, [string, string]> = {
    purple: ['var(--de-purple-600)', 'linear-gradient(135deg, var(--de-purple-100), var(--de-blue-100))'],
    blue: ['var(--de-blue-600)', 'linear-gradient(135deg, var(--de-blue-100), var(--de-purple-100))'],
    success: ['var(--de-success)', 'var(--de-success-soft)'],
    warning: ['#B45309', 'var(--de-warning-soft)'],
  };
  const c = colors[accent];
  return (
    <Card hover className="de-slide-up" style={{ padding: 22, animationDelay: delay + 'ms' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: c[1], display: 'flex', alignItems: 'center', justifyContent: 'center', color: c[0] }}>
          <DeIcon name={icon} size={24} />
        </div>
        {trend ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 600, color: trendDir === 'up' ? 'var(--de-success)' : 'var(--de-danger)' }}>
            <DeIcon name={trendDir === 'up' ? 'trendUp' : 'trendDown'} size={15} /> {trend}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--de-text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 14, color: 'var(--de-text-secondary)', marginTop: 4 }}>{label}</div>
    </Card>
  );
}

/* ---------------- ProgressBar ---------------- */
export function ProgressBar({ value, tone = 'brand', height = 8 }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; height?: number }) {
  const bg: Record<string, string> = {
    brand: 'var(--de-gradient-brand)', success: 'var(--de-success)', warning: 'var(--de-warning)', danger: 'var(--de-danger)',
  };
  return (
    <div style={{ width: '100%', height, background: 'var(--de-bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: value + '%', height: '100%', background: bg[tone], borderRadius: 999, transition: 'width var(--dur-slow) var(--ease)' }} />
    </div>
  );
}

/* ---------------- PageHeader ---------------- */
export function PageHeader({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h1>
        {subtitle ? <p style={{ fontSize: 15, color: 'var(--de-text-secondary)', marginTop: 6 }}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div> : null}
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number | null;
}
export function Tabs({ tabs, active, onChange, style }: { tabs: TabItem[]; active: string; onChange: (id: string) => void; style?: CSS }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--de-border)', ...style }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: '12px 18px', fontSize: 14.5, fontWeight: on ? 600 : 500, border: 'none', background: 'transparent',
              color: on ? 'var(--de-primary)' : 'var(--de-text-secondary)', position: 'relative', display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: `2px solid ${on ? 'var(--de-primary)' : 'transparent'}`, marginBottom: -1, transition: 'all var(--dur-fast) var(--ease)',
            }}
          >
            {t.label}
            {t.count != null ? (
              <span style={{ fontSize: 12, padding: '1px 7px', borderRadius: 999, background: on ? 'var(--de-primary-soft)' : 'var(--de-bg-subtle)', color: on ? 'var(--de-primary)' : 'var(--de-text-tertiary)' }}>{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Toggle ---------------- */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 25, borderRadius: 999, border: 'none', padding: 3,
        background: checked ? 'var(--de-primary)' : 'var(--de-border-strong)',
        display: 'flex', justifyContent: checked ? 'flex-end' : 'flex-start', transition: 'all var(--dur-fast) var(--ease)',
      }}
    >
      <span style={{ width: 19, height: 19, borderRadius: '50%', background: '#fff', boxShadow: 'var(--sh-sm)', transition: 'all var(--dur-fast) var(--ease)' }} />
    </button>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'de-fade-in 0.15s ease' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: width, background: 'var(--de-bg-surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-2xl)', border: '1px solid var(--de-border)', animation: 'de-scale-in 0.2s var(--ease)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--de-border)' }}>
          <h3 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} aria-label="ปิด" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 'var(--r-md)', border: 'none', background: 'transparent', color: 'var(--de-text-secondary)' }}>
            <DeIcon name="x" size={20} />
          </button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>{children}</div>
        {footer ? <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--de-border)' }}>{footer}</div> : null}
      </div>
    </div>
  );
}
