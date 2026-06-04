// app/components/shell/nav-config.ts
// Navigation model for the TSQMn AppShell. Maps the prototype's route ids to
// the app's real Next.js paths and derives active state + breadcrumbs from the
// current pathname. No business logic here — presentation/navigation only.

import type { DeIconName } from '@/app/components/de';

export interface NavItemDef {
  id: string;
  label: string;
  icon: DeIconName;
  href: string;
}

export const NAV_MAIN: NavItemDef[] = [
  { id: 'dashboard', label: 'หน้าหลัก', icon: 'home', href: '/dashboard' },
  { id: 'live-dashboard', label: 'Live Dashboard', icon: 'activity', href: '/live-dashboard' },
  { id: 'evaluations', label: 'รายการประเมิน', icon: 'clipboard', href: '/evaluations' },
  { id: 'reports', label: 'รายงาน', icon: 'fileText', href: '/reports' },
  { id: 'instruments', label: 'เครื่องมือประเมิน', icon: 'tool', href: '/instruments' },
];

export const NAV_ADMIN: NavItemDef[] = [
  { id: 'admin-sar', label: 'เอกสาร SAR', icon: 'folder', href: '/admin/sar' },
  { id: 'admin-schools', label: 'โรงเรียน', icon: 'school', href: '/admin/schools' },
  { id: 'admin-networks', label: 'เครือข่าย', icon: 'network', href: '/admin/networks' },
  { id: 'admin-directors', label: 'ผู้อำนวยการ', icon: 'userTie', href: '/admin/school-directors' },
  { id: 'users', label: 'ผู้ใช้งาน', icon: 'users', href: '/users' },
  { id: 'feature-flags', label: 'ตั้งค่าระบบ', icon: 'settings', href: '/admin/settings/feature-flags' },
];

const ALL_NAV = [...NAV_MAIN, ...NAV_ADMIN];

/** Longest-prefix match: /admin/sar/123 → admin-sar, /evaluations/new → evaluations. */
export function getActiveNavId(pathname: string): string | null {
  let best: NavItemDef | null = null;
  for (const item of ALL_NAV) {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best?.id ?? null;
}

export interface Crumb {
  label: string;
  href?: string;
}

const LEAF_LABEL: Record<string, string> = {
  new: 'สร้างใหม่',
  edit: 'แก้ไข',
  review: 'ตรวจทาน',
  insights: 'เชิงลึก',
  print: 'พิมพ์',
};

/** Build breadcrumbs from the pathname: หน้าหลัก › <section> › <leaf>. */
export function getCrumbs(pathname: string): Crumb[] {
  const active = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  const crumbs: Crumb[] = [];

  if (!active || active.href !== '/dashboard') {
    crumbs.push({ label: 'หน้าหลัก', href: '/dashboard' });
  }
  if (active) {
    crumbs.push({ label: active.label, href: active.href });
    // Append a leaf crumb for deeper segments (id / sub-action).
    const rest = pathname.slice(active.href.length).split('/').filter(Boolean);
    if (rest.length) {
      const last = rest[rest.length - 1];
      const label = LEAF_LABEL[last] ?? (/^\d+$/.test(last) || /[0-9a-f-]{6,}/i.test(last) ? 'รายละเอียด' : last);
      crumbs.push({ label });
    }
  } else {
    crumbs.push({ label: 'หน้าหลัก' });
  }
  return crumbs;
}

/* ---------------- user display helpers ---------------- */

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  SCHOOL_ADMIN: 'ผู้ดูแลโรงเรียน',
  SCHOOL_LEADER: 'ผู้อำนวยการ',
  SUPERVISOR: 'ศึกษานิเทศก์',
  TEACHER: 'ครู',
};
const ROLE_PRIORITY = ['ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER', 'SUPERVISOR', 'TEACHER'];

export interface ShellUser {
  id?: string | number;
  email?: string;
  name?: string;
  roles?: string[];
}

/** Tolerate string[] (the real shape) or array of {role}/{name} objects. */
export function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => (typeof r === 'string' ? r : (r as any)?.role?.name ?? (r as any)?.role ?? (r as any)?.name ?? ''))
    .filter(Boolean);
}

export function roleLabel(roles: string[]): string {
  const primary = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
  return primary ? ROLE_LABEL[primary] ?? primary : 'ผู้ใช้งาน';
}

export function isAdminRoles(roles: string[]): boolean {
  return roles.some((r) => r === 'ADMIN' || r === 'SCHOOL_ADMIN');
}

export function initialsFrom(name?: string, email?: string): string {
  const src = (name || '').trim();
  if (src) {
    const parts = src.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return src.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}
