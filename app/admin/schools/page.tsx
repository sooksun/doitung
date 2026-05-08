// app/admin/schools/page.tsx
// Admin-only: toggle a school's isActive flag.
//
// Inactive schools disappear from the dashboards' default scope filters and
// from non-admin school pickers, but their historical data stays intact and
// can be re-surfaced by re-activating. Patterned closely on the existing
// /admin/settings/feature-flags page so admins see a familiar UI.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface SchoolRow {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
  province: string | null;
  district: string | null;
  isActive: boolean;
  sessionCount: number;
  networkCount: number;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminSchoolsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/schools', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)');
        return;
      }
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (json.success) setRows(json.data.items);
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

  const toggle = async (school: SchoolRow, nextValue: boolean) => {
    if (!token || busy === school.id) return;

    if (!nextValue && school.sessionCount > 0) {
      const ok = window.confirm(
        `โรงเรียน "${school.nameTh || school.name}" มีการประเมิน ${school.sessionCount} รายการ\n\n` +
        `การปิดใช้งานจะซ่อนโรงเรียนนี้จาก dashboard และตัวเลือกทั่วไป (ข้อมูลเดิมยังอยู่ครบ)\n\n` +
        `ยืนยันปิดใช้งาน?`
      );
      if (!ok) return;
    }

    setBusy(school.id);
    // optimistic
    setRows((prev) => prev.map((r) => r.id === school.id ? { ...r, isActive: nextValue } : r));

    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextValue }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'อัปเดตไม่สำเร็จ');
        setRows((prev) => prev.map((r) => r.id === school.id ? { ...r, isActive: !nextValue } : r));
      } else {
        toastSuccess(nextValue ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
      }
    } catch {
      toastError('เกิดข้อผิดพลาด');
      setRows((prev) => prev.map((r) => r.id === school.id ? { ...r, isActive: !nextValue } : r));
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'active' && !r.isActive) return false;
      if (statusFilter === 'inactive' && r.isActive) return false;
      if (!q) return true;
      const hay = [r.code, r.name, r.nameTh, r.province, r.district].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const counts = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.isActive).length,
    inactive: rows.filter((r) => !r.isActive).length,
  }), [rows]);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              🏫 ตั้งค่าการใช้งานโรงเรียน
            </h1>
            <p style={{ color: '#666' }}>
              เปิด/ปิด การแสดงผลและการใช้งานของแต่ละโรงเรียน — ข้อมูลเดิมจะถูกเก็บไว้ครบเสมอ
            </p>
          </div>
          <Link href="/dashboard" style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <SummaryCard label="โรงเรียนทั้งหมด" value={counts.total} color="#667eea" />
          <SummaryCard label="ใช้งานอยู่" value={counts.active} color="#10b981" />
          <SummaryCard label="ปิดใช้งาน" value={counts.inactive} color="#9ca3af" />
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
            placeholder="ค้นหา (รหัส / ชื่อ / จังหวัด / อำเภอ)"
            style={{ flex: '1 1 280px', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.95rem' }}
          />
          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
            {(['all', 'active', 'inactive'] as const).map((key) => {
              const isOn = statusFilter === key;
              const label = key === 'all' ? `ทั้งหมด (${counts.total})` :
                key === 'active' ? `ใช้งาน (${counts.active})` :
                `ปิด (${counts.inactive})`;
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

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={th}>รหัส</th>
                  <th style={th}>โรงเรียน</th>
                  <th style={th}>จังหวัด / อำเภอ</th>
                  <th style={{ ...th, textAlign: 'center' }}>กิจกรรมประเมิน</th>
                  <th style={{ ...th, textAlign: 'center' }}>กลุ่มเครือข่าย</th>
                  <th style={{ ...th, textAlign: 'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>ไม่พบโรงเรียน</td></tr>
                ) : filtered.map((r) => {
                  const dimmed = !r.isActive;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb', background: dimmed ? '#fafafa' : 'white' }}>
                      <td style={{ ...td, color: '#666', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>
                        {r.code || '-'}
                      </td>
                      <td style={{ ...td, color: dimmed ? '#9ca3af' : '#1f2937', fontWeight: 500 }}>
                        {r.nameTh || r.name}
                        {r.nameTh && r.name && r.nameTh !== r.name && (
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 400 }}>{r.name}</div>
                        )}
                      </td>
                      <td style={{ ...td, color: dimmed ? '#9ca3af' : '#374151', fontSize: '0.85rem' }}>
                        {[r.province, r.district].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: r.sessionCount > 0 ? '#374151' : '#9ca3af' }}>
                        {r.sessionCount}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: r.networkCount > 0 ? '#374151' : '#9ca3af' }}>
                        {r.networkCount}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Toggle
                            checked={r.isActive}
                            disabled={busy === r.id}
                            onChange={(v) => toggle(r, v)}
                          />
                          <span style={{ fontSize: '0.78rem', color: r.isActive ? '#10b981' : '#9ca3af', fontWeight: 600, minWidth: '52px', textAlign: 'left' }}>
                            {r.isActive ? 'ใช้งาน' : 'ปิด'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6 }}>
          <strong>หมายเหตุ:</strong> โรงเรียนที่ปิดใช้งานจะถูกซ่อนจากตัวเลือกในหน้า dashboard และจากการนับโดยปริยาย
          แต่ข้อมูลเดิมทั้งหมด (sessions, responses, SAR) จะยังถูกเก็บรักษาไว้ครบ — กดเปิดใช้งานเมื่อใดก็จะกลับมาแสดงผลตามปกติ
        </p>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: '#374151',
  fontSize: '0.85rem',
};

const td: React.CSSProperties = {
  padding: '0.7rem 1rem',
  verticalAlign: 'middle',
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      borderLeft: `4px solid ${color}`,
      padding: '0.85rem 1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value.toLocaleString('th-TH')}</div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <span style={{
        width: '40px', height: '22px', borderRadius: '11px',
        background: checked ? '#10b981' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s',
        display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '18px', height: '18px',
          borderRadius: '50%', background: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </span>
    </label>
  );
}
