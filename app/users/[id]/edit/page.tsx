// app/users/[id]/edit/page.tsx
// Edit user — name, email, phone (and isActive for admin).

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface UserDetail {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  roles: string[];
  school: { id: number; code: string | null; nameTh: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'ผู้ดูแลระบบ',
  SCHOOL_ADMIN: 'แอดมินโรงเรียน',
  SCHOOL_LEADER: 'ผู้บริหาร',
  TEACHER: 'ครู',
  SUPERVISOR: 'ศึกษานิเทศก์',
};

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [meId, setMeId] = useState<number | null>(null);
  const [meIsAdmin, setMeIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  // password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);

    const me = localStorage.getItem('user');
    if (me) {
      try {
        const parsed = JSON.parse(me);
        setMeIsAdmin(Array.isArray(parsed.roles) && parsed.roles.includes('ADMIN'));
        if (typeof parsed.id === 'number') setMeId(parsed.id);
      } catch {
        // ignore
      }
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setError('คุณไม่มีสิทธิ์แก้ไขผู้ใช้คนนี้');
          setLoading(false);
          return;
        }
        if (res.status === 404) {
          setError('ไม่พบผู้ใช้');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError('โหลดข้อมูลไม่สำเร็จ');
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (json.success) {
          applyUserData(json.data);
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, userId]);

  const applyUserData = (data: UserDetail) => {
    setUser(data);
    setName(data.name || '');
    setEmail(data.email || '');
    setPhone(data.phone || '');
    setIsActive(!!data.isActive);
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    if (!name.trim()) {
      toastError('กรุณากรอกชื่อ');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toastError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    const body: any = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
    };
    if (meIsAdmin) body.isActive = isActive;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (res.ok && json.success) {
        toastSuccess(json.message || 'บันทึกข้อมูลสำเร็จ');
        // Server normalizes email to lowercase — re-sync UI + localStorage from
        // the canonical response, not from what we sent.
        const saved: UserDetail = {
          ...user,
          name: json.data.name,
          email: json.data.email,
          phone: json.data.phone,
          isActive: json.data.isActive,
        };
        applyUserData(saved);

        const me = localStorage.getItem('user');
        if (me) {
          try {
            const parsed = JSON.parse(me);
            if (parsed.id === user.id) {
              parsed.name = json.data.name;
              parsed.email = json.data.email;
              localStorage.setItem('user', JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
        }
      } else {
        toastError(json.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const isSelf = meId !== null && user !== null && meId === user.id;
  const requiresCurrentPassword = isSelf;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    if (requiresCurrentPassword && !currentPassword) {
      toastError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }
    if (newPassword.length < 8) {
      toastError('รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setSavingPassword(true);
    try {
      const payload: Record<string, string> = { newPassword };
      if (requiresCurrentPassword) payload.currentPassword = currentPassword;

      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json = await res.json();
      if (res.ok && json.success) {
        toastSuccess(json.message || 'เปลี่ยนรหัสผ่านสำเร็จ');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toastError(json.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลด...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
        <Link href="/users" style={{ color: '#667eea', textDecoration: 'none' }}>← กลับไปจัดการผู้ใช้</Link>
      </div>
    );
  }

  if (!user) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.85rem',
    border: '1px solid #ddd',
    borderRadius: '0.4rem',
    fontSize: '0.95rem',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.4rem',
    color: '#333',
    fontSize: '0.9rem',
    fontWeight: 500,
  };

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <Link
          href="/users"
          style={{
            display: 'inline-block',
            marginBottom: '1rem',
            padding: '0.4rem 0.85rem',
            background: '#667eea',
            color: 'white',
            borderRadius: '0.4rem',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          ← กลับไปรายการ
        </Link>

        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
            ✏️ แก้ไขผู้ใช้ #{user.id}
          </h1>
          <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            บทบาท:{' '}
            {user.roles.map((r) => ROLE_LABELS[r] || r).join(', ') || '—'}
            {user.school && (
              <>
                {' · โรงเรียน: '}
                <strong>{user.school.code} {user.school.nameTh}</strong>
              </>
            )}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ชื่อ *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
                placeholder="ชื่อ-นามสกุล"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>อีเมล *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="user@example.com"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>เบอร์โทร</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="เช่น 081-234-5678"
              />
              <span style={{ fontSize: '0.8rem', color: '#888' }}>ไม่บังคับ</span>
            </div>

            {meIsAdmin && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ color: '#333', fontSize: '0.95rem' }}>เปิดใช้งาน</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>(ปิด = ผู้ใช้นี้ login ไม่ได้)</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: saving ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
              </button>
              <Link
                href="/users"
                style={{
                  padding: '0.7rem 1.5rem',
                  background: '#f3f4f6',
                  color: '#333',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.4rem',
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                ยกเลิก
              </Link>
            </div>
          </form>
        </div>

        {/* Password change card */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.25rem' }}>
            🔑 เปลี่ยนรหัสผ่าน
          </h2>
          <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {requiresCurrentPassword
              ? 'กรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน แล้วตั้งรหัสผ่านใหม่'
              : 'รีเซ็ตรหัสผ่านของผู้ใช้คนนี้ — ระบบจะไม่ขอรหัสเดิม (admin reset)'}
          </p>

          <form onSubmit={handlePasswordSubmit}>
            {requiresCurrentPassword && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>รหัสผ่านปัจจุบัน *</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={inputStyle}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>รหัสผ่านใหม่ * (อย่างน้อย 8 ตัวอักษร)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>ยืนยันรหัสผ่านใหม่ *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {!requiresCurrentPassword && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.6rem 0.85rem',
                background: '#fef3c7',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '0.4rem',
                fontSize: '0.82rem',
                color: '#92400e',
              }}>
                ⚠️ จดรหัสผ่านใหม่ไว้ส่งให้ผู้ใช้ — ระบบไม่แสดงรหัสผ่านอีกหลังบันทึก
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  padding: '0.7rem 1.5rem',
                  background: savingPassword ? '#9ca3af' : '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: savingPassword ? 'not-allowed' : 'pointer',
                }}
              >
                {savingPassword ? 'กำลังบันทึก...' : '🔑 บันทึกรหัสผ่านใหม่'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
