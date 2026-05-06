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
  const [meIsAdmin, setMeIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);

    const me = localStorage.getItem('user');
    if (me) {
      try {
        const parsed = JSON.parse(me);
        setMeIsAdmin(Array.isArray(parsed.roles) && parsed.roles.includes('ADMIN'));
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
          setUser(json.data);
          setName(json.data.name || '');
          setEmail(json.data.email || '');
          setPhone(json.data.phone || '');
          setIsActive(!!json.data.isActive);
        }
      } catch {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, userId]);

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
      const json = await res.json();
      if (res.ok && json.success) {
        toastSuccess(json.message || 'บันทึกข้อมูลสำเร็จ');
        // If the user edited themselves, also refresh localStorage user blob
        const me = localStorage.getItem('user');
        if (me) {
          try {
            const parsed = JSON.parse(me);
            if (parsed.id === user.id) {
              parsed.name = body.name;
              parsed.email = body.email;
              localStorage.setItem('user', JSON.stringify(parsed));
            }
          } catch { /* ignore */ }
        }
        // Stay on the page with refreshed values
        setUser({ ...user, ...body });
      } else {
        toastError(json.error || 'บันทึกไม่สำเร็จ');
      }
    } catch {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
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
      </div>
    </div>
  );
}
