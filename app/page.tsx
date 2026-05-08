// app/page.tsx
// Home / landing page — DE Design v2.
// Cards consolidated: Dashboard + Live Dashboard merged into one entry pointing
// at /live-dashboard (the canonical real-time view).

'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Badge, Card, Container } from './components/ui';

export default function HomePage() {
  return (
    <main className="de-app-shell" style={{ paddingBottom: 'var(--de-space-16)' }}>
      <DecorativeBackdrop />

      <Container size="xl" style={{ paddingTop: 'var(--de-space-12)', position: 'relative', zIndex: 1 }}>
        <Hero />

        <section
          aria-label="เมนูหลัก"
          style={{
            marginTop: 'var(--de-space-12)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--de-space-5)',
          }}
        >
          <NavCard
            href="/live-dashboard"
            tone="brand"
            title="ภาพรวมคุณภาพโรงเรียน"
            description="Spider chart, KPI และความคืบหน้า Q-Model — อัปเดตทุก 5 วินาที"
            icon={<IconChart />}
            badge="LIVE"
          />
          <NavCard
            href="/evaluations"
            tone="success"
            title="ประเมินคุณภาพ"
            description="สร้างและบันทึก Evaluation Session ตามเครื่องมือ Q-Model / DERS / Thai P.1–3"
            icon={<IconCheck />}
          />
          <NavCard
            href="/instruments"
            tone="violet"
            title="เครื่องมือและตัวชี้วัด"
            description="ดูรายละเอียดเกณฑ์ 47 ตัวชี้วัด ใน 4 มิติของ Q-Model"
            icon={<IconClipboard />}
          />
          <NavCard
            href="/reports"
            tone="warning"
            title="รายงานสรุปผล"
            description="เปรียบเทียบรายโรงเรียน/กลุ่ม และส่งออกผลการประเมิน"
            icon={<IconReport />}
          />
        </section>

        <section
          aria-label="เริ่มต้นใช้งาน"
          style={{
            marginTop: 'var(--de-space-12)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: 'var(--de-space-5)',
          }}
        >
          <Card elevation="raised" padding="var(--de-space-8)" accent="brand">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--de-space-3)',
                marginBottom: 'var(--de-space-5)',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--de-ink-900)',
                    marginBottom: '0.25rem',
                  }}
                >
                  เริ่มต้นใช้งาน 3 ขั้นตอน
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--de-ink-500)' }}>
                  สำหรับครู ผู้บริหาร และผู้ดูแลเครือข่ายโรงเรียน
                </p>
              </div>
              <Badge tone="brand" variant="soft" dot>
                Q-Model 2568
              </Badge>
            </div>

            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--de-space-4)' }}>
              <Step
                index={1}
                title="เข้าสู่ระบบ"
                detail="ใช้บัญชีของหน่วยงาน (อีเมล + รหัสผ่าน) เพื่อเข้าถึงเครื่องมือและ Dashboard"
              />
              <Step
                index={2}
                title="เลือกเครื่องมือและบันทึกแบบประเมิน"
                detail="ครูผู้ประเมินกรอก Likert 1–5 ทั้งสภาพที่เป็นอยู่และที่พึงประสงค์ — auto-save ทันที"
              />
              <Step
                index={3}
                title="ติดตามภาพรวมแบบ Live"
                detail="หน้า Dashboard อัปเดตทุก 5 วินาที พร้อม Spider chart และไฟจราจรรายตัวชี้วัด"
              />
            </ol>
          </Card>

          <Card elevation="raised" padding="var(--de-space-8)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--de-space-3)', marginBottom: 'var(--de-space-3)' }}>
              <span
                aria-hidden
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--de-radius-md)',
                  background: '#ecfdf5',
                  color: '#047857',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #a7f3d0',
                }}
              >
                <IconHeartbeat />
              </span>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--de-ink-900)' }}>
                  สถานะระบบ
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--de-ink-500)' }}>
                  ตรวจสอบล่าสุด: ตอนนี้
                </p>
              </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--de-space-2)' }}>
              <StatusRow label="API Server" status="ใช้งานได้" tone="success" />
              <StatusRow label="ฐานข้อมูล" status="เชื่อมต่อแล้ว" tone="success" />
              <StatusRow label="Real-time polling" status="ทุก 5 วินาที" tone="info" />
            </ul>

            <div
              style={{
                marginTop: 'var(--de-space-5)',
                paddingTop: 'var(--de-space-4)',
                borderTop: '1px solid var(--de-ink-100)',
              }}
            >
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--de-brand-700)',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                }}
              >
                ต้องการเข้าใช้งาน? <IconArrowRight />
              </Link>
            </div>
          </Card>
        </section>

        <footer
          style={{
            marginTop: 'var(--de-space-12)',
            paddingTop: 'var(--de-space-6)',
            borderTop: '1px solid var(--de-ink-200)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--de-space-3)',
            color: 'var(--de-ink-500)',
            fontSize: '0.85rem',
          }}
        >
          <span>© 2024 Doitung School Quality Dashboard</span>
          <span style={{ display: 'inline-flex', gap: 'var(--de-space-2)', flexWrap: 'wrap' }}>
            <Badge tone="neutral" variant="outline">Next.js 14</Badge>
            <Badge tone="neutral" variant="outline">Prisma</Badge>
            <Badge tone="neutral" variant="outline">MySQL</Badge>
            <Badge tone="neutral" variant="outline">TypeScript</Badge>
          </span>
        </footer>
      </Container>
    </main>
  );
}

function Hero() {
  return (
    <header
      style={{
        position: 'relative',
        borderRadius: 'var(--de-radius-2xl)',
        padding: 'var(--de-space-12) var(--de-space-10)',
        background: 'var(--de-gradient-brand)',
        color: '#fff',
        overflow: 'hidden',
        boxShadow: 'var(--de-shadow-xl)',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(600px 300px at 90% 10%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(400px 200px at 10% 90%, rgba(0,0,0,0.18), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', maxWidth: '780px' }}>
        <Badge
          tone="neutral"
          variant="solid"
          style={{
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(8px)',
            marginBottom: 'var(--de-space-4)',
          }}
          dot
        >
          DE: Development Evaluation
        </Badge>
        <h1
          style={{
            fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 'var(--de-space-3)',
            letterSpacing: '-0.01em',
          }}
        >
          ระบบประเมินและพัฒนาคุณภาพโรงเรียน
          <br />
          <span style={{ opacity: 0.92 }}>ด้วยโมเดล Q-Model</span>
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            opacity: 0.92,
            maxWidth: '640px',
          }}
        >
          เครื่องมือประเมินและ Dashboard แบบ real-time สำหรับเครือข่ายโรงเรียน —
          ครอบคลุม 47 ตัวชี้วัด ใน 4 มิติ: ผู้บริหาร, ชุมชนการเรียนรู้, การจัดการเรียนรู้ และนักเรียน
        </p>

        <div
          style={{
            marginTop: 'var(--de-space-6)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--de-space-3)',
          }}
        >
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.4rem',
              background: '#fff',
              color: 'var(--de-brand-700)',
              borderRadius: 'var(--de-radius-lg)',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: 'var(--de-shadow-md)',
              transition: 'transform var(--de-duration-fast) var(--de-ease-out)',
            }}
          >
            <IconShield /> เข้าสู่ระบบ
          </Link>
          <Link
            href="/live-dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.4rem',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: 'var(--de-radius-lg)',
              fontWeight: 600,
              fontSize: '0.95rem',
              border: '1px solid rgba(255,255,255,0.32)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <IconBroadcast /> ดูภาพรวมคุณภาพ (Live)
          </Link>
        </div>
      </div>
    </header>
  );
}

function DecorativeBackdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-160px',
          right: '-100px',
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.18), transparent 65%)',
          filter: 'blur(20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-200px',
          left: '-160px',
          width: '520px',
          height: '520px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 60%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  );
}

type CardTone = 'brand' | 'success' | 'warning' | 'violet';

const cardToneAccent: Record<CardTone, { bg: string; fg: string; ring: string }> = {
  brand:   { bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', fg: 'var(--de-brand-700)',   ring: 'var(--de-brand-200)' },
  success: { bg: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', fg: '#047857',              ring: '#a7f3d0' },
  warning: { bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', fg: '#b45309',              ring: '#fde68a' },
  violet:  { bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', fg: 'var(--de-accent-700)', ring: '#ddd6fe' },
};

function NavCard({
  href,
  title,
  description,
  icon,
  tone,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: CardTone;
  badge?: string;
}) {
  const c = cardToneAccent[tone];
  return (
    <Link href={href} style={{ display: 'block' }}>
      <Card
        interactive
        elevation="raised"
        padding="var(--de-space-6)"
        style={{ height: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--de-space-4)' }}>
          <span
            aria-hidden
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--de-radius-lg)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: c.bg,
              color: c.fg,
              border: `1px solid ${c.ring}`,
            }}
          >
            {icon}
          </span>
          {badge && (
            <Badge tone="danger" variant="soft" dot>
              {badge}
            </Badge>
          )}
        </div>
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--de-ink-900)',
            marginBottom: '0.35rem',
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--de-ink-500)', lineHeight: 1.55 }}>{description}</p>
      </Card>
    </Link>
  );
}

function Step({ index, title, detail }: { index: number; title: string; detail: string }) {
  return (
    <li style={{ display: 'flex', gap: 'var(--de-space-3)' }}>
      <span
        aria-hidden
        style={{
          flex: '0 0 auto',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--de-brand-50)',
          color: 'var(--de-brand-700)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.95rem',
          border: '1px solid var(--de-brand-200)',
        }}
      >
        {index}
      </span>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--de-ink-900)', marginBottom: '0.2rem' }}>{title}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--de-ink-500)', lineHeight: 1.55 }}>{detail}</div>
      </div>
    </li>
  );
}

function StatusRow({ label, status, tone }: { label: string; status: string; tone: 'success' | 'info' }) {
  const dotColor = tone === 'success' ? 'var(--de-success-500)' : 'var(--de-info-500)';
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.55rem 0.75rem',
        background: 'var(--de-surface-muted)',
        borderRadius: 'var(--de-radius-md)',
        border: '1px solid var(--de-ink-100)',
      }}
    >
      <span style={{ fontSize: '0.88rem', color: 'var(--de-ink-700)' }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 500, color: 'var(--de-ink-900)' }}>
        <span aria-hidden style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 3px ${dotColor}22` }} />
        {status}
      </span>
    </li>
  );
}

/* ----- inline icons ----- */
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-6" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconReport() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  );
}
function IconBroadcast() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M5 8a8 8 0 0 0 0 8M19 8a8 8 0 0 1 0 8M2 5a13 13 0 0 0 0 14M22 5a13 13 0 0 1 0 14" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function IconHeartbeat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12h4l3-9 4 18 3-9h4" />
    </svg>
  );
}
