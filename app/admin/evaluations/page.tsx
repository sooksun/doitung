// app/admin/evaluations/page.tsx
// Admin-only: manage submitted evaluations. Reset (un-submit so the user can
// edit again), cancel (soft-archive so it disappears from dashboards), or
// restore an archived row back to DRAFT.
//
// The same actions exist piece-meal on /evaluations and via PATCH, but admins
// need a one-screen view of "what got submitted" to roll back mistakes — that
// view is this page.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

type EvalStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';

interface EvalRow {
  id: number;
  status: EvalStatus;
  createdAt: string;
  submittedAt: string | null;
  evaluatorId: number;
  instrument?: { nameTh: string | null; type: string };
  school?: { code: string | null; nameTh: string | null; name: string };
  evaluator?: { id: number; name: string; email: string | null };
}

const STATUS_OPTIONS: Array<{ value: EvalStatus | 'ALL'; label: string }> = [
  { value: 'SUBMITTED', label: 'ส่งแล้ว' },
  { value: 'REVIEWED', label: 'ตรวจแล้ว' },
  { value: 'DRAFT', label: 'ร่าง' },
  { value: 'ARCHIVED', label: 'เก็บถาวร / ยกเลิก' },
  { value: 'ALL', label: 'ทั้งหมด' },
];

const STATUS_STYLE: Record<EvalStatus, { bg: string; fg: string; label: string }> = {
  DRAFT:     { bg: '#fef3c7', fg: '#92400e', label: 'ร่าง' },
  SUBMITTED: { bg: '#d1fae5', fg: '#065f46', label: 'ส่งแล้ว' },
  REVIEWED:  { bg: '#dbeafe', fg: '#1e40af', label: 'ตรวจแล้ว' },
  ARCHIVED:  { bg: '#e5e7eb', fg: '#374151', label: 'ยกเลิก/เก็บถาวร' },
};

const PAGE_SIZE = 25;

export default function AdminEvaluationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<EvalStatus | 'ALL'>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchRows = useCallback(
    async (authToken: string, opts: { page: number; status: EvalStatus | 'ALL' }) => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({ page: String(opts.page), limit: String(PAGE_SIZE) });
        if (opts.status === 'ARCHIVED') {
          qs.set('status', 'ARCHIVED');
        } else if (opts.status === 'ALL') {
          qs.set('includeArchived', 'true');
        } else {
          qs.set('status', opts.status);
        }

        const res = await fetch(`/api/evaluations?${qs}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)');
          setRows([]);
          return;
        }
        if (!res.ok) {
          setError('โหลดข้อมูลไม่สำเร็จ');
          return;
        }
        const json = await res.json();
        if (json.success) {
          setRows(json.data.items || []);
          setTotal(json.data.total ?? 0);
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    fetchRows(stored, { page: 1, status: 'SUBMITTED' });
  }, [router, fetchRows]);

  const applyFilter = (status: EvalStatus | 'ALL') => {
    if (!token) return;
    setStatusFilter(status);
    setPage(1);
    fetchRows(token, { page: 1, status });
  };

  const goToPage = (p: number) => {
    if (!token) return;
    setPage(p);
    fetchRows(token, { page: p, status: statusFilter });
  };

  const refreshCurrent = () => {
    if (!token) return;
    fetchRows(token, { page, status: statusFilter });
  };

  const handleReset = async (row: EvalRow) => {
    if (!token) return;
    const ok = await toastConfirm(
      `Reset การประเมิน #${row.id} กลับเป็นร่าง?\n\nผู้กรอก (${row.evaluator?.name || '—'}) จะสามารถแก้ไขและส่งใหม่ได้ — คำตอบเดิมไม่ถูกลบ`,
      { title: 'Reset เป็นร่าง', confirmLabel: 'Reset', cancelLabel: 'ยกเลิก' },
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/evaluations/${row.id}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'Reset ไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'Reset เรียบร้อย');
      refreshCurrent();
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (row: EvalRow) => {
    if (!token) return;
    const ok = await toastConfirm(
      `ยกเลิก/เก็บถาวรการประเมิน #${row.id}?\n\nรายการจะถูกซ่อนจาก Dashboard และรายการประเมิน — คำตอบยังถูกเก็บไว้ (admin กู้คืนได้)`,
      { title: 'ยกเลิกการประเมิน', confirmLabel: 'ยกเลิก/เก็บถาวร', cancelLabel: 'ปิด', danger: true },
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/evaluations/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'ยกเลิกไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'ยกเลิกเรียบร้อย');
      refreshCurrent();
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (row: EvalRow) => {
    if (!token) return;
    const ok = await toastConfirm(
      `กู้คืนการประเมิน #${row.id} กลับเป็นร่าง?\n\nรายการจะกลับมาแสดงในรายการ (สถานะ: ร่าง) — ผู้กรอกแก้ไขและส่งใหม่ได้`,
      { title: 'กู้คืนการประเมิน', confirmLabel: 'กู้คืน', cancelLabel: 'ปิด' },
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/evaluations/${row.id}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'กู้คืนไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'กู้คืนเรียบร้อย');
      refreshCurrent();
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.evaluator?.name,
        r.evaluator?.email,
        r.school?.code,
        r.school?.nameTh,
        r.school?.name,
        r.instrument?.nameTh,
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              🔄 จัดการการประเมินที่ส่งแล้ว
            </h1>
            <p style={{ color: '#666' }}>
              Reset / ยกเลิก / กู้คืน — สำหรับ admin เมื่อ user กดส่งโดยพลาดและต้องการแก้ไข
            </p>
          </div>
          <Link
            href="/dashboard"
            style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Status tabs */}
        <div style={{
          background: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}>
          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((opt) => {
              const isOn = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => applyFilter(opt.value)}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    background: isOn ? '#667eea' : 'white',
                    color: isOn ? 'white' : '#374151',
                    border: '1px solid',
                    borderColor: isOn ? '#667eea' : '#d1d5db',
                    borderRadius: '0.4rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: loading ? 'wait' : 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 ค้นหา (ผู้กรอก / อีเมล / โรงเรียน / เครื่องมือ)"
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem',
                border: '1px solid #ddd',
                borderRadius: '0.4rem',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>เครื่องมือ</th>
                  <th style={thStyle}>โรงเรียน</th>
                  <th style={thStyle}>ผู้กรอก</th>
                  <th style={thStyle}>สถานะ</th>
                  <th style={thStyle}>วันที่สร้าง</th>
                  <th style={thStyle}>วันที่ส่ง</th>
                  <th style={{ ...thStyle, minWidth: '200px' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    {search ? 'ไม่พบรายการตามคำค้น' : 'ไม่มีรายการในสถานะนี้'}
                  </td></tr>
                ) : (
                  filtered.map((row) => {
                    const st = STATUS_STYLE[row.status];
                    const busy = busyId === row.id;
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={tdStyle}>
                          <Link
                            href={`/evaluations/${row.id}`}
                            style={{ color: '#667eea', textDecoration: 'none' }}
                          >
                            #{row.id}
                          </Link>
                        </td>
                        <td style={tdStyle}>{row.instrument?.nameTh || '—'}</td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{row.school?.code || ''}</div>
                          <div>{row.school?.nameTh || row.school?.name || '—'}</div>
                        </td>
                        <td style={tdStyle}>
                          <div>{row.evaluator?.name || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{row.evaluator?.email || ''}</div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            background: st.bg,
                            color: st.fg,
                            borderRadius: '0.25rem',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8rem' }}>
                          {new Date(row.createdAt).toLocaleDateString('th-TH')}
                        </td>
                        <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8rem' }}>
                          {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('th-TH') : '—'}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {(row.status === 'SUBMITTED' || row.status === 'REVIEWED') && (
                              <button
                                onClick={() => handleReset(row)}
                                disabled={busy}
                                title="กลับเป็นร่าง — ผู้กรอกสามารถแก้ไขและส่งใหม่"
                                style={actionBtn('#6366f1', '#eef2ff', busy)}
                              >
                                ↩ Reset
                              </button>
                            )}
                            {row.status === 'ARCHIVED' ? (
                              <button
                                onClick={() => handleRestore(row)}
                                disabled={busy}
                                title="กู้คืนกลับเป็นร่าง"
                                style={actionBtn('#10b981', '#ecfdf5', busy)}
                              >
                                ↻ กู้คืน
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(row)}
                                disabled={busy}
                                title="ซ่อนจาก Dashboard (soft-delete)"
                                style={actionBtn('#dc2626', '#fee2e2', busy)}
                              >
                                📦 ยกเลิก
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              style={pageBtn(page <= 1 || loading)}
            >
              ← ก่อนหน้า
            </button>
            <span style={{ padding: '0 0.6rem', fontSize: '0.85rem', color: '#666' }}>
              หน้า <strong>{page}</strong> / {totalPages} (รวม {total.toLocaleString('th-TH')})
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              style={pageBtn(page >= totalPages || loading)}
            >
              ถัดไป →
            </button>
          </div>
        )}

        {/* Help footer */}
        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.55 }}>
          💡 <strong>Reset</strong> = กลับเป็นร่าง (`DRAFT`) ผู้กรอกแก้ไขและส่งใหม่ได้ — คำตอบเดิมไม่ถูกลบ ·
          <strong> ยกเลิก</strong> = ซ่อนจาก Dashboard (`ARCHIVED`) ข้อมูลยังอยู่ในระบบ ·
          <strong> กู้คืน</strong> = นำกลับมาเป็นร่าง
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: '0.82rem',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '0.7rem 1rem',
  color: '#1f2937',
  verticalAlign: 'top',
};

function actionBtn(fg: string, bg: string, busy: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    background: busy ? '#e5e7eb' : bg,
    color: busy ? '#9ca3af' : fg,
    border: '1px solid ' + (busy ? '#e5e7eb' : fg),
    borderRadius: '0.3rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: busy ? 'wait' : 'pointer',
    whiteSpace: 'nowrap',
  };
}

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.85rem',
    background: disabled ? '#e5e7eb' : '#667eea',
    color: disabled ? '#9ca3af' : 'white',
    border: 'none',
    borderRadius: '0.3rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  };
}
