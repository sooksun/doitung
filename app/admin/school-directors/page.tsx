// app/admin/school-directors/page.tsx
// Admin-only: bind / unbind a SCHOOL_LEADER user as the director of a school.
//
// Why this page exists: production was seeded with SCHOOL_LEADER users that
// don't have Teacher rows, so /evaluations/new (Thai ป.1–3 teacher-pair)
// shows "ยังไม่มี ผอ. ผูกกับโรงเรียนนี้" and can't create the pair. Rather
// than handing the admin a SQL prompt, this page lets them point each
// director at their school via a dropdown — written to the same Teacher row
// the rest of the app already uses for school binding.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

interface DirectorRow {
  userId: number;
  name: string;
  email: string;
  currentSchool: {
    id: number;
    code: string | null;
    name: string;
    nameTh: string | null;
  } | null;
}

interface SchoolOption {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
}

type StatusFilter = 'all' | 'bound' | 'unbound';

export default function AdminSchoolDirectorsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [directors, setDirectors] = useState<DirectorRow[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (authToken: string) => {
    try {
      const [dirRes, schoolRes] = await Promise.all([
        fetch('/api/admin/school-directors', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch('/api/schools?isActive=true', {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);
      if (dirRes.status === 401 || schoolRes.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (dirRes.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)');
        return;
      }
      if (!dirRes.ok || !schoolRes.ok) throw new Error('Failed');
      const dirJson = await dirRes.json();
      const schoolJson = await schoolRes.json();
      if (dirJson.success) setDirectors(dirJson.data.items);
      if (schoolJson.success) {
        setSchools(
          (schoolJson.data || []).map((s: any) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            nameTh: s.nameTh,
          })),
        );
      } else if (Array.isArray(schoolJson)) {
        setSchools(schoolJson);
      }
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  const setBinding = async (row: DirectorRow, nextSchoolId: number | null) => {
    if (!token || busy === row.userId) return;
    // Optimistic — flip the row's current school before the server confirms so
    // the dropdown reflects the choice instantly.
    const previous = row.currentSchool;
    const optimisticSchool = nextSchoolId == null
      ? null
      : schools.find((s) => s.id === nextSchoolId) || null;
    setDirectors((prev) =>
      prev.map((r) =>
        r.userId === row.userId ? { ...r, currentSchool: optimisticSchool } : r,
      ),
    );
    setBusy(row.userId);
    try {
      const res = await fetch('/api/admin/school-directors', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: row.userId, schoolId: nextSchoolId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (!res.ok || !json.success) {
        // Roll back and surface the server's message.
        setDirectors((prev) =>
          prev.map((r) =>
            r.userId === row.userId ? { ...r, currentSchool: previous } : r,
          ),
        );
        toastError(json.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      toastSuccess(json.message || 'บันทึกสำเร็จ');
    } catch {
      setDirectors((prev) =>
        prev.map((r) =>
          r.userId === row.userId ? { ...r, currentSchool: previous } : r,
        ),
      );
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(null);
    }
  };

  const handleUnbind = async (row: DirectorRow) => {
    const ok = await toastConfirm(
      `จะยกเลิกการผูก ${row.name} ออกจาก ${row.currentSchool?.nameTh || row.currentSchool?.name || 'โรงเรียนปัจจุบัน'} หรือไม่?`,
      { title: 'ยกเลิกการผูก?', confirmLabel: 'ยกเลิก', cancelLabel: 'ปิด', danger: true },
    );
    if (!ok) return;
    await setBinding(row, null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directors.filter((r) => {
      if (statusFilter === 'bound' && !r.currentSchool) return false;
      if (statusFilter === 'unbound' && r.currentSchool) return false;
      if (!q) return true;
      const hay = [r.name, r.email, r.currentSchool?.code, r.currentSchool?.nameTh, r.currentSchool?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [directors, search, statusFilter]);

  const counts = useMemo(() => ({
    total: directors.length,
    bound: directors.filter((r) => r.currentSchool).length,
    unbound: directors.filter((r) => !r.currentSchool).length,
  }), [directors]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <Link href="/dashboard" style={{ color: '#667eea', textDecoration: 'none' }}>← Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              🏫 กำหนดผู้อำนวยการประจำโรงเรียน
            </h1>
            <p style={{ color: '#666' }}>
              ผูกผู้ใช้สิทธิ์ <strong>ผู้อำนวยการ</strong> (SCHOOL_LEADER) เข้ากับโรงเรียน — เพื่อใช้เป็นผู้ประเมินคู่ของครู (Thai ป.1–3) และสิทธิ์อื่น ๆ ที่ผูกตามโรงเรียน
            </p>
          </div>
          <Link href="/dashboard" style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <SummaryCard label="ผอ. ทั้งหมด" value={counts.total} color="#667eea" />
          <SummaryCard label="ผูกโรงเรียนแล้ว" value={counts.bound} color="#10b981" />
          <SummaryCard label="ยังไม่ผูก" value={counts.unbound} color="#f59e0b" />
        </div>

        {/* Filters */}
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา (ชื่อ / อีเมล / โรงเรียน)"
            style={{ flex: '1 1 280px', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.95rem' }}
          />
          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
            {(['all', 'bound', 'unbound'] as const).map((key) => {
              const isOn = statusFilter === key;
              const label = key === 'all'
                ? `ทั้งหมด (${counts.total})`
                : key === 'bound'
                ? `ผูกแล้ว (${counts.bound})`
                : `ยังไม่ผูก (${counts.unbound})`;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    background: isOn ? '#667eea' : 'white',
                    color: isOn ? 'white' : '#374151',
                    border: '1px solid',
                    borderColor: isOn ? '#667eea' : '#d1d5db',
                    borderRadius: '0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>ผู้อำนวยการ (SCHOOL_LEADER)</th>
                <th style={thStyle}>อีเมล</th>
                <th style={thStyle}>โรงเรียนที่ผูก</th>
                <th style={{ ...thStyle, width: '100px' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                    {search || statusFilter !== 'all' ? 'ไม่พบรายการตามเงื่อนไข' : 'ยังไม่มีผู้ใช้สิทธิ์ ผอ. (SCHOOL_LEADER) ที่ใช้งาน'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.userId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#1f2937' }}>{row.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>userId: {row.userId}</div>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{row.email}</td>
                    <td style={tdStyle}>
                      <select
                        value={row.currentSchool?.id ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setBinding(row, v ? Number(v) : null);
                        }}
                        disabled={busy === row.userId}
                        style={{
                          width: '100%',
                          maxWidth: '420px',
                          padding: '0.45rem 0.6rem',
                          border: '1px solid ' + (row.currentSchool ? '#10b981' : '#fbbf24'),
                          borderRadius: '0.4rem',
                          fontSize: '0.88rem',
                          background: row.currentSchool ? '#ecfdf5' : '#fffbeb',
                          cursor: busy === row.userId ? 'wait' : 'pointer',
                        }}
                      >
                        <option value="">— ยังไม่ผูกกับโรงเรียน —</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.code ? `${s.code} ` : ''}{s.nameTh || s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      {row.currentSchool ? (
                        <button
                          onClick={() => handleUnbind(row)}
                          disabled={busy === row.userId}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: busy === row.userId ? '#e5e7eb' : '#fee2e2',
                            color: busy === row.userId ? '#9ca3af' : '#b91c1c',
                            border: '1px solid ' + (busy === row.userId ? '#e5e7eb' : '#fca5a5'),
                            borderRadius: '0.4rem',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: busy === row.userId ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ยกเลิก
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Help footer */}
        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontSize: '0.82rem', color: '#1e40af', lineHeight: 1.55 }}>
          💡 เคล็ดลับ: เลือกโรงเรียนจาก dropdown เพื่อผูก ผอ. กับโรงเรียน — ระบบจะบันทึกอัตโนมัติ
          การผูกนี้ใช้ใน <strong>/evaluations/new</strong> (สร้างการประเมินคู่ Thai ป.1–3) และตรงสิทธิ์อื่น ๆ ที่ผูกตามโรงเรียน
          ผอ. หนึ่งคนสามารถผูกได้กับโรงเรียนเดียวเท่านั้น (ถ้าต้องการย้าย เลือกโรงเรียนใหม่จาก dropdown ได้เลย)
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
  fontSize: '0.85rem',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: '#1f2937',
  verticalAlign: 'middle',
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'white',
      padding: '1rem 1.25rem',
      borderRadius: '0.5rem',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1f2937' }}>{value.toLocaleString()}</div>
    </div>
  );
}
