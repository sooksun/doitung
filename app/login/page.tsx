// app/login/page.tsx
// TSQMn แม่ฟ้าหลวง — login (2-column redesign). UI only; the auth flow
// (POST /api/auth/login → store token+user → /dashboard) is unchanged.

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../components/ui';
import { Button, Input, Logo, DeIcon, type DeIconName } from '../components/de';

const CHIPS: [string, DeIconName][] = [
  ['47 ตัวชี้วัด Q-Model', 'checkCircle'],
  ['THAI P.1–3 Teacher-Pair', 'users'],
  ['AI SAR Analysis', 'sparkles'],
];

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Unchanged auth logic ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
        setLoading(false);
        return;
      }
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      router.push('/dashboard');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  return (
    <div className="de-login-grid" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)' }}>
      {/* Left panel */}
      <div className="de-login-left" style={{ position: 'relative', background: 'var(--de-gradient-hero)', padding: 'clamp(40px,5vw,72px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.07 }} />
        <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)', bottom: -160, left: -120, filter: 'blur(10px)' }} />
        <img src="/brand/p13.png" alt="" aria-hidden style={{ position: 'absolute', right: 'clamp(-20px,-1vw,0px)', bottom: 0, width: 'clamp(220px,22vw,300px)', zIndex: 6, pointerEvents: 'none', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.3))' }} />
        <button onClick={() => router.push('/')} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 'var(--r-md)', padding: '8px 14px', fontSize: 14, alignSelf: 'flex-start' }}>
          <DeIcon name="chevronLeft" size={16} /> กลับหน้าหลัก
        </button>
        <div style={{ position: 'relative' }}>
          <Logo size={36} markSize={86} light sub={false} />
          <h1 style={{ fontSize: 'clamp(30px,3.2vw,42px)', fontWeight: 700, color: '#fff', marginTop: 32, lineHeight: 1.15, letterSpacing: '-0.02em' }}>เข้าสู่ระบบประเมินและพัฒนาคุณภาพโรงเรียน</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.78)', marginTop: 16, maxWidth: 440, lineHeight: 1.6 }}>DE: Development Evaluation Platform — เครื่องมือมาตรฐานสำหรับมูลนิธิแม่ฟ้าหลวง</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 36 }}>
            {CHIPS.map(([t, icon]) => (
              <div key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 'var(--r-full)', padding: '10px 18px', alignSelf: 'flex-start', color: '#fff', fontSize: 15, fontWeight: 500 }}>
                <span style={{ color: 'var(--de-purple-300)' }}><DeIcon name={icon} size={18} /></span> {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>© 2025–2026 Doitung CNPPAI</div>
      </div>

      {/* Right panel */}
      <div style={{ position: 'relative', background: 'var(--de-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(28px,4vw,56px)' }}>
        <button onClick={toggleTheme} aria-label="สลับธีม" style={{ position: 'absolute', top: 24, right: 24, width: 42, height: 42, borderRadius: 'var(--r-md)', border: '1px solid var(--de-border)', background: 'var(--de-bg-surface)', color: 'var(--de-text-primary)', display: 'grid', placeItems: 'center' }}>
          <DeIcon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
        <form onSubmit={handleSubmit} className="de-slide-up" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--de-text-primary)' }}>พัฒนาครูแม่ฟ้าหลวง</span></div>
          <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.02em' }}>ยินดีต้อนรับกลับ</h2>
          <p style={{ fontSize: 15, color: 'var(--de-text-secondary)', textAlign: 'center', marginTop: 6, marginBottom: 32 }}>เข้าสู่ระบบด้วยบัญชีของคุณ</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input label="อีเมล" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@doitung.ac.th" required autoComplete="email" />
            <Input
              label="รหัสผ่าน"
              icon="lock"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              rightSlot={
                <button type="button" onClick={() => setShow(!show)} aria-label="แสดงรหัสผ่าน" style={{ border: 'none', background: 'transparent', color: 'var(--de-text-tertiary)', display: 'grid', placeItems: 'center' }}>
                  <DeIcon name={show ? 'eyeOff' : 'eye'} size={18} />
                </button>
              }
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--de-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--de-primary)', width: 16, height: 16 }} /> จดจำฉันไว้
              </label>
              <a href="#" style={{ color: 'var(--de-primary)', fontWeight: 500 }}>ลืมรหัสผ่าน?</a>
            </div>

            {error ? (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <DeIcon name="alert" size={16} /> {error}
              </div>
            ) : null}

            <Button type="submit" size="lg" variant="gradient" full loading={loading} iconRight={loading ? undefined : 'arrowRight'}>
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </Button>
          </div>
          <div style={{ marginTop: 24, padding: 14, borderRadius: 'var(--r-md)', background: 'var(--de-bg-subtle)', fontSize: 13, color: 'var(--de-text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--de-text-primary)' }}>ต้องการความช่วยเหลือ? </strong> ใช้บัญชีที่ได้รับจากผู้ดูแลระบบของโรงเรียน
          </div>
        </form>
      </div>
    </div>
  );
}
