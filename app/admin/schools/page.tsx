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
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

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

interface AddForm {
  name: string;
  nameTh: string;
  code: string;
  province: string;
  district: string;
  address: string;
}

const emptyForm: AddForm = { name: '', nameTh: '', code: '', province: '', district: '', address: '' };

export default function AdminSchoolsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyForm);
  const [addBusy, setAddBusy] = useState(false);

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
      const ok = await toastConfirm(
        `โรงเรียน "${school.nameTh || school.name}" มีการประเมิน ${school.sessionCount} รายการ\n\nการปิดใช้งานจะซ่อนโรงเรียนนี้จาก dashboard และตัวเลือกทั่วไป (ข้อมูลเดิมยังอยู่ครบ)`,
        { title: 'ปิดใช้งานโรงเรียน?', confirmLabel: 'ปิดใช้งาน', cancelLabel: 'ยกเลิก', danger: true }
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

  const handleDelete = async (school: SchoolRow) => {
    if (!token) return;
    if (school.sessionCount > 0) {
      toastError(`ไม่สามารถลบได้ — "${school.nameTh || school.name}" มีข้อมูลการประเมิน ${school.sessionCount} รายการ`);
      return;
    }
    const ok = await toastConfirm(
      `ลบโรงเรียน "${school.nameTh || school.name}" ถาวร?\n\nข้อมูลทั้งหมดที่เกี่ยวข้องจะหายไปและไม่สามารถกู้คืนได้`,
      { title: 'ลบโรงเรียน', confirmLabel: 'ลบถาวร', cancelLabel: 'ยกเลิก', danger: true }
    );
    if (!ok) return;

    setBusy(school.id);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'ลบไม่สำเร็จ');
      } else {
        toastSuccess('ลบโรงเรียนเรียบร้อยแล้ว');
        setRows((prev) => prev.filter((r) => r.id !== school.id));
      }
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAddBusy(true);
    try {
      const res = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, name: addForm.name.trim() || addForm.nameTh.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'เพิ่มโรงเรียนไม่สำเร็จ');
      } else {
        toastSuccess('เพิ่มโรงเรียนสำเร็จ');
        setShowAdd(false);
        setAddForm(emptyForm);
        load(token);
      }
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setAddBusy(false);
    }
  };

  const counts = useMemo(() => ({
    total: rows.length,
    active: rows.filter((r) => r.isActive).length,
    inactive: rows.filter((r) => !r.isActive).length,
  }), [rows]);

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: 'var(--de-bg-canvas)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--de-text-primary)', marginBottom: '0.5rem' }}>
              🏫 ตั้งค่าการใช้งานโรงเรียน
            </h1>
            <p style={{ color: 'var(--de-text-secondary)' }}>
              เปิด/ปิด การแสดงผลและการใช้งานของแต่ละโรงเรียน — ข้อมูลเดิมจะถูกเก็บไว้ครบเสมอ
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setAddForm(emptyForm); setShowAdd(true); }}
              style={{ padding: '0.5rem 1.1rem', background: 'var(--de-success)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              + เพิ่มโรงเรียน
            </button>
            <Link href="/dashboard" style={{ padding: '0.5rem 1rem', background: 'var(--de-primary)', color: 'var(--de-on-primary)', borderRadius: '0.5rem', textDecoration: 'none' }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <SummaryCard label="โรงเรียนทั้งหมด" value={counts.total} color="var(--de-primary)" />
          <SummaryCard label="ใช้งานอยู่" value={counts.active} color="var(--de-success)" />
          <SummaryCard label="ปิดใช้งาน" value={counts.inactive} color="var(--de-text-tertiary)" />
        </div>

        {/* Filters */}
        <div style={{
          background: 'var(--de-bg-surface)',
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
            style={{ flex: '1 1 280px', padding: '0.6rem 0.85rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.95rem' }}
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
                    background: isOn ? 'var(--de-primary)' : 'var(--de-bg-subtle)',
                    color: isOn ? 'var(--de-on-primary)' : 'var(--de-text-primary)',
                    border: '1px solid',
                    borderColor: isOn ? 'var(--de-primary)' : 'var(--de-border-strong)',
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
          <div style={{ padding: '1rem', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ background: 'var(--de-bg-surface)', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--de-bg-canvas)', borderBottom: '2px solid var(--de-border)' }}>
                  <th style={th}>รหัส</th>
                  <th style={th}>โรงเรียน</th>
                  <th style={th}>จังหวัด / อำเภอ</th>
                  <th style={{ ...th, textAlign: 'center' }}>กิจกรรมประเมิน</th>
                  <th style={{ ...th, textAlign: 'center' }}>กลุ่มเครือข่าย</th>
                  <th style={{ ...th, textAlign: 'center' }}>สถานะ</th>
                  <th style={{ ...th, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--de-text-secondary)' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--de-text-secondary)' }}>ไม่พบโรงเรียน</td></tr>
                ) : filtered.map((r) => {
                  const dimmed = !r.isActive;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--de-border)', background: dimmed ? 'var(--de-bg-canvas)' : 'var(--de-bg-surface)' }}>
                      <td style={{ ...td, color: 'var(--de-text-secondary)', fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>
                        {r.code || '-'}
                      </td>
                      <td style={{ ...td, color: dimmed ? 'var(--de-text-tertiary)' : 'var(--de-text-primary)', fontWeight: 500 }}>
                        {r.nameTh || r.name}
                        {r.nameTh && r.name && r.nameTh !== r.name && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--de-text-tertiary)', fontWeight: 400 }}>{r.name}</div>
                        )}
                      </td>
                      <td style={{ ...td, color: dimmed ? 'var(--de-text-tertiary)' : 'var(--de-text-primary)', fontSize: '0.85rem' }}>
                        {[r.province, r.district].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: r.sessionCount > 0 ? 'var(--de-text-primary)' : 'var(--de-text-tertiary)' }}>
                        {r.sessionCount}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: r.networkCount > 0 ? 'var(--de-text-primary)' : 'var(--de-text-tertiary)' }}>
                        {r.networkCount}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Toggle
                            checked={r.isActive}
                            disabled={busy === r.id}
                            onChange={(v) => toggle(r, v)}
                          />
                          <span style={{ fontSize: '0.78rem', color: r.isActive ? 'var(--de-success)' : 'var(--de-text-tertiary)', fontWeight: 600, minWidth: '52px', textAlign: 'left' }}>
                            {r.isActive ? 'ใช้งาน' : 'ปิด'}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={busy === r.id}
                          title={r.sessionCount > 0 ? `มีข้อมูลประเมิน ${r.sessionCount} รายการ — ลบไม่ได้` : 'ลบโรงเรียน'}
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid',
                            borderRadius: '0.35rem',
                            cursor: busy === r.id ? 'not-allowed' : 'pointer',
                            opacity: busy === r.id ? 0.5 : 1,
                            background: r.sessionCount > 0 ? 'var(--de-bg-subtle)' : 'var(--de-danger-soft)',
                            color: r.sessionCount > 0 ? 'var(--de-text-tertiary)' : 'var(--de-danger)',
                            borderColor: r.sessionCount > 0 ? 'var(--de-border)' : 'var(--de-danger)',
                          }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--de-text-secondary)', lineHeight: 1.6 }}>
          <strong>หมายเหตุ:</strong> โรงเรียนที่ปิดใช้งานจะถูกซ่อนจากตัวเลือกในหน้า dashboard และจากการนับโดยปริยาย
          แต่ข้อมูลเดิมทั้งหมด (sessions, responses, SAR) จะยังถูกเก็บรักษาไว้ครบ — กดเปิดใช้งานเมื่อใดก็จะกลับมาแสดงผลตามปกติ
        </p>
      </div>

      {/* Add School Modal */}
      {showAdd && (
        <div
          onClick={() => !addBusy && setShowAdd(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--de-bg-surface)', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--de-text-primary)', marginBottom: '1.5rem' }}>เพิ่มโรงเรียนใหม่</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <FormField label="ชื่อโรงเรียน (ไทย) *" value={addForm.nameTh} onChange={(v) => setAddForm((f) => ({ ...f, nameTh: v }))} placeholder="โรงเรียนตัวอย่าง" />
              <FormField label="ชื่อโรงเรียน (อังกฤษ)" value={addForm.name} onChange={(v) => setAddForm((f) => ({ ...f, name: v }))} placeholder="Example School" />
              <FormField label="รหัสโรงเรียน" value={addForm.code} onChange={(v) => setAddForm((f) => ({ ...f, code: v }))} placeholder="1012345678" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FormField label="จังหวัด" value={addForm.province} onChange={(v) => setAddForm((f) => ({ ...f, province: v }))} placeholder="เชียงราย" />
                <FormField label="อำเภอ" value={addForm.district} onChange={(v) => setAddForm((f) => ({ ...f, district: v }))} placeholder="เมือง" />
              </div>
              <FormField label="ที่อยู่" value={addForm.address} onChange={(v) => setAddForm((f) => ({ ...f, address: v }))} placeholder="123 ถ...." />
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdd(false)} disabled={addBusy}
                  style={{ padding: '0.55rem 1.2rem', border: '1px solid var(--de-border-strong)', borderRadius: '0.4rem', background: 'var(--de-bg-subtle)', cursor: 'pointer', fontWeight: 500 }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={addBusy || (!addForm.nameTh.trim() && !addForm.name.trim())}
                  style={{ padding: '0.55rem 1.4rem', background: 'var(--de-success)', color: '#fff', border: 'none', borderRadius: '0.4rem', fontWeight: 600, cursor: addBusy ? 'not-allowed' : 'pointer', opacity: addBusy ? 0.7 : 1 }}>
                  {addBusy ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 600,
  color: 'var(--de-text-primary)',
  fontSize: '0.85rem',
};

const td: React.CSSProperties = {
  padding: '0.7rem 1rem',
  verticalAlign: 'middle',
};

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'var(--de-bg-surface)',
      borderRadius: '0.5rem',
      borderLeft: `4px solid ${color}`,
      padding: '0.85rem 1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--de-text-secondary)', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value.toLocaleString('th-TH')}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--de-text-secondary)', marginBottom: '0.3rem' }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--de-border)', borderRadius: '0.4rem', fontSize: '0.95rem', boxSizing: 'border-box', background: 'var(--de-bg-canvas)', color: 'var(--de-text-primary)' }}
      />
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
        background: checked ? 'var(--de-success)' : 'var(--de-border-strong)',
        position: 'relative', transition: 'background 0.2s',
        display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '20px' : '2px',
          width: '18px', height: '18px',
          borderRadius: '50%', background: 'var(--de-bg-surface)',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </span>
    </label>
  );
}
