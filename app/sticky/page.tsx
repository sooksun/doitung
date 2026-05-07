// app/sticky/page.tsx
// Shareable standalone board reached via /sticky?key=<shareKey>.
//
// - Open to anyone with the link. NO login required (guests get a per-browser
//   token automatically + can optionally pick a display name).
// - Logged-in users authenticate normally; if they happen to be the board
//   owner the page surfaces the owner-only chrome (Clear, Close).
// - When the owner has closed the board, every API path returns 410 and the
//   surface shows a friendly "closed by owner" state.

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StickyBoardSurface } from '@/app/components/sticky/StickyBoardSurface';
import { getGuestName, setGuestName, getOrCreateGuestToken } from '@/lib/sticky-guest';

interface BoardByKeyResponse {
  id: string;
  shareKey: string;
  ownerUserId: number;
  ownerName: string | null;
  schoolId: number;
  contextType: string;
  contextId: string;
  status: 'ACTIVE' | 'CLOSED';
  closedAt: string | null;
  isOwner: boolean;
}

const ICEBERG_LAYER_LABEL: Record<number, string> = {
  1: 'ชั้น 1 สถานการณ์',
  2: 'ชั้น 2 รูปแบบของปัญหา',
  3: 'ชั้น 3 โครงสร้าง',
  4: 'ชั้น 4 แบบจำลองวิธีคิด',
};

function deriveTitle(contextType: string, contextId: string): string {
  if (contextType !== 'ICEBERG_CELL') return 'บอร์ดระดมสมอง';
  const m = contextId.match(/iceberg:L(\d):(CURRENT|DESIRED)/);
  if (!m) return 'บอร์ดระดมสมอง';
  const layer = ICEBERG_LAYER_LABEL[Number(m[1])] || `ชั้น ${m[1]}`;
  const sideLabel = m[2] === 'CURRENT' ? 'สิ่งที่เป็นอยู่' : 'สิ่งที่อยากให้เป็น';
  return `Iceberg · ${layer} / ${sideLabel}`;
}

function StickyPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const shareKey = sp.get('key') || '';

  const [board, setBoard] = useState<BoardByKeyResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState<string>('');
  const [hasName, setHasName] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Make sure a guest token exists from the start, even before the user
      // adds their first note — saves a round-trip later.
      getOrCreateGuestToken();
      const existing = getGuestName();
      if (existing) {
        setGuestNameInput(existing);
        setHasName(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!shareKey) {
      setLoadError('ลิงก์บอร์ดไม่สมบูรณ์ — ขาดพารามิเตอร์ key');
      setLoaded(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/sticky-boards/by-key/${encodeURIComponent(shareKey)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) {
          setLoadError(j?.error || 'โหลดบอร์ดไม่สำเร็จ');
        } else {
          setBoard(j.data as BoardByKeyResponse);
        }
      })
      .catch((e) => !cancelled && setLoadError(e?.message || 'โหลดบอร์ดไม่สำเร็จ'))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [shareKey]);

  const saveName = () => {
    const v = guestNameInput.trim();
    if (!v) {
      setGuestName(null);
      setHasName(false);
      return;
    }
    setGuestName(v);
    setHasName(true);
  };

  if (!loaded) {
    return <FullPageMessage title="กำลังโหลดบอร์ด..." message="" muted />;
  }

  if (loadError || !board) {
    return (
      <FullPageMessage
        title="เข้าถึงบอร์ดไม่สำเร็จ"
        message={loadError || 'ไม่พบข้อมูลบอร์ด'}
      />
    );
  }

  if (board.status === 'CLOSED') {
    return (
      <FullPageMessage
        title="🔒 บอร์ดถูกปิดแล้ว"
        message={`เจ้าของ${board.ownerName ? ` (${board.ownerName})` : ''}ได้ปิดบอร์ดไปแล้ว — ขอลิงก์ใหม่หากต้องการระดมสมองต่อ`}
      />
    );
  }

  const title = deriveTitle(board.contextType, board.contextId);

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
          flexWrap: 'wrap',
        }}
      >
        <Link href="/admin/sar" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← กลับ
        </Link>
        <span style={{ color: '#9ca3af' }}>·</span>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          เจ้าของ: <strong>{board.ownerName || 'ไม่ระบุ'}</strong>
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <label style={{ color: '#6b7280' }}>👋 ชื่อของคุณ:</label>
          <input
            type="text"
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            placeholder="ใส่ชื่อ (เลือกได้)"
            maxLength={40}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontSize: '0.85rem',
              width: 160,
            }}
          />
          {hasName && <span style={{ color: '#10b981', fontSize: '0.75rem' }}>✓ บันทึกแล้ว</span>}
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0, padding: '1rem 1.25rem', display: 'flex' }}>
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
            title={title}
            boardId={board.id}
            boardKey={board.shareKey}
            isOwner={board.isOwner}
            // Standalone page: owner can also close the board here. Non-owner
            // gets "ออกจากบอร์ด" which just navigates away (board stays open).
            closeAlsoClosesBoard={board.isOwner}
            closeLabel={board.isOwner ? 'ปิดบอร์ด (link ใช้ไม่ได้แล้ว)' : 'ออกจากบอร์ด'}
            onClose={() => router.push('/admin/sar')}
            pollIntervalMs={5000}
          />
        </div>
      </main>
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
          maxWidth: 500,
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: muted ? '#6b7280' : '#dc2626', marginBottom: '0.5rem' }}>{title}</h1>
        {message && <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>{message}</p>}
        <Link
          href="/admin/sar"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#4f46e5',
            color: 'white',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          กลับหน้า SAR
        </Link>
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
