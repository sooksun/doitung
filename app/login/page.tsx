// app/login/page.tsx
// Login page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, Input, ThemeToggle } from '@/app/components/ui';
import {
  IconArrowLeft,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShieldCheck,
} from '@/app/components/ui/icons';

const BRAND_POINTS = [
  'ประเมินคุณภาพโรงเรียนด้วย Q-Model 47 ตัวชี้วัด',
  'แดชบอร์ดสรุปผลแบบเรียลไทม์ทุก 5 วินาที',
  'ครบทุกเครื่องมือประเมินในที่เดียว',
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      // Save token to localStorage
      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  return (
    <div
      className="de-app-shell"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--de-space-6)',
      }}
    >
      {/* Responsive split — collapses to a single column on small screens. */}
      <style>{`
        .de-login-grid { display: grid; grid-template-columns: 1.05fr 1fr; width: 100%; }
        .de-login-brand {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; gap: var(--de-space-6);
          padding: var(--de-space-12);
          background: var(--de-gradient-brand);
          color: var(--de-on-primary);
        }
        .de-login-brand::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(420px 320px at 88% 8%, rgba(255,255,255,0.22), transparent 60%);
          pointer-events: none;
        }
        .de-login-form { padding: var(--de-space-12); }
        @media (max-width: 860px) {
          .de-login-grid { grid-template-columns: 1fr; }
          .de-login-brand { display: none; }
          .de-login-form { padding: var(--de-space-8) var(--de-space-6); }
        }
      `}</style>

      <Card
        elevation="floating"
        padding={0}
        style={{ width: '100%', maxWidth: 940, overflow: 'hidden', borderRadius: 'var(--de-radius-2xl)' }}
      >
        <div className="de-login-grid">
          {/* Brand panel */}
          <aside className="de-login-brand">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--de-space-3)' }}>
              <span
                aria-hidden="true"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 'var(--de-radius-lg)',
                  background: 'rgba(255,255,255,0.16)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontFamily: 'var(--de-font-mono)',
                  letterSpacing: '0.02em',
                }}
              >
                DE
              </span>
              <span style={{ lineHeight: 1.25 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: '1.05rem' }}>DOITUNG</span>
                <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.85 }}>Development Evaluation</span>
              </span>
            </div>

            <div style={{ position: 'relative' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.25, margin: 0 }}>
                ระบบประเมินและพัฒนาคุณภาพโรงเรียน
              </h1>
              <p style={{ marginTop: 'var(--de-space-3)', fontSize: '0.98rem', opacity: 0.9, lineHeight: 1.6 }}>
                เข้าสู่ระบบเพื่อจัดการแบบประเมิน ดูแดชบอร์ด และติดตามคุณภาพการศึกษาแบบเรียลไทม์
              </p>
            </div>

            <ul style={{ position: 'relative', listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--de-space-3)' }}>
              {BRAND_POINTS.map((point) => (
                <li key={point} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--de-space-3)', fontSize: '0.92rem' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 24,
                      height: 24,
                      borderRadius: 'var(--de-radius-pill)',
                      background: 'rgba(255,255,255,0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconCheck width={15} height={15} />
                  </span>
                  <span style={{ opacity: 0.95, lineHeight: 1.5 }}>{point}</span>
                </li>
              ))}
            </ul>

            <div className="de-mono" style={{ position: 'relative', marginTop: 'auto', fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>
              Q-Model · Thai ป.1–3
            </div>
          </aside>

          {/* Form panel */}
          <section className="de-login-form">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--de-space-3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--de-space-2)', color: 'var(--de-brand-600)' }}>
                <IconShieldCheck width={20} height={20} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.04em' }}>เข้าสู่ระบบ</span>
              </span>
              <ThemeToggle size="sm" />
            </div>

            <div style={{ marginTop: 'var(--de-space-5)', marginBottom: 'var(--de-space-6)' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: 'var(--de-text)' }}>ยินดีต้อนรับกลับ</h2>
              <p style={{ marginTop: 'var(--de-space-2)', color: 'var(--de-text-muted)', fontSize: '0.95rem' }}>
                กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--de-space-5)' }}>
              <Input
                label="อีเมล"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@local"
                leftIcon={<IconMail />}
              />

              <Input
                label="รหัสผ่าน"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                leftIcon={<IconLock />}
                rightSlot={
                  <button
                    type="button"
                    className="de-focus-ring"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    aria-pressed={showPassword}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.4rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--de-text-muted)',
                      cursor: 'pointer',
                      borderRadius: 'var(--de-radius-sm)',
                    }}
                  >
                    {showPassword ? <IconEyeOff width={19} height={19} /> : <IconEye width={19} height={19} />}
                  </button>
                }
              />

              {error && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--de-space-2)',
                    padding: '0.7rem 0.9rem',
                    background: 'var(--de-danger-soft)',
                    color: 'var(--de-danger-600)',
                    border: '1px solid var(--de-danger-500)',
                    borderRadius: 'var(--de-radius-md)',
                    fontSize: '0.9rem',
                  }}
                >
                  {error}
                </div>
              )}

              <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>

            <div style={{ marginTop: 'var(--de-space-6)', textAlign: 'center' }}>
              <Link href="/" className="de-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--de-space-2)' }}>
                <IconArrowLeft width={17} height={17} />
                กลับหน้าหลัก
              </Link>
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
