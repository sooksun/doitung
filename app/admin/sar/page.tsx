// app/admin/sar/page.tsx
// คลังข้อมูลการระดมสมอง — list documents (admin sees all, school_leader sees own).
// (Routes / API paths / model names still use the historical "SAR" naming
//  internally; only the visible labels were rebranded to "การระดมสมอง".)

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

interface SarRow {
  id: number;
  schoolCode: string | null;
  schoolName: string;
  academicYear: string;
  level: 'EARLY_CHILDHOOD' | 'BASIC_EDUCATION';
  originalFilename: string | null;
  hasFile: boolean;
  hasBodyText: boolean;
  bodyTextLength: number;
  status: string;
  extractionMethod: string | null;
  textQualityScore: number | null;
  pageCount: number | null;
  pagesStored: number;
  versions: number;
  uploadedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

const LEVEL_LABEL: Record<string, string> = {
  EARLY_CHILDHOOD: 'ปฐมวัย',
  BASIC_EDUCATION: 'ขั้นพื้นฐาน',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  UPLOADED: { bg: '#fef3c7', text: '#92400e', label: 'รออัปโหลด/รอประมวลผล' },
  EXTRACTING: { bg: '#dbeafe', text: '#1e40af', label: 'กำลังประมวลผล' },
  NEEDS_REVIEW: { bg: '#fde68a', text: '#92400e', label: 'รอตรวจทาน' },
  APPROVED: { bg: '#d1fae5', text: '#065f46', label: 'ยืนยันแล้ว' },
  ARCHIVED: { bg: '#e5e7eb', text: '#374151', label: 'เก็บถาวร' },
};

export default function SarListPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Rows optimistically hidden from the table — used to filter the result of
  // every load() so a polling refresh that races with a DELETE can't briefly
  // resurrect a row the user just archived. Entries are added before the
  // DELETE fetch and only removed if the server rejects (revert).
  const hiddenIdsRef = useRef<Set<number>>(new Set());

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/sar-documents', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้'); return; }
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (json.success) {
        const items = json.data.items as SarRow[];
        setRows(hiddenIdsRef.current.size > 0
          ? items.filter((r) => !hiddenIdsRef.current.has(r.id))
          : items);
      }
    } catch {
      setError('โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    // Read role from cached login payload — same convention as /admin/sar/new.
    // The DELETE endpoint is the real gate; this only controls button visibility.
    const me = localStorage.getItem('user');
    if (me) {
      try {
        const parsed = JSON.parse(me);
        setIsAdmin(Array.isArray(parsed.roles) && parsed.roles.includes('ADMIN'));
      } catch { /* keep default false */ }
    }
    load(stored);
  }, [router, load]);

  // Auto-refresh while any document is in EXTRACTING state
  useEffect(() => {
    if (!token) return;
    const hasInProgress = rows.some((r) => r.status === 'EXTRACTING' || r.status === 'UPLOADED');
    if (!hasInProgress) return;
    const id = setInterval(() => load(token), 4000);
    return () => clearInterval(id);
  }, [token, rows, load]);

  // Soft-delete: backend flips status to ARCHIVED; the row is then hidden by
  // the default listing query. The original file, body text, iceberg JSON,
  // pages, and version history all remain on disk / in the DB so we can
  // surface them again later if needed (e.g. via ?includeArchived=true).
  const softDelete = async (row: SarRow) => {
    if (!token || deletingId === row.id) return;
    const label = `#${row.id} ${row.schoolCode ? row.schoolCode + ' ' : ''}${row.schoolName} · ปี ${row.academicYear} · ${LEVEL_LABEL[row.level] || row.level}`;
    const ok = await toastConfirm(
      `${label}\n\nรายการนี้จะถูกเก็บถาวรและไม่แสดงในรายการอีก\n(ข้อมูลเดิม / ไฟล์ / เวอร์ชัน ยังเก็บไว้ครบ)`,
      { title: 'ลบรายการระดมสมอง?', confirmLabel: 'ลบ', cancelLabel: 'ยกเลิก', danger: true }
    );
    if (!ok) return;

    setDeletingId(row.id);
    // Optimistic remove from view + register in hiddenIdsRef so any polling
    // load() that lands during the DELETE round-trip filters this row out.
    hiddenIdsRef.current.add(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    try {
      const res = await fetch(`/api/admin/sar-documents/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        // Server rejected — drop from hidden set and re-fetch to restore.
        hiddenIdsRef.current.delete(row.id);
        toastError(json.error || 'ลบไม่สำเร็จ');
        load(token);
      } else {
        // Success — keep id in hiddenIdsRef so a stale in-flight poll
        // response (started before the DELETE finished) can't bring it back.
        toastSuccess('ลบรายการแล้ว (เก็บถาวร)');
      }
    } catch {
      hiddenIdsRef.current.delete(row.id);
      toastError('เกิดข้อผิดพลาด');
      load(token);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              📚 คลังข้อมูลการระดมสมอง
            </h1>
            <p style={{ color: '#666' }}>
              ดูประวัติการระดมสมองของแต่ละโรงเรียน ปีการศึกษา · บันทึกใหม่ด้วย Iceberg Model 4 ชั้น × 2 ด้าน + Sticky Notes ระดมสมอง · แนบไฟล์ PDF ได้ · เก็บเวอร์ชันทุกครั้งที่บันทึก
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/admin/sar/new" style={{ padding: '0.55rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600 }}>
              + บันทึกการระดมสมองใหม่
            </Link>
            <Link href="/dashboard" style={{ padding: '0.55rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>โรงเรียน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ปี</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ระดับ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>ที่มาข้อมูล</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>สถานะ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>หน้า</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>คุณภาพข้อความ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>เวอร์ชัน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>ยังไม่มีข้อมูลการระดมสมอง — กดปุ่ม &quot;+ บันทึกการระดมสมองใหม่&quot; เพื่อเริ่ม</td></tr>
                ) : rows.map((r) => {
                  const sc = STATUS_COLORS[r.status] || { bg: '#f3f4f6', text: '#6b7280', label: r.status };
                  const qScore = r.textQualityScore !== null ? `${(r.textQualityScore * 100).toFixed(0)}%` : '—';
                  const fileLabel = r.originalFilename
                    ? (r.originalFilename.length > 24 ? r.originalFilename.slice(0, 24) + '…' : r.originalFilename)
                    : null;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.6rem 1rem', color: '#666' }}>#{r.id}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#333', fontSize: '0.85rem' }}>{r.schoolCode ? `${r.schoolCode} ` : ''}{r.schoolName}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#666' }}>{r.academicYear}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#333' }}>{LEVEL_LABEL[r.level] || r.level}</td>
                      <td style={{ padding: '0.6rem 1rem', color: '#666', fontSize: '0.8rem' }} title={r.originalFilename || ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {r.hasFile && fileLabel && <span>📎 {fileLabel}</span>}
                          {r.hasBodyText && <span style={{ color: '#7c3aed' }}>📝 ข้อความ {r.bodyTextLength.toLocaleString()} ตัวอักษร</span>}
                          {!r.hasFile && !r.hasBodyText && <span style={{ color: '#dc2626' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                        <span style={{ padding: '0.2rem 0.6rem', background: sc.bg, color: sc.text, borderRadius: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>
                        {r.pagesStored}/{r.pageCount ?? '?'}
                      </td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>{qScore}</td>
                      <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#666' }}>v{r.versions}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <Link href={`/admin/sar/${r.id}`} style={{ padding: '0.25rem 0.7rem', background: '#667eea', color: 'white', borderRadius: '0.3rem', textDecoration: 'none', fontSize: '0.8rem' }}>
                            เปิด
                          </Link>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => softDelete(r)}
                              disabled={deletingId === r.id}
                              title="ลบรายการนี้ (Soft Delete — ข้อมูลเดิมยังเก็บไว้)"
                              style={{
                                padding: '0.25rem 0.7rem',
                                background: deletingId === r.id ? '#fca5a5' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.3rem',
                                fontSize: '0.8rem',
                                cursor: deletingId === r.id ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              {deletingId === r.id ? 'กำลังลบ...' : 'ลบ'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
