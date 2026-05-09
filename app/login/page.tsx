// app/login/page.tsx
// Login — DE Design v2 redesign.
// Form behaviour preserved exactly: same fetch, same token/user storage, same redirect.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge, Button, Card, Input } from '../components/ui';

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

      if (data.data?.token) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }

      router.push('/live-dashboard');
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        fontFamily: 'var(--de-font-sans)',
        background: 'var(--de-surface-muted)',
      }}
    >
      <BrandPanel />

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--de-space-8)',
        }}
      >
        <Card
          elevation="floating"
          padding="var(--de-space-10)"
          style={{ width: '100%', maxWidth: '440px' }}
        >
          <div style={{ marginBottom: 'var(--de-space-8)' }}>
            <Badge tone="brand" variant="soft" dot style={{ marginBottom: 'var(--de-space-3)' }}>
              DE: Development Evaluation
            </Badge>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--de-ink-900)',
                marginBottom: '0.4rem',
                letterSpacing: '-0.01em',
              }}
            >
              เข้าสู่ระบบ
            </h1>
            <p style={{ color: 'var(--de-ink-500)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              ใช้บัญชีของหน่วยงาน เพื่อเข้าถึงเครื่องมือประเมินและ Dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--de-space-4)' }}>
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
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--de-ink-500)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                  }}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              }
            />

            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.75rem 0.875rem',
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: 'var(--de-danger-600)',
                  borderRadius: 'var(--de-radius-lg)',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                }}
              >
                <span aria-hidden style={{ flex: '0 0 auto', marginTop: '2px' }}>
                  <IconAlert />
                </span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              fullWidth
              loading={loading}
              rightIcon={!loading ? <IconArrowRight /> : undefined}
              style={{ marginTop: 'var(--de-space-2)' }}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </form>

          <DemoCredentials />

          <div style={{ marginTop: 'var(--de-space-6)', textAlign: 'center' }}>
            <Link
              href="/"
              style={{
                color: 'var(--de-brand-700)',
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <IconArrowLeft /> กลับหน้าหลัก
            </Link>
          </div>
        </Card>
      </section>

      <style jsx>{`
        @media (max-width: 960px) {
          main {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}

function BrandPanel() {
  return (
    <aside
      aria-hidden
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'var(--de-space-12)',
        background: 'var(--de-gradient-brand)',
        color: '#fff',
        overflow: 'hidden',
        minHeight: '100vh',
      }}
      className="de-brand-panel"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(700px 360px at 80% 10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(500px 240px at 10% 90%, rgba(0,0,0,0.18), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.55rem 0.9rem',
            background: 'rgba(255,255,255,0.16)',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--de-radius-pill)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <IconSparkles /> Doitung Network
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: '480px' }}>
        <h2
          style={{
            fontSize: 'clamp(1.6rem, 2.5vw, 2.25rem)',
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 'var(--de-space-4)',
            letterSpacing: '-0.01em',
          }}
        >
          ประเมินคุณภาพโรงเรียน
          <br />
          ด้วย Q-Model 47 ตัวชี้วัด
        </h2>
        <p style={{ fontSize: '1rem', lineHeight: 1.7, opacity: 0.9 }}>
          Real-time dashboard สำหรับเครือข่ายโรงเรียน — ติดตามความคืบหน้าและเปรียบเทียบ
          สภาพที่เป็นอยู่ vs สภาพที่พึงประสงค์ ในมิติ Leadership, PLC, Learning และ Students
        </p>

        <div
          style={{
            display: 'flex',
            gap: 'var(--de-space-4)',
            marginTop: 'var(--de-space-8)',
            flexWrap: 'wrap',
          }}
        >
          <BrandStat label="Dimensions" value="4" />
          <BrandStat label="Indicators" value="47" />
          <BrandStat label="Update" value="ทุก 5 วินาที" />
        </div>
      </div>

      <p style={{ position: 'relative', fontSize: '0.85rem', opacity: 0.75 }}>
        © 2024 Doitung School Quality Dashboard
      </p>

      <style jsx>{`
        @media (max-width: 960px) {
          .de-brand-panel {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
}

function BrandStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: '0.7rem 1rem',
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: 'var(--de-radius-lg)',
        backdropFilter: 'blur(8px)',
        minWidth: '110px',
      }}
    >
      <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

function DemoCredentials() {
  const items = [
    { email: 'admin@local', password: 'Admin123', role: 'ADMIN' },
    { email: 'leader@example.com', password: 'Leader123', role: 'SCHOOL_LEADER' },
    { email: 'teacher@example.com', password: 'Teacher123', role: 'TEACHER' },
  ];
  return (
    <div
      style={{
        marginTop: 'var(--de-space-8)',
        padding: 'var(--de-space-4)',
        background: 'var(--de-surface-muted)',
        border: '1px dashed var(--de-ink-200)',
        borderRadius: 'var(--de-radius-lg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--de-space-3)',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--de-ink-700)' }}>
          บัญชีทดลอง (Development)
        </span>
        <Badge tone="warning" variant="soft" style={{ fontSize: '0.7rem' }}>
          DEV
        </Badge>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.4rem' }}>
        {items.map((it) => (
          <li
            key={it.email}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.78rem',
              color: 'var(--de-ink-600)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            <span>{it.email} / {it.password}</span>
            <Badge tone="brand" variant="outline" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
              {it.role}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----- icons ----- */
function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.88 5.08A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.06 4.04M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.4-1" />
      <path d="m3 3 18 18" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function IconArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M11 19l-7-7 7-7" />
    </svg>
  );
}
function IconSparkles() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
