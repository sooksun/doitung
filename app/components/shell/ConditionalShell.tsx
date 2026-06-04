// app/components/shell/ConditionalShell.tsx
// Decides per-route whether to wrap the page in the AppShell.
// Standalone (no shell): landing, login, and any print view. Everything else —
// including /live-dashboard — gets the shell (sidebar + header + theme toggle).
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

function isStandalone(pathname: string): boolean {
  if (pathname === '/' || pathname === '/login') return true;
  if (pathname.endsWith('/print')) return true;
  return false;
}

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (isStandalone(pathname)) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
