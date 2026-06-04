// app/evaluations/page.tsx
// Evaluations CRUD page. UI redesigned to the TSQMn DE kit; all data fetching,
// server-side pagination, school filtering, row actions and auth are unchanged.

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toastError, toastConfirm } from '@/lib/toast';
import { PageHeader, Card, Badge, Button, DeIcon, type BadgeTone } from '@/app/components/de';

interface Evaluation {
  id: number;
  instrumentId: number;
  schoolId: number;
  academicYearId: number;
  termId: number | null;
  evaluatorId: number;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  instrument?: {
    nameTh: string;
    type: string;
  };
  school?: {
    nameTh: string | null;
  };
  evaluator?: {
    id: number;
    name: string;
    email: string | null;
  };
}

interface SchoolOption {
  id: number;
  code: string | null;
  nameTh: string | null;
  name: string;
}

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'ร่าง',
  SUBMITTED: 'ส่งแล้ว',
  REVIEWED: 'ตรวจแล้ว',
  ARCHIVED: 'เก็บถาวร',
};
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'success',
  REVIEWED: 'blue',
  ARCHIVED: 'neutral',
};
const instrumentTone = (type?: string): BadgeTone =>
  type === 'Q_MODEL' ? 'brand' : type === 'DERS' ? 'blue' : 'neutral';

const th = (extra?: React.CSSProperties): React.CSSProperties => ({
  textAlign: 'left', padding: '13px 18px', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: 'var(--de-text-secondary)', whiteSpace: 'nowrap', ...extra,
});
const td: React.CSSProperties = { padding: '14px 18px', fontSize: 14.5, color: 'var(--de-text-primary)', verticalAlign: 'middle' };
const pgBtn = (disabled: boolean): React.CSSProperties => ({
  minWidth: 36, height: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
  borderRadius: 'var(--r-md)', border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)',
  color: 'var(--de-text-primary)', fontSize: 13.5, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
});

export default function EvaluationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meId, setMeId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // School filter — admin only. Non-admins are scoped to their own school
  // server-side regardless of what we send, so the input would be misleading.
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolInput, setSchoolInput] = useState('');
  const [appliedSchoolId, setAppliedSchoolId] = useState<string>('');

  // Resolve the typed text to a schoolId — exact match on "<code> <nameTh>"
  // or on code alone, then fall back to startsWith on either field.
  const resolvedSchoolId = useMemo(() => {
    const q = schoolInput.trim();
    if (!q) return '';
    const exact = schools.find((s) => {
      const label = `${s.code || ''} ${s.nameTh || s.name || ''}`.trim();
      return label === q || s.code === q;
    });
    if (exact) return String(exact.id);
    const startsWith = schools.find(
      (s) => (s.code || '').startsWith(q) || (s.nameTh || '').startsWith(q),
    );
    return startsWith ? String(startsWith.id) : '';
  }, [schoolInput, schools]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    // Identify the current user so we can decide whose row gets the edit button.
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data) {
          setMeId(j.data.id);
          const admin = Array.isArray(j.data.roles) && j.data.roles.includes('ADMIN');
          setIsAdmin(admin);
          // Lazy-load schools only when the filter would actually appear.
          if (admin) {
            fetch('/api/schools?isActive=true', { headers: { Authorization: `Bearer ${storedToken}` } })
              .then((r) => r.json())
              .then((sj) => {
                if (sj?.success && Array.isArray(sj.data)) setSchools(sj.data);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
    fetchEvaluations(storedToken, 1, '');
  }, [router]);

  const fetchEvaluations = async (authToken: string, pageNum: number, schoolId: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
      if (schoolId) qs.set('schoolId', schoolId);
      const res = await fetch(`/api/evaluations?${qs}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch evaluations');
      }

      const data = await res.json();
      if (data.success && data.data?.items) {
        setEvaluations(data.data.items);
        setTotal(data.data.total ?? data.data.items.length);
      } else if (Array.isArray(data)) {
        setEvaluations(data);
        setTotal(data.length);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (p: number) => {
    if (!token) return;
    setPage(p);
    fetchEvaluations(token, p, appliedSchoolId);
  };

  const applySchoolFilter = () => {
    if (!token) return;
    if (schoolInput.trim() && !resolvedSchoolId) {
      toastError('ไม่พบโรงเรียนที่ตรงกับคำค้น');
      return;
    }
    setAppliedSchoolId(resolvedSchoolId);
    setPage(1);
    fetchEvaluations(token, 1, resolvedSchoolId);
  };

  const clearSchoolFilter = () => {
    if (!token) return;
    setSchoolInput('');
    setAppliedSchoolId('');
    setPage(1);
    fetchEvaluations(token, 1, '');
  };

  const handleClear = async (id: number) => {
    if (!token) return;
    const ok = await toastConfirm(
      `ต้องการเคลียร์รายการประเมิน #${id} ใช่หรือไม่?\n\nรายการจะถูกซ่อนจากหน้านี้ทันที — คะแนนและความคิดเห็นยังถูกเก็บไว้ในระบบ (admin กู้คืนได้)`,
      { title: 'เคลียร์รายการประเมิน', confirmLabel: 'เคลียร์', danger: true }
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/evaluations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'เคลียร์ไม่สำเร็จ');
        return;
      }
      const nextPage = evaluations.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      fetchEvaluations(token, nextPage, appliedSchoolId);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ width: 34, height: 34, border: '3px solid var(--de-border-strong)', borderTopColor: 'var(--de-primary)', borderRadius: '50%', animation: 'de-spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--de-text-secondary)' }}>กำลังโหลดข้อมูล…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="รายการประเมิน"
        subtitle="การประเมินทั้งหมดในระบบ"
        actions={<Button variant="primary" icon="plus" onClick={() => router.push('/evaluations/new')}>สร้างการประเมิน</Button>}
      />

      {/* Filters — admin only. Non-admins are pinned to their own school by the API. */}
      {isAdmin ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 14px', background: 'var(--de-bg-surface)', border: `1px solid ${schoolInput.trim() && !resolvedSchoolId ? 'var(--de-danger)' : 'var(--de-border)'}`, borderRadius: 'var(--r-md)', minWidth: 260, flex: '1 1 320px', maxWidth: 440 }}>
            <DeIcon name="school" size={18} style={{ color: 'var(--de-text-tertiary)' }} />
            <input
              list="schools-datalist"
              value={schoolInput}
              onChange={(e) => setSchoolInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applySchoolFilter(); }}
              placeholder="พิมพ์รหัสหรือชื่อโรงเรียน (เช่น 57030136 หรือ บ้านห้วยอื้น)"
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: 'var(--de-text-primary)', minWidth: 0 }}
            />
            <datalist id="schools-datalist">
              {schools.map((s) => (
                <option key={s.id} value={`${s.code || ''} ${s.nameTh || s.name || ''}`.trim()} />
              ))}
            </datalist>
          </div>
          <Button variant="outline" icon="search" onClick={applySchoolFilter}>ค้นหา</Button>
          {appliedSchoolId ? <Button variant="ghost" onClick={clearSchoolFilter}>ล้างตัวกรอง</Button> : null}
          {schoolInput.trim() && !resolvedSchoolId ? <span style={{ fontSize: 13, color: 'var(--de-danger)' }}>ไม่พบโรงเรียน</span> : null}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeIcon name="alert" size={16} /> {error}
        </div>
      ) : null}

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--r-lg)', border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ background: 'var(--de-bg-subtle)' }}>
              <th style={th({ width: 90 })}>รหัส</th>
              <th style={th()}>เครื่องมือ</th>
              <th style={th()}>โรงเรียน</th>
              <th style={th()}>ผู้กรอกแบบประเมิน</th>
              <th style={th()}>สถานะ</th>
              <th style={th({ width: 120 })}>วันที่สร้าง</th>
              <th style={th({ textAlign: 'right' })}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((ev) => {
              const canEdit = meId === ev.evaluatorId || isAdmin;
              return (
                <tr key={ev.id} className="de-table-row" style={{ borderTop: '1px solid var(--de-border)' }}>
                  <td style={{ ...td, fontFamily: 'var(--de-font-mono)', fontSize: 13, color: 'var(--de-text-secondary)' }}>#{ev.id}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{ev.instrument?.nameTh || 'N/A'}</span>
                      {ev.instrument?.type ? <Badge tone={instrumentTone(ev.instrument.type)}>{ev.instrument.type === 'Q_MODEL' ? 'Q-Model' : ev.instrument.type === 'THAI_P1_3' ? 'THAI ป.1–3' : ev.instrument.type}</Badge> : null}
                    </div>
                  </td>
                  <td style={{ ...td, color: 'var(--de-text-secondary)' }}>{ev.school?.nameTh || '—'}</td>
                  <td style={td}>{ev.evaluator?.name || '—'}</td>
                  <td style={td}><Badge tone={STATUS_TONE[ev.status] || 'neutral'} dot>{STATUS_LABEL[ev.status] || ev.status}</Badge></td>
                  <td style={{ ...td, color: 'var(--de-text-secondary)', fontSize: 13.5 }}>{new Date(ev.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {ev.status === 'DRAFT' && canEdit ? (
                        <Button size="sm" variant="gradient" icon="edit" onClick={() => router.push(`/assessment/${ev.id}`)}>กรอกแบบประเมิน</Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => router.push(`/evaluations/${ev.id}`)}>บันทึกสะท้อนคิด</Button>
                      {canEdit && ev.status !== 'ARCHIVED' ? (
                        <Button size="sm" variant="ghost" icon="trash" onClick={() => handleClear(ev.id)} style={{ color: 'var(--de-danger)' }} title="ซ่อนรายการนี้ (Soft delete — ข้อมูลยังอยู่ในระบบ)">เคลียร์</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {evaluations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '56px 20px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--de-text-tertiary)' }}>
                    <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--de-bg-subtle)', display: 'grid', placeItems: 'center' }}><DeIcon name="clipboard" size={26} /></span>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--de-text-secondary)' }}>ไม่พบข้อมูลการประเมิน</div>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination (server-side) */}
      {total > 0 ? (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13.5, color: 'var(--de-text-secondary)' }}>
            แสดง {(evaluations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1).toLocaleString('th-TH')}
            {' – '}{((page - 1) * PAGE_SIZE + evaluations.length).toLocaleString('th-TH')}
            {' จากทั้งหมด '}<strong>{total.toLocaleString('th-TH')}</strong>{' รายการ'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => goToPage(1)} disabled={page <= 1 || loading} title="หน้าแรก" style={pgBtn(page <= 1 || loading)}>«</button>
            <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1 || loading} style={pgBtn(page <= 1 || loading)}><DeIcon name="chevronLeft" size={16} /></button>
            <span style={{ padding: '0 8px', fontSize: 13.5, color: 'var(--de-text-secondary)' }}>หน้า <strong>{page}</strong> / {totalPages}</span>
            <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading} style={pgBtn(page >= totalPages || loading)}><DeIcon name="chevronRight" size={16} /></button>
            <button onClick={() => goToPage(totalPages)} disabled={page >= totalPages || loading} title="หน้าสุดท้าย" style={pgBtn(page >= totalPages || loading)}>»</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
