// app/admin/settings/feature-flags/page.tsx
// Admin-only: toggle AI/SAR/GrowthTracker feature flags per school.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface FlagRow {
  schoolId: number;
  schoolCode: string | null;
  schoolName: string;
  flags: { aiEnabled: boolean; sarEnabled: boolean; growthTrackerEnabled: boolean };
}

export default function FeatureFlagsAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/feature-flags', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)'); return; }
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

  const toggle = async (schoolId: number, key: 'aiEnabled' | 'sarEnabled' | 'growthTrackerEnabled', value: boolean) => {
    if (!token) return;
    // optimistic update
    setRows((prev) => prev.map((r) => r.schoolId === schoolId ? { ...r, flags: { ...r.flags, [key]: value } } : r));
    try {
      const res = await fetch(`/api/admin/feature-flags/${schoolId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'อัปเดตไม่สำเร็จ');
        // revert
        setRows((prev) => prev.map((r) => r.schoolId === schoolId ? { ...r, flags: { ...r.flags, [key]: !value } } : r));
      } else {
        toastSuccess('อัปเดตสำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาด');
      setRows((prev) => prev.map((r) => r.schoolId === schoolId ? { ...r, flags: { ...r.flags, [key]: !value } } : r));
    }
  };

  const filtered = search.trim()
    ? rows.filter((r) => {
        const q = search.trim().toLowerCase();
        return (r.schoolCode || '').toLowerCase().includes(q) || r.schoolName.toLowerCase().includes(q);
      })
    : rows;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              🚦 Feature Flags
            </h1>
            <p style={{ color: '#666' }}>เปิด/ปิด AI · SAR · Growth Tracker รายโรงเรียน — ค่าเริ่มต้นปิดทุกอย่าง</p>
          </div>
          <Link href="/dashboard" style={{ padding: '0.5rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        <div style={{
          background: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
        }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา (รหัสหรือชื่อโรงเรียน)"
            style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid #ddd', borderRadius: '0.4rem', fontSize: '0.95rem' }}
          />
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#fee', color: '#c33', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>
        )}

        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>รหัส</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>โรงเรียน</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>SAR Evidence</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>AI SOAR</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Growth Tracker</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>ไม่พบโรงเรียน</td></tr>
                ) : filtered.map((r) => (
                  <tr key={r.schoolId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.6rem 1rem', color: '#666', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>{r.schoolCode || '-'}</td>
                    <td style={{ padding: '0.6rem 1rem', color: '#333' }}>{r.schoolName}</td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <Toggle checked={r.flags.sarEnabled} onChange={(v) => toggle(r.schoolId, 'sarEnabled', v)} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <Toggle checked={r.flags.aiEnabled} onChange={(v) => toggle(r.schoolId, 'aiEnabled', v)} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <Toggle checked={r.flags.growthTrackerEnabled} onChange={(v) => toggle(r.schoolId, 'growthTrackerEnabled', v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <span style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: checked ? '#10b981' : '#d1d5db',
        position: 'relative', transition: 'background 0.2s',
        display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '16px', height: '16px',
          borderRadius: '50%', background: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </span>
    </label>
  );
}
