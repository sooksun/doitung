// app/dashboard/page.tsx
// Legacy entry — kept as a thin redirect so existing links and bookmarks still work.
// The real dashboard lives at /live-dashboard (richer filters + real-time polling).

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/live-dashboard');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--de-surface-muted)',
        fontFamily: 'var(--de-font-sans)',
        color: 'var(--de-ink-500)',
        gap: '0.6rem',
        flexDirection: 'column',
      }}
    >
      <span
        aria-hidden
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '3px solid var(--de-ink-200)',
          borderTopColor: 'var(--de-brand-600)',
          animation: 'de-dashboard-spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.9rem' }}>กำลังพาไปหน้า Dashboard …</span>

      <style>{`
        @keyframes de-dashboard-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
