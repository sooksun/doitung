// app/components/shell/Sidebar.tsx
// TSQMn AppShell — collapsible gradient sidebar (desktop) / drawer (mobile).
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, DeIcon } from '@/app/components/de';
import { NAV_MAIN, NAV_ADMIN, filterNavByRoles, type NavItemDef } from './nav-config';
import type { Theme } from '@/app/components/ui/ThemeProvider';

interface SidebarUser {
  name: string;
  roleLabel: string;
  initials: string;
  isAdmin: boolean;
  roles: string[];
}

interface SidebarProps {
  activeId: string | null;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  user: SidebarUser;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
}

function NavItem({ item, active, collapsed, onClick }: { item: NavItemDef; active: boolean; collapsed: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left',
        padding: collapsed ? '11px' : '11px 14px', margin: '2px 0', borderRadius: 'var(--r-md)',
        border: 'none', position: 'relative', justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'rgba(255,255,255,0.16)' : hover ? 'rgba(255,255,255,0.09)' : 'transparent',
        color: active ? '#fff' : hover ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.74)',
        transition: 'all var(--dur-fast) var(--ease)', fontSize: 14.5, fontWeight: active ? 600 : 500,
      }}
    >
      {active && !collapsed ? (
        <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 3.5, height: 22, borderRadius: 999, background: 'var(--de-purple-300)' }} />
      ) : null}
      <DeIcon name={item.icon} size={20} strokeWidth={active ? 2.2 : 2} />
      {collapsed ? null : <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
    </button>
  );
}

export function Sidebar({ activeId, collapsed, setCollapsed, mobileOpen, setMobileOpen, user, theme, onToggleTheme, onLogout }: SidebarProps) {
  const router = useRouter();
  const showCollapsed = collapsed && !mobileOpen;
  const w = showCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)';

  const go = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  return (
    <>
      {mobileOpen ? (
        <div
          onClick={() => setMobileOpen(false)}
          className="de-mobile-only"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)', zIndex: 39, animation: 'de-fade-in 0.2s ease' }}
        />
      ) : null}
      <aside
        className={'de-sidebar' + (mobileOpen ? ' de-sidebar-open' : '')}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: w, zIndex: 40,
          background: 'var(--de-gradient-sidebar)', display: 'flex', flexDirection: 'column',
          transition: 'width var(--dur-normal) var(--ease), transform var(--dur-normal) var(--ease)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo zone */}
        <div style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', justifyContent: showCollapsed ? 'center' : 'space-between', padding: showCollapsed ? 0 : '0 18px', borderBottom: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          {showCollapsed ? (
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>TSQMn</span>
          ) : (
            <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>TSQMn แม่ฟ้าหลวง</span>
          )}
          {!showCollapsed ? (
            <button
              onClick={() => { if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen(false); else setCollapsed(true); }}
              aria-label="ย่อเมนู"
              className="de-collapse-btn"
              style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', borderRadius: 'var(--r-md)' }}
            >
              <DeIcon name="chevronLeft" size={18} />
            </button>
          ) : null}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: showCollapsed ? '12px 10px' : '14px 14px' }}>
          {showCollapsed && !mobileOpen ? (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="ขยายเมนู"
              style={{ width: '100%', display: 'grid', placeItems: 'center', padding: 11, marginBottom: 6, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', borderRadius: 'var(--r-md)' }}
            >
              <DeIcon name="menu" size={20} />
            </button>
          ) : null}
          {filterNavByRoles(NAV_MAIN, user.roles).map((it) => (
            <NavItem key={it.id} item={it} active={activeId === it.id} collapsed={showCollapsed} onClick={() => go(it.href)} />
          ))}
          {user.isAdmin ? (
            <>
              <div style={{ margin: showCollapsed ? '14px 4px 8px' : '18px 6px 8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
                {showCollapsed ? null : (
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', padding: '0 8px 6px', textTransform: 'uppercase' }}>การจัดการ</div>
                )}
              </div>
              {NAV_ADMIN.map((it) => (
                <NavItem key={it.id} item={it} active={activeId === it.id} collapsed={showCollapsed} onClick={() => go(it.href)} />
              ))}
            </>
          ) : null}
        </nav>

        {/* Footer: theme toggle + user */}
        <div style={{ padding: showCollapsed ? 10 : 14, borderTop: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          <button
            onClick={onToggleTheme}
            style={{ display: 'flex', alignItems: 'center', justifyContent: showCollapsed ? 'center' : 'space-between', width: '100%', padding: showCollapsed ? 10 : '10px 14px', marginBottom: 8, border: 'none', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 500 }}
            aria-label={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
          >
            {showCollapsed ? (
              <DeIcon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            ) : (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <DeIcon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
                  {theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
                </span>
                <span style={{ width: 36, height: 20, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', padding: 2, justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff' }} />
                </span>
              </>
            )}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: showCollapsed ? 0 : '6px 6px', justifyContent: showCollapsed ? 'center' : 'flex-start' }}>
            <Avatar initials={user.initials} size={38} />
            {showCollapsed ? null : (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{user.roleLabel}</div>
              </div>
            )}
            {showCollapsed ? null : (
              <button onClick={onLogout} aria-label="ออกจากระบบ" style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', borderRadius: 'var(--r-md)' }}>
                <DeIcon name="logout" size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
