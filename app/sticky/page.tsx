// app/sticky/page.tsx
// Shareable standalone board. The "🔗 คัดลอกลิงก์" button on a sticky modal
// produces a URL pointing here:
//
//   /sticky?contextType=ICEBERG_CELL&contextId=sar:draft:school:42:year:7:iceberg:L1:CURRENT
//
// Anyone with the link (and a login on a school that the API allows) can add /
// edit / drag / colour notes on the same board. Polling shows everyone else's
// changes within ~5s. There is no "apply text to a textarea" action here —
// that only happens back in the form modal on /admin/sar/new.

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StickyBoardSurface } from '@/app/components/sticky/StickyBoardSurface';

interface MeResponse {
  id: number;
  roles: string[];
  school: { id: number; nameTh: string } | null;
}

interface ParsedContext {
  schoolId: number | null;
  layerNo: 1 | 2 | 3 | 4 | null;
  side: 'CURRENT' | 'DESIRED' | null;
  title: string;
}

const ICEBERG_LAYER_LABEL: Record<number, string> = {
  1: 'ชั้น 1 สถานการณ์',
  2: 'ชั้น 2 รูปแบบของปัญหา',
  3: 'ชั้น 3 โครงสร้าง',
  4: 'ชั้น 4 แบบจำลองวิธีคิด',
};

function parseContext(contextType: string, contextId: string): ParsedContext {
  if (contextType !== 'ICEBERG_CELL') {
    return { schoolId: null, layerNo: null, side: null, title: 'บอร์ดระดมสมอง' };
  }
  // sar:draft:school:{N}:year:{N}:iceberg:L{n}:{SIDE}
  // sar:{sarId}:iceberg:L{n}:{SIDE}
  const schoolMatch = contextId.match(/school:(\d+)/);
  const layerMatch = contextId.match(/iceberg:L(\d):(CURRENT|DESIRED)/);
  const schoolId = schoolMatch ? Number(schoolMatch[1]) : null;
  const layerNo = layerMatch ? (Number(layerMatch[1]) as 1 | 2 | 3 | 4) : null;
  const side = layerMatch ? (layerMatch[2] as 'CURRENT' | 'DESIRED') : null;
  const layerLabel = layerNo ? ICEBERG_LAYER_LABEL[layerNo] : '';
  const sideLabel = side === 'CURRENT' ? 'สิ่งที่เป็นอยู่' : side === 'DESIRED' ? 'สิ่งที่อยากให้เป็น' : '';
  const title = layerLabel && sideLabel ? `Iceberg · ${layerLabel} / ${sideLabel}` : 'บอร์ดระดมสมอง';
  return { schoolId, layerNo, side, title };
}

function StickyPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const contextType = sp.get('contextType') || '';
  const contextId = sp.get('contextId') || '';

  const [me, setMe] = useState<MeResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!tok) {
      router.push(`/login?next=${encodeURIComponent('/sticky?' + sp.toString())}`);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${tok}` } })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.success) {
          setAuthError(j?.error || 'ตรวจสอบสิทธิ์ไม่สำเร็จ');
        } else {
          setMe(j.data as MeResponse);
        }
      })
      .catch(() => setAuthError('โหลดข้อมูลผู้ใช้ไม่สำเร็จ'))
      .finally(() => setAuthChecked(true));
  }, [router, sp]);

  if (!contextType || !contextId) {
    return (
      <FullPageMessage
        title="ลิงก์บอร์ดไม่สมบูรณ์"
        message="URL นี้ขาด contextType หรือ contextId — กลับไปคัดลอกลิงก์จากบอร์ดอีกครั้ง"
      />
    );
  }

  if (!authChecked) {
    return <FullPageMessage title="กำลังตรวจสอบสิทธิ์..." message="" muted />;
  }

  if (authError) {
    return <FullPageMessage title="เข้าถึงบอร์ดไม่สำเร็จ" message={authError} />;
  }

  const ctx = parseContext(contextType, contextId);
  const isAdmin = me?.roles?.includes('ADMIN');
  // Admins can act on any school — fall back to the schoolId encoded in the
  // contextId. Non-admin teachers always use their own bound school (the API
  // enforces this; we just reflect it in the UI).
  const schoolId = me?.school?.id ?? (isAdmin ? ctx.schoolId : null);

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          padding: '0.85rem 1.25rem',
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Link href="/admin/sar" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← กลับ /admin/sar
        </Link>
        <span style={{ color: '#9ca3af' }}>·</span>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {me?.school?.nameTh ? `โรงเรียน: ${me.school.nameTh}` : isAdmin ? 'โหมด Admin' : 'ไม่ผูกกับโรงเรียน'}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          padding: '1rem 1.25rem',
          display: 'flex',
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <StickyBoardSurface
            title={ctx.title}
            contextType={contextType}
            contextId={contextId}
            schoolId={schoolId}
            layerNo={ctx.layerNo}
            side={ctx.side}
            closeLabel="ปิดบอร์ด"
            onClose={() => router.push('/admin/sar')}
            showCopyLink
            allowClear={!!isAdmin}
            pollIntervalMs={5000}
          />
        </div>
      </main>

      {!schoolId && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: '#fef3c7',
            color: '#92400e',
            fontSize: '0.85rem',
            borderTop: '1px solid #fde68a',
          }}
        >
          ⚠️ บัญชีของคุณยังไม่ได้ผูกกับโรงเรียน — ดูบอร์ดได้ แต่จะเพิ่มโน้ตไม่ได้จนกว่าจะมีโรงเรียน
        </div>
      )}
    </div>
  );
}

function FullPageMessage({
  title,
  message,
  muted,
}: {
  title: string;
  message: string;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          maxWidth: 440,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: muted ? '#6b7280' : '#dc2626', marginBottom: '0.5rem' }}>{title}</h1>
        {message && <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>{message}</p>}
      </div>
    </div>
  );
}

export default function StickyPage() {
  return (
    <Suspense fallback={<FullPageMessage title="กำลังโหลด..." message="" muted />}>
      <StickyPageInner />
    </Suspense>
  );
}
