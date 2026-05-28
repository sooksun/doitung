// app/admin/networks/page.tsx
// Admin-only: manage school networks (กลุ่มโรงเรียน) — list, create, edit,
// toggle isActive, and manage member schools per network.
//
// Patterned after /admin/schools to keep the admin section consistent.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

interface NetworkRow {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
  description: string | null;
  isActive: boolean;
  activeMembersCount: number;
  totalMembersCount: number;
}

interface SchoolOption {
  id: number;
  code: string | null;
  name: string;
  nameTh: string | null;
  province: string | null;
  district: string | null;
  isActive: boolean;
}

interface MemberRow {
  memberId: number;
  joinedAt: string;
  isActive: boolean;
  school: SchoolOption;
}

type StatusFilter = 'all' | 'active' | 'inactive';

type EditingState =
  | { kind: 'create' }
  | { kind: 'edit'; row: NetworkRow }
  | null;

export default function AdminNetworksPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<NetworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [busy, setBusy] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  const [memberSheet, setMemberSheet] = useState<NetworkRow | null>(null);

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/networks', {
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

  const toggle = async (network: NetworkRow, nextValue: boolean) => {
    if (!token || busy === network.id) return;

    if (!nextValue && network.activeMembersCount > 0) {
      const ok = await toastConfirm(
        `กลุ่ม "${network.nameTh || network.name}" มีโรงเรียนสมาชิก ${network.activeMembersCount} แห่ง\n\nการปิดใช้งานจะซ่อนกลุ่มจาก dropdown และ dashboard scope (ข้อมูลเดิมยังอยู่ครบ)`,
        { title: 'ปิดใช้งานกลุ่มโรงเรียน?', confirmLabel: 'ปิดใช้งาน', cancelLabel: 'ยกเลิก', danger: true }
      );
      if (!ok) return;
    }

    setBusy(network.id);
    setRows((prev) => prev.map((r) => r.id === network.id ? { ...r, isActive: nextValue } : r));

    try {
      const res = await fetch(`/api/admin/networks/${network.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextValue }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'อัปเดตไม่สำเร็จ');
        setRows((prev) => prev.map((r) => r.id === network.id ? { ...r, isActive: !nextValue } : r));
      } else {
        toastSuccess(nextValue ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
      }
    } catch {
      toastError('เกิดข้อผิดพลาด');
      setRows((prev) => prev.map((r) => r.id === network.id ? { ...r, isActive: !nextValue } : r));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (network: NetworkRow) => {
    if (!token) return;
    const ok = await toastConfirm(
      `ลบกลุ่ม "${network.nameTh || network.name}" อย่างถาวร?\n\n${network.totalMembersCount > 0 ? `กลุ่มนี้มีประวัติสมาชิก ${network.totalMembersCount} รายการ — ถ้าต้องการเก็บประวัติ ให้กดปิดใช้งานแทน` : 'การลบนี้ไม่สามารถยกเลิกได้'}`,
      { title: 'ลบกลุ่มโรงเรียน?', confirmLabel: 'ลบถาวร', cancelLabel: 'ยกเลิก', danger: true }
    );
    if (!ok) return;

    setBusy(network.id);
    try {
      const res = await fetch(`/api/admin/networks/${network.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'ลบไม่สำเร็จ');
        return;
      }
      toastSuccess('ลบกลุ่มเรียบร้อย');
      setRows((prev) => prev.filter((r) => r.id !== network.id));
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async (payload: {
    id?: number;
    name: string;
    nameTh: string;
    code: string;
    description: string;
  }) => {
    if (!token) return;
    const isEdit = typeof payload.id === 'number';
    const url = isEdit ? `/api/admin/networks/${payload.id}` : '/api/admin/networks';
    const method = isEdit ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          nameTh: payload.nameTh,
          code: payload.code,
          description: payload.description,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'บันทึกไม่สำเร็จ');
        return;
      }
      toastSuccess(isEdit ? 'บันทึกการแก้ไขเรียบร้อย' : 'สร้างกลุ่มใหม่เรียบร้อย');
      setEditing(null);
      if (token) load(token);
    } catch {
      toastError('เกิดข้อผิดพลาด');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'active' && !r.isActive) return false;
      if (statusFilter === 'inactive' && r.isActive) return false;
      if (!q) return true;
      const hay = [r.code, r.name, r.nameTh, r.description].filter(Boolean).join(' ').toLowerCase();
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
              🌐 จัดการกลุ่มโรงเรียน
            </h1>
            <p style={{ color: '#666' }}>
              สร้าง / แก้ไข / จัดสมาชิก เครือข่ายโรงเรียน ที่ใช้กรอง scope ใน dashboard และ live view
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setEditing({ kind: 'create' })}
              style={{
                padding: '0.55rem 1.1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + เพิ่มกลุ่มใหม่
            </button>
            <Link href="/dashboard" style={{ padding: '0.55rem 1rem', background: '#667eea', color: 'white', borderRadius: '0.5rem', textDecoration: 'none' }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <SummaryCard label="กลุ่มทั้งหมด" value={counts.total} color="#667eea" />
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
            placeholder="ค้นหา (รหัส / ชื่อ / คำอธิบาย)"
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
                  <th style={th}>ชื่อกลุ่ม</th>
                  <th style={th}>คำอธิบาย</th>
                  <th style={{ ...th, textAlign: 'center' }}>สมาชิก</th>
                  <th style={{ ...th, textAlign: 'center' }}>สถานะ</th>
                  <th style={{ ...th, textAlign: 'right' }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    {rows.length === 0 ? 'ยังไม่มีกลุ่มโรงเรียน — กด "+ เพิ่มกลุ่มใหม่" เพื่อเริ่มต้น' : 'ไม่พบกลุ่มที่ตรงกับตัวกรอง'}
                  </td></tr>
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
                      <td style={{ ...td, color: dimmed ? '#9ca3af' : '#374151', fontSize: '0.85rem', maxWidth: '320px' }}>
                        {r.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ ...td, textAlign: 'center', color: r.activeMembersCount > 0 ? '#374151' : '#9ca3af' }}>
                        {r.activeMembersCount}
                        {r.totalMembersCount > r.activeMembersCount && (
                          <span style={{ marginLeft: '0.25rem', color: '#9ca3af', fontSize: '0.78rem' }}>
                            / {r.totalMembersCount}
                          </span>
                        )}
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
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setMemberSheet(r)}
                            style={miniBtn('#3b82f6')}
                          >
                            สมาชิก
                          </button>
                          <button
                            onClick={() => setEditing({ kind: 'edit', row: r })}
                            style={miniBtn('#6b7280')}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={busy === r.id}
                            style={{ ...miniBtn('#ef4444'), opacity: busy === r.id ? 0.5 : 1 }}
                          >
                            ลบ
                          </button>
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
          <strong>หมายเหตุ:</strong> &quot;ปิดใช้งาน&quot; จะซ่อนกลุ่มจาก dropdown และ scope filter โดยข้อมูลสมาชิกยังอยู่ครบ —
          เปิดกลับเมื่อใดก็แสดงผลทันที. การลบถาวรทำได้เมื่อไม่มีสมาชิกในกลุ่มเท่านั้น
        </p>
      </div>

      {editing && (
        <NetworkFormModal
          initial={editing.kind === 'edit' ? editing.row : null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {memberSheet && token && (
        <MembersDrawer
          token={token}
          network={memberSheet}
          onClose={(touched) => {
            setMemberSheet(null);
            if (touched && token) load(token);
          }}
        />
      )}
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

function miniBtn(color: string): React.CSSProperties {
  return {
    padding: '0.35rem 0.75rem',
    background: 'white',
    color,
    border: `1px solid ${color}`,
    borderRadius: '0.35rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  };
}

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

// -----------------------------------------------------------------------------
// Create / Edit network modal
// -----------------------------------------------------------------------------
function NetworkFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: NetworkRow | null;
  onClose: () => void;
  onSave: (payload: { id?: number; name: string; nameTh: string; code: string; description: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [nameTh, setNameTh] = useState(initial?.nameTh ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !nameTh.trim()) {
      toastError('ต้องระบุชื่อกลุ่ม (อังกฤษหรือไทย อย่างน้อย 1 รายการ)');
      return;
    }
    setSaving(true);
    await onSave({
      id: initial?.id,
      name: name.trim() || nameTh.trim(),
      nameTh: nameTh.trim(),
      code: code.trim(),
      description: description.trim(),
    });
    setSaving(false);
  };

  return (
    <Backdrop onClose={onClose}>
      <form onSubmit={submit} style={modalCard}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          {initial ? `แก้ไขกลุ่ม: ${initial.nameTh || initial.name}` : 'สร้างกลุ่มโรงเรียนใหม่'}
        </h2>

        <Field label="ชื่อกลุ่ม (ไทย)">
          <input
            value={nameTh}
            onChange={(e) => setNameTh(e.target.value)}
            placeholder="เช่น เครือข่ายแม่ฟ้าหลวง"
            style={inputStyle}
          />
        </Field>

        <Field label="ชื่อกลุ่ม (อังกฤษ)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mae Fah Luang Network"
            style={inputStyle}
          />
        </Field>

        <Field label="รหัสกลุ่ม (code, ไม่บังคับ)">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="เช่น MFL01"
            style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
          />
        </Field>

        <Field label="คำอธิบาย (ไม่บังคับ)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="เช่น กลุ่มโรงเรียนรอบดอยตุง..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={{
            padding: '0.55rem 1.1rem', background: 'white', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600,
          }}>ยกเลิก</button>
          <button type="submit" disabled={saving} style={{
            padding: '0.55rem 1.3rem', background: '#10b981', color: 'white',
            border: 'none', borderRadius: '0.4rem', cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600, opacity: saving ? 0.6 : 1,
          }}>{saving ? 'กำลังบันทึก...' : (initial ? 'บันทึก' : 'สร้าง')}</button>
        </div>
      </form>
    </Backdrop>
  );
}

// -----------------------------------------------------------------------------
// Manage members drawer
// -----------------------------------------------------------------------------
function MembersDrawer({
  token,
  network,
  onClose,
}: {
  token: string;
  network: NetworkRow;
  onClose: (touched: boolean) => void;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [allSchools, setAllSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [touched, setTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(`/api/admin/networks/${network.id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/schools?isActive=any', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const mJson = await mRes.json();
      const sJson = await sRes.json();
      if (mJson.success) setMembers(mJson.data.items);
      if (sJson.success) setAllSchools(sJson.data);
    } catch {
      toastError('โหลดสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [network.id, token]);

  useEffect(() => { load(); }, [load]);

  const activeMemberIds = useMemo(
    () => new Set(members.filter((m) => m.isActive).map((m) => m.school.id)),
    [members]
  );

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSchools.filter((s) => {
      if (activeMemberIds.has(s.id)) return false;
      if (!q) return true;
      const hay = [s.code, s.name, s.nameTh, s.province, s.district].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [allSchools, activeMemberIds, search]);

  const addMember = async (schoolId: number) => {
    setAdding(schoolId);
    try {
      const res = await fetch(`/api/admin/networks/${network.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'เพิ่มสมาชิกไม่สำเร็จ');
        return;
      }
      toastSuccess('เพิ่มเข้ากลุ่มแล้ว');
      setTouched(true);
      await load();
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setAdding(null);
    }
  };

  const removeMember = async (schoolId: number, schoolName: string) => {
    const ok = await toastConfirm(
      `เอา "${schoolName}" ออกจากกลุ่ม "${network.nameTh || network.name}"?\n\n(ประวัติยังเก็บไว้ — เพิ่มกลับเข้ามาใหม่ได้ทีหลัง)`,
      { title: 'ยืนยันการเอาออก', confirmLabel: 'เอาออก', cancelLabel: 'ยกเลิก', danger: true }
    );
    if (!ok) return;

    setRemoving(schoolId);
    try {
      const res = await fetch(`/api/admin/networks/${network.id}/members/${schoolId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toastError(json.error || 'เอาออกไม่สำเร็จ');
        return;
      }
      toastSuccess('เอาออกจากกลุ่มแล้ว');
      setTouched(true);
      await load();
    } catch {
      toastError('เกิดข้อผิดพลาด');
    } finally {
      setRemoving(null);
    }
  };

  const activeMembers = members.filter((m) => m.isActive);

  return (
    <Backdrop onClose={() => onClose(touched)}>
      <div style={{
        ...modalCard,
        maxWidth: '900px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              สมาชิก: {network.nameTh || network.name}
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.85rem' }}>
              {network.code ? `รหัส ${network.code} · ` : ''}สมาชิกที่ใช้งาน {activeMembers.length} แห่ง
            </p>
          </div>
          <button onClick={() => onClose(touched)} style={{
            padding: '0.35rem 0.75rem', background: 'white', color: '#374151',
            border: '1px solid #d1d5db', borderRadius: '0.35rem', cursor: 'pointer', fontWeight: 600,
          }}>ปิด</button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginTop: '1rem' }}>
            {/* Active members */}
            <Panel title={`อยู่ในกลุ่ม (${activeMembers.length})`}>
              {activeMembers.length === 0 ? (
                <EmptyHint>ยังไม่มีโรงเรียนในกลุ่มนี้</EmptyHint>
              ) : (
                <ul style={listStyle}>
                  {activeMembers.map((m) => (
                    <li key={m.memberId} style={memberItemStyle}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>
                          {m.school.nameTh || m.school.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {[m.school.code, m.school.province, m.school.district].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMember(m.school.id, m.school.nameTh || m.school.name)}
                        disabled={removing === m.school.id}
                        style={{ ...miniBtn('#ef4444'), opacity: removing === m.school.id ? 0.5 : 1 }}
                      >
                        เอาออก
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Available schools */}
            <Panel title="เพิ่มโรงเรียนเข้ากลุ่ม">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา (ชื่อ / รหัส / จังหวัด)"
                style={{ ...inputStyle, marginBottom: '0.5rem' }}
              />
              {candidates.length === 0 ? (
                <EmptyHint>ไม่พบโรงเรียนที่ยังไม่อยู่ในกลุ่ม</EmptyHint>
              ) : (
                <ul style={listStyle}>
                  {candidates.map((s) => (
                    <li key={s.id} style={{ ...memberItemStyle, opacity: s.isActive ? 1 : 0.6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>
                          {s.nameTh || s.name}
                          {!s.isActive && (
                            <span style={{ marginLeft: '0.4rem', color: '#9ca3af', fontWeight: 400, fontSize: '0.75rem' }}>
                              (ปิดใช้งาน)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {[s.code, s.province, s.district].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </div>
                      <button
                        onClick={() => addMember(s.id)}
                        disabled={adding === s.id}
                        style={{ ...miniBtn('#10b981'), opacity: adding === s.id ? 0.5 : 1 }}
                      >
                        + เพิ่ม
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </div>
    </Backdrop>
  );
}

// -----------------------------------------------------------------------------
// Small shared bits
// -----------------------------------------------------------------------------
function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginTop: '0.6rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>{label}</div>
      {children}
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      background: '#f9fafb', borderRadius: '0.5rem', padding: '0.85rem',
      border: '1px solid #e5e7eb', minHeight: 0,
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '1.2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.4rem',
  fontSize: '0.92rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const modalCard: React.CSSProperties = {
  background: 'white',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 20px 40px rgba(15,23,42,0.25)',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none', margin: 0, padding: 0,
  display: 'flex', flexDirection: 'column', gap: '0.4rem',
};

const memberItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.6rem',
  padding: '0.55rem 0.7rem',
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.4rem',
};
