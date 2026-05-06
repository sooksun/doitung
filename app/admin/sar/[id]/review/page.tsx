// app/admin/sar/[id]/review/page.tsx
// Split-pane: PDF preview (left) + cleanedText editor (right). Page nav + per-page save.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface PageRow {
  id: number;
  pageNumber: number;
  rawText: string;
  cleanedText: string | null;
  extractMethod: string;
  confidence: number | null;
  needsReview: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export default function SarReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [docFileUrl, setDocFileUrl] = useState<string | null>(null);

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`/api/admin/sar-documents/${id}/pages`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์'); setLoading(false); return; }
      const json = await res.json();
      if (json.success) {
        setPages(json.data.items);
        if (json.data.items.length > 0) {
          setDraft(json.data.items[0].cleanedText ?? json.data.items[0].rawText);
        }
      }
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  // Build authenticated PDF URL via blob — embed cannot send Authorization header.
  // Workaround: load PDF as blob then create object URL.
  useEffect(() => {
    if (!token || !id) return;
    let revokeUrl: string | null = null;
    (async () => {
      try {
        const res = await fetch(`/api/admin/sar-documents/${id}/file`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        revokeUrl = url;
        setDocFileUrl(url);
      } catch { /* */ }
    })();
    return () => { if (revokeUrl) URL.revokeObjectURL(revokeUrl); };
  }, [token, id]);

  // When activeIdx changes, load that page's cleanedText into draft
  useEffect(() => {
    const p = pages[activeIdx];
    if (p) setDraft(p.cleanedText ?? p.rawText ?? '');
  }, [activeIdx, pages]);

  const save = async () => {
    if (!token || !pages[activeIdx]) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sar-pages/${pages[activeIdx].id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleanedText: draft }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'บันทึกไม่สำเร็จ'); return; }
      toastSuccess('บันทึกหน้านี้สำเร็จ');
      // update local
      setPages((prev) => prev.map((p, i) => i === activeIdx ? { ...p, cleanedText: draft, needsReview: false, reviewedAt: new Date().toISOString() } : p));
    } catch { toastError('เกิดข้อผิดพลาด'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  if (error) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: '#ef4444' }}>{error}</p>
      <Link href={`/admin/sar/${id}`} style={{ color: '#667eea' }}>← กลับ</Link>
    </div>
  );

  const cur = pages[activeIdx];
  const reviewedCount = pages.filter((p) => !p.needsReview).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/admin/sar/${id}`} style={{ padding: '0.4rem 0.75rem', background: '#667eea', color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← กลับ
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#333' }}>📝 ตรวจทาน SAR #{id}</div>
          <div style={{ fontSize: '0.78rem', color: '#666' }}>
            หน้า {cur?.pageNumber}/{pages.length} · ตรวจแล้ว {reviewedCount}/{pages.length}
          </div>
        </div>
        <button
          onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          style={{ padding: '0.4rem 0.85rem', background: activeIdx === 0 ? '#e5e7eb' : '#667eea', color: activeIdx === 0 ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.4rem', cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
        >
          ← หน้าก่อน
        </button>
        <select value={activeIdx} onChange={(e) => setActiveIdx(parseInt(e.target.value, 10))} style={{ padding: '0.4rem 0.5rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.85rem' }}>
          {pages.map((p, i) => (
            <option key={p.id} value={i}>หน้า {p.pageNumber}{p.needsReview ? ' ⚠️' : ' ✓'}</option>
          ))}
        </select>
        <button
          onClick={() => setActiveIdx(Math.min(pages.length - 1, activeIdx + 1))}
          disabled={activeIdx >= pages.length - 1}
          style={{ padding: '0.4rem 0.85rem', background: activeIdx >= pages.length - 1 ? '#e5e7eb' : '#667eea', color: activeIdx >= pages.length - 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.4rem', cursor: activeIdx >= pages.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
        >
          หน้าถัดไป →
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: '0.45rem 1rem', background: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '0.4rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
        </button>
      </div>

      {/* Split pane */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', minHeight: 0 }}>
        <div style={{ borderRight: '1px solid #e5e7eb', background: '#1f2937', display: 'flex' }}>
          {docFileUrl ? (
            <embed src={`${docFileUrl}#page=${cur?.pageNumber || 1}&zoom=page-fit`} type="application/pdf" style={{ width: '100%', height: '100%' }} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              กำลังโหลด PDF...
            </div>
          )}
        </div>

        <div style={{ background: 'white', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ color: '#666' }}>วิธีสกัด: <strong>{cur?.extractMethod}</strong></span>
            {cur?.confidence !== null && <span style={{ color: '#666' }}>ความมั่นใจ: <strong>{((cur?.confidence || 0) * 100).toFixed(0)}%</strong></span>}
            {cur?.needsReview ? (
              <span style={{ padding: '0.15rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '0.25rem', fontWeight: 600 }}>⚠️ ยังไม่ตรวจ</span>
            ) : (
              <span style={{ padding: '0.15rem 0.5rem', background: '#d1fae5', color: '#065f46', borderRadius: '0.25rem', fontWeight: 600 }}>✓ ตรวจแล้ว{cur?.reviewedBy ? ` · ${cur.reviewedBy}` : ''}</span>
            )}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ข้อความที่สกัดได้จากหน้านี้ — แก้ไขได้"
            style={{
              flex: 1,
              padding: '1rem',
              border: 'none',
              outline: 'none',
              fontFamily: 'Kanit, sans-serif',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}
