// app/users/page.tsx
// User management list (admin only). Search by email/name, filter by role/school/active state.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  roles: string[];
  school: { id: number; code: string | null; nameTh: string } | null;
}

interface SchoolOption {
  id: number;
  code: string | null;
  nameTh: string | null;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  SCHOOL_ADMIN: 'แอดมินโรงเรียน',
  SCHOOL_LEADER: 'ผู้บริหาร',
  TEACHER: 'ครู',
  SUPERVISOR: 'ศึกษานิเทศก์',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'var(--de-danger-soft)', text: 'var(--de-danger)' },
  SCHOOL_ADMIN: { bg: 'var(--de-warning-soft)', text: 'var(--de-warning)' },
  SCHOOL_LEADER: { bg: 'var(--de-accent-soft)', text: 'var(--de-accent)' },
  TEACHER: { bg: 'var(--de-primary-soft)', text: 'var(--de-primary)' },
  SUPERVISOR: { bg: 'var(--de-success-soft)', text: 'var(--de-success)' },
};

const PAGE_SIZE = 20;

export default function UsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolInput, setSchoolInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resolve typed text → schoolId (matches "57030001 บ้านพญาไพร" or partial)
  const resolvedSchoolId = useMemo(() => {
    const q = schoolInput.trim();
    if (!q) return '';
    const exact = schools.find((s) => {
      const label = `${s.code || ''} ${s.nameTh || s.name || ''}`.trim();
      return label === q || s.code === q;
    });
    if (exact) return String(exact.id);
    const startsWith = schools.find((s) => (s.code || '').startsWith(q) || (s.nameTh || '').startsWith(q));
    return startsWith ? String(startsWith.id) : '';
  }, [schoolInput, schools]);

  const fetchUsers = useCallback(async (authToken: string, opts: { page: number; search: string; role: string; schoolId: string; isActive: string }) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(opts.page), limit: String(PAGE_SIZE) });
      if (opts.search) params.set('search', opts.search);
      if (opts.role) params.set('role', opts.role);
      if (opts.schoolId) params.set('schoolId', opts.schoolId);
      if (opts.isActive) params.set('isActive', opts.isActive);

      const res = await fetch(`/api/users?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)');
        setUsers([]);
        return;
      }
      if (!res.ok) throw new Error('Failed to load');

      const json = await res.json();
      if (json.success) {
        setUsers(json.data.items);
        setTotal(json.data.total);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    fetchUsers(stored, { page: 1, search: '', role: '', schoolId: '', isActive: '' });

    // Load school list for the filter dropdown
    fetch('/api/schools?isActive=true', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setSchools(j.data);
      })
      .catch(() => {});
  }, [router, fetchUsers]);

  const applyFilters = () => {
    if (!token) return;
    setPage(1);
    fetchUsers(token, { page: 1, search, role: roleFilter, schoolId: resolvedSchoolId, isActive: activeFilter });
  };

  const goToPage = (p: number) => {
    if (!token) return;
    setPage(p);
    fetchUsers(token, { page: p, search, role: roleFilter, schoolId: resolvedSchoolId, isActive: activeFilter });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: 'var(--de-bg-canvas)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--de-text-primary)', marginBottom: '0.5rem' }}>
              👥 จัดการผู้ใช้
            </h1>
            <p style={{ color: 'var(--de-text-secondary)' }}>ทั้งหมด {total.toLocaleString('th-TH')} คน</p>
          </div>
          <Link
            href="/dashboard"
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--de-primary)',
              color: 'var(--de-on-primary)',
              borderRadius: '0.5rem',
              textDecoration: 'none',
            }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div style={{
          background: 'var(--de-bg-surface)',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          alignItems: 'end',
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>ค้นหา (อีเมล/ชื่อ)</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              placeholder="เช่น admin@local"
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.9rem' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>บทบาท</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.9rem' }}
            >
              <option value="">ทั้งหมด</option>
              <option value="ADMIN">ผู้ดูแลระบบ</option>
              <option value="SCHOOL_ADMIN">แอดมินโรงเรียน</option>
              <option value="SCHOOL_LEADER">ผู้บริหาร</option>
              <option value="TEACHER">ครู</option>
              <option value="SUPERVISOR">ศึกษานิเทศก์</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>
              โรงเรียน {schoolInput.trim() && !resolvedSchoolId && (
                <span style={{ color: 'var(--de-danger)', fontSize: '0.75rem' }}>(ไม่พบ)</span>
              )}
            </span>
            <input
              list="schools-datalist"
              value={schoolInput}
              onChange={(e) => setSchoolInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
              placeholder="พิมพ์รหัสหรือชื่อโรงเรียน"
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.9rem' }}
            />
            <datalist id="schools-datalist">
              {schools.map((s) => (
                <option key={s.id} value={`${s.code || ''} ${s.nameTh || s.name || ''}`.trim()} />
              ))}
            </datalist>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>สถานะ</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.9rem' }}
            >
              <option value="">ทั้งหมด</option>
              <option value="true">ใช้งาน</option>
              <option value="false">ปิดใช้งาน</option>
            </select>
          </label>
          <button
            onClick={applyFilters}
            style={{
              padding: '0.55rem 1rem',
              background: 'var(--de-primary)',
              color: 'var(--de-on-primary)',
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
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Users table */}
        <div style={{
          background: 'var(--de-bg-surface)',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--de-bg-canvas)', borderBottom: '2px solid var(--de-border)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>ID</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>อีเมล</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>ชื่อ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>เบอร์โทร</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>บทบาท</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>โรงเรียน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>สถานะ</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--de-text-primary)' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--de-text-secondary)' }}>กำลังโหลด...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--de-text-secondary)' }}>ไม่พบผู้ใช้</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--de-border)' }}>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--de-text-secondary)' }}>#{u.id}</td>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--de-text-primary)', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{u.email}</td>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--de-text-primary)' }}>{u.name}</td>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--de-text-secondary)' }}>{u.phone || '—'}</td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {u.roles.map((r) => {
                            const c = ROLE_COLORS[r] || { bg: 'var(--de-bg-subtle)', text: 'var(--de-text-primary)' };
                            return (
                              <span key={r} style={{
                                padding: '0.15rem 0.5rem',
                                background: c.bg,
                                color: c.text,
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}>
                                {ROLE_LABELS[r] || r}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '0.6rem 1rem', color: 'var(--de-text-secondary)', fontSize: '0.8rem' }}>
                        {u.school ? `${u.school.code || ''} ${u.school.nameTh}`.trim() : '—'}
                      </td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          background: u.isActive ? 'var(--de-success-soft)' : 'var(--de-danger-soft)',
                          color: u.isActive ? 'var(--de-success)' : 'var(--de-danger)',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {u.isActive ? 'ใช้งาน' : 'ปิด'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 1rem' }}>
                        <Link
                          href={`/users/${u.id}/edit`}
                          style={{
                            padding: '0.25rem 0.7rem',
                            background: 'var(--de-primary)',
                            color: 'var(--de-on-primary)',
                            borderRadius: '0.3rem',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                          }}
                        >
                          ✏️ แก้ไข
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              style={{
                padding: '0.4rem 0.75rem',
                background: page <= 1 ? 'var(--de-border)' : 'var(--de-primary)',
                color: page <= 1 ? 'var(--de-text-tertiary)' : 'var(--de-on-primary)',
                border: 'none',
                borderRadius: '0.3rem',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ← ก่อนหน้า
            </button>
            <span style={{ padding: '0 0.6rem', fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>
              หน้า <strong>{page}</strong> / {totalPages}
            </span>
            <button
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '0.4rem 0.75rem',
                background: page >= totalPages ? 'var(--de-border)' : 'var(--de-primary)',
                color: page >= totalPages ? 'var(--de-text-tertiary)' : 'var(--de-on-primary)',
                border: 'none',
                borderRadius: '0.3rem',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
              }}
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
