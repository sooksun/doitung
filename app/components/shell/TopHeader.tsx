// app/components/shell/TopHeader.tsx
// TSQMn AppShell — sticky top header: breadcrumb, global search (decorative),
// notifications (empty state until a backend exists), and the user menu.
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, DeIcon } from '@/app/components/de';
import type { Crumb } from './nav-config';

interface HeaderUser {
  name: string;
  email: string;
  initials: string;
}

interface TopHeaderProps {
  crumbs: Crumb[];
  collapsed: boolean;
  onMobileMenu: () => void;
  user: HeaderUser;
  onLogout: () => void;
}

function NotificationPanel({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 380, maxWidth: '90vw', background: 'var(--de-bg-surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-xl)', border: '1px solid var(--de-border)', zIndex: 60, animation: 'de-scale-in 0.15s var(--ease)', transformOrigin: 'top right', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--de-border)' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>การแจ้งเตือน</span>
      </div>
      <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--de-text-tertiary)' }}>
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 10 }}>
          <DeIcon name="bell" size={28} />
        </div>
        <div style={{ fontSize: 14 }}>ยังไม่มีการแจ้งเตือน</div>
      </div>
    </div>
  );
}

export function TopHeader({ crumbs, collapsed, onMobileMenu, user, onLogout }: TopHeaderProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header
      ref={ref}
      className="de-topheader"
      style={{
        position: 'fixed', top: 0, right: 0, height: 'var(--header-h)', zIndex: 30,
        left: 0, paddingLeft: `calc(${collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)'} + 24px)`,
        paddingRight: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: 'color-mix(in srgb, var(--de-bg-surface) 90%, transparent)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--de-border)',
        transition: 'padding-left var(--dur-normal) var(--ease)',
      }}
    >
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <button onClick={onMobileMenu} aria-label="เมนู" className="de-hamburger" style={{ width: 40, height: 40, display: 'none', placeItems: 'center', border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)', borderRadius: 'var(--r-md)', color: 'var(--de-text-primary)' }}>
          <DeIcon name="menu" size={20} />
        </button>
        <nav className="de-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, minWidth: 0, overflow: 'hidden' }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 ? <span style={{ color: 'var(--de-text-tertiary)' }}><DeIcon name="chevronRight" size={15} /></span> : null}
              {i === crumbs.length - 1 ? (
                <span style={{ fontWeight: 600, color: 'var(--de-text-primary)', whiteSpace: 'nowrap' }}>{c.label}</span>
              ) : (
                <button onClick={() => c.href && router.push(c.href)} style={{ border: 'none', background: 'transparent', color: 'var(--de-text-secondary)', fontSize: 14.5, whiteSpace: 'nowrap', padding: 0 }}>{c.label}</button>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: search + notif + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="de-global-search" style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, width: 320, maxWidth: '36vw', padding: '0 14px', background: 'var(--de-bg-canvas)', border: '1px solid var(--de-border)', borderRadius: 'var(--r-md)' }}>
          <DeIcon name="search" size={18} style={{ color: 'var(--de-text-tertiary)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา โรงเรียน, ครู, เครื่องมือ…"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--de-text-primary)', minWidth: 0 }}
          />
          <kbd style={{ fontSize: 11, fontFamily: 'var(--de-font-mono)', color: 'var(--de-text-tertiary)', background: 'var(--de-bg-surface)', border: '1px solid var(--de-border)', borderRadius: 4, padding: '2px 6px' }}>⌘K</kbd>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
            aria-label="การแจ้งเตือน"
            style={{ position: 'relative', width: 42, height: 42, display: 'grid', placeItems: 'center', border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)', borderRadius: 'var(--r-md)', color: 'var(--de-text-secondary)' }}
          >
            <DeIcon name="bell" size={19} />
          </button>
          <NotificationPanel open={notifOpen} />
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)', borderRadius: 'var(--r-full)', padding: '4px 10px 4px 4px' }}
          >
            <Avatar initials={user.initials} size={34} />
            <DeIcon name="chevronDown" size={16} style={{ color: 'var(--de-text-tertiary)' }} />
          </button>
          {userOpen ? (
            <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 240, background: 'var(--de-bg-surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-xl)', border: '1px solid var(--de-border)', zIndex: 60, overflow: 'hidden', animation: 'de-scale-in 0.15s var(--ease)', transformOrigin: 'top right' }}>
              <div style={{ padding: 16, borderBottom: '1px solid var(--de-border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar initials={user.initials} size={42} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--de-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
              </div>
              <div style={{ padding: 8 }}>
                <button
                  onClick={onLogout}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', border: 'none', background: 'transparent', borderRadius: 'var(--r-md)', color: 'var(--de-danger)', fontSize: 14 }}
                >
                  <DeIcon name="logout" size={18} /> ออกจากระบบ
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
