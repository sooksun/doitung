// app/evaluations/page.tsx
// Evaluations CRUD page

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastError, toastConfirm } from '@/lib/toast';

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
  // or on code alone, then fall back to startsWith on either field. Same
  // pattern /users uses, so admins get consistent autocomplete behaviour.
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
    // If admin typed text but nothing resolved, show a hint instead of silently
    // dropping the filter — saves them wondering "why didn't anything narrow?"
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
      // Refetch the current page so the row that backfills from the next page
      // appears in place. If we just removed the only item on a non-first page,
      // step back so the user doesn't land on an empty screen.
      const nextPage = evaluations.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      fetchEvaluations(token, nextPage, appliedSchoolId);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'DRAFT': { bg: '#fef3c7', text: '#92400e' },
      'SUBMITTED': { bg: '#d1fae5', text: '#065f46' },
      'REVIEWED': { bg: '#dbeafe', text: '#1e40af' },
      'ARCHIVED': { bg: '#e5e7eb', text: '#374151' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'DRAFT': 'ร่าง',
      'SUBMITTED': 'ส่งแล้ว',
      'REVIEWED': 'ตรวจแล้ว',
      'ARCHIVED': 'เก็บถาวร',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              ✅ การประเมิน
            </h1>
            <p style={{ color: '#666' }}>จัดการ Evaluation Sessions</p>
          </div>
          <div>
            <Link
              href="/evaluations/new"
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                marginRight: '0.5rem'
              }}
            >
              + สร้างใหม่
            </Link>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none'
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Filters — admin only. Non-admins are pinned to their own school by
            the API regardless, so the input would just confuse them. */}
        {isAdmin && (
          <div style={{
            background: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '1rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'end',
            flexWrap: 'wrap',
          }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 300px' }}>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>
                โรงเรียน {schoolInput.trim() && !resolvedSchoolId && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>(ไม่พบ)</span>
                )}
              </span>
              <input
                list="schools-datalist"
                value={schoolInput}
                onChange={(e) => setSchoolInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applySchoolFilter(); }}
                placeholder="พิมพ์รหัสหรือชื่อโรงเรียน (เช่น 57030136 หรือ บ้านห้วยอื้น)"
                style={{
                  padding: '0.5rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '0.4rem',
                  fontSize: '0.9rem',
                }}
              />
              <datalist id="schools-datalist">
                {schools.map((s) => (
                  <option key={s.id} value={`${s.code || ''} ${s.nameTh || s.name || ''}`.trim()} />
                ))}
              </datalist>
            </label>
            <button
              onClick={applySchoolFilter}
              style={{
                padding: '0.55rem 1.1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '0.4rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                height: 'fit-content',
              }}
            >
              🔍 ค้นหา
            </button>
            {appliedSchoolId && (
              <button
                onClick={clearSchoolFilter}
                style={{
                  padding: '0.55rem 1rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.4rem',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  height: 'fit-content',
                }}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee',
            color: '#c33',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Evaluations Table */}
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>เครื่องมือ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>โรงเรียน</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>ผู้กรอกแบบประเมิน</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>สถานะ</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>วันที่สร้าง</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => {
                const statusColor = getStatusColor(evaluation.status);
                return (
                  <tr key={evaluation.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', color: '#666' }}>#{evaluation.id}</td>
                    <td style={{ padding: '1rem', color: '#333', fontWeight: '500' }}>
                      {evaluation.instrument?.nameTh || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', color: '#666' }}>
                      {evaluation.school?.nameTh || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', color: '#333', fontSize: '0.9rem' }}>
                      {evaluation.evaluator?.name || '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        {getStatusLabel(evaluation.status)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#666', fontSize: '0.875rem' }}>
                      {new Date(evaluation.createdAt).toLocaleDateString('th-TH')}
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {evaluation.status === 'DRAFT' && (meId === evaluation.evaluatorId || isAdmin) && (
                        <Link
                          href={`/assessment/${evaluation.id}`}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#7c3aed',
                            color: 'white',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                            fontSize: '0.875rem'
                          }}
                        >
                          กรอกแบบประเมิน
                        </Link>
                      )}
                      <Link
                        href={`/evaluations/${evaluation.id}`}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '0.25rem',
                          textDecoration: 'none',
                          fontSize: '0.875rem'
                        }}
                      >
                        บันทึกสะท้อนคิด
                      </Link>
                      {(meId === evaluation.evaluatorId || isAdmin) && evaluation.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleClear(evaluation.id)}
                          title="ซ่อนรายการนี้ (Soft delete — ข้อมูลยังอยู่ในระบบ)"
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                          }}
                        >
                          🗑️ เคลียร์
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {evaluations.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              ไม่พบข้อมูลการประเมิน
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
              แสดง {(evaluations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1).toLocaleString('th-TH')}
              {' – '}
              {((page - 1) * PAGE_SIZE + evaluations.length).toLocaleString('th-TH')}
              {' จากทั้งหมด '}
              <strong>{total.toLocaleString('th-TH')}</strong>
              {' รายการ'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => goToPage(1)}
                disabled={page <= 1 || loading}
                title="หน้าแรก"
                style={{
                  padding: '0.4rem 0.75rem',
                  background: page <= 1 || loading ? '#e5e7eb' : '#667eea',
                  color: page <= 1 || loading ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '0.3rem',
                  cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                «
              </button>
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1 || loading}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: page <= 1 || loading ? '#e5e7eb' : '#667eea',
                  color: page <= 1 || loading ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '0.3rem',
                  cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                ← ก่อนหน้า
              </button>
              <span style={{ padding: '0 0.6rem', fontSize: '0.85rem', color: '#666' }}>
                หน้า <strong>{page}</strong> / {totalPages}
              </span>
              <button
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loading}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: page >= totalPages || loading ? '#e5e7eb' : '#667eea',
                  color: page >= totalPages || loading ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '0.3rem',
                  cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                ถัดไป →
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={page >= totalPages || loading}
                title="หน้าสุดท้าย"
                style={{
                  padding: '0.4rem 0.75rem',
                  background: page >= totalPages || loading ? '#e5e7eb' : '#667eea',
                  color: page >= totalPages || loading ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '0.3rem',
                  cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

