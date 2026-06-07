// app/components/shell/AppShell.tsx
// TSQMn AppShell — wraps authenticated pages with Sidebar + TopHeader + content.
// Reads the auth user from localStorage (written by /login); never touches the
// auth/API logic itself. Pages keep their own data fetching + auth guards.
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/app/components/ui';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import ChatWidget from '@/app/components/chat/ChatWidget';
import {
  getActiveNavId, getCrumbs, normalizeRoles, roleLabel, isAdminRoles, initialsFrom,
  type ShellUser,
} from './nav-config';

const COLLAPSE_KEY = 'de-sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [raw, setRaw] = useState<ShellUser | null>(null);

  // Load persisted collapse pref + the auth user (client-only).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
      const stored = localStorage.getItem('user');
      if (stored) setRaw(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const setCollapsedPersist = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const activeId = useMemo(() => getActiveNavId(pathname), [pathname]);
  const crumbs = useMemo(() => getCrumbs(pathname), [pathname]);

  const roles = useMemo(() => normalizeRoles(raw?.roles), [raw]);
  const sidebarUser = {
    name: raw?.name || raw?.email || 'ผู้ใช้งาน',
    roleLabel: roleLabel(roles),
    initials: initialsFrom(raw?.name, raw?.email),
    isAdmin: isAdminRoles(roles),
    roles,
  };
  const headerUser = {
    name: raw?.name || 'ผู้ใช้งาน',
    email: raw?.email || '',
    initials: initialsFrom(raw?.name, raw?.email),
  };

  const onLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      /* ignore */
    }
    router.push('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--de-bg-canvas)' }}>
      <Sidebar
        activeId={activeId}
        collapsed={collapsed}
        setCollapsed={setCollapsedPersist}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={sidebarUser}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={onLogout}
      />
      <TopHeader
        crumbs={crumbs}
        collapsed={collapsed}
        onMobileMenu={() => setMobileOpen(true)}
        user={headerUser}
        onLogout={onLogout}
      />
      <main
        className="de-content"
        style={{
          marginLeft: collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)',
          marginTop: 'var(--header-h)',
          minHeight: 'calc(100vh - var(--header-h))',
          padding: 32,
          transition: 'margin-left var(--dur-normal) var(--ease)',
        }}
      >
        <div key={pathname} style={{ maxWidth: 1400, margin: '0 auto' }} className="de-page-enter">
          {children}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
