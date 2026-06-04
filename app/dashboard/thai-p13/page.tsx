// app/dashboard/thai-p13/page.tsx
// Standalone page wrapper around <ThaiP13DashboardView /> (the drill-down THAI_P1_3
// dashboard, also embedded as a tab on /live-dashboard).

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThaiP13DashboardView from './ThaiP13DashboardView';

export default function ThaiP13DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) router.push('/login');
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', marginBottom: '0.5rem' }}>
        <Link href="/dashboard" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.9rem' }}>← กลับแดชบอร์ดหลัก</Link>
      </div>
      <ThaiP13DashboardView />
    </div>
  );
}
