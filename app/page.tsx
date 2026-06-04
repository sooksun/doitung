// app/page.tsx
// TSQMn แม่ฟ้าหลวง — public landing page (standalone, no AppShell).
// Visual marketing page only; "เข้าสู่ระบบ" routes to /login (real auth there).

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './components/ui';
import { Button, Card, Badge, SpiderChart, Logo, DeIcon, type SpiderDatum } from './components/de';

// Decorative radar for the hero preview card (illustrative, not live data).
const PREVIEW_DIMS: SpiderDatum[] = [
  { axis: 'ภาวะผู้นำ', current: 4.2, target: 4.6 },
  { axis: 'PLC', current: 3.8, target: 4.4 },
  { axis: 'การเรียนรู้', current: 4.1, target: 4.5 },
  { axis: 'ผู้เรียน', current: 3.9, target: 4.3 },
  { axis: 'เครือข่าย', current: 4.0, target: 4.5 },
  { axis: 'ข้อมูล', current: 4.3, target: 4.7 },
];

function NavBar({ onLogin, theme, onToggleTheme }: { onLogin: () => void; theme: string; onToggleTheme: () => void }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const sc = () => setSolid(window.scrollY > 40);
    sc();
    window.addEventListener('scroll', sc, { passive: true });
    return () => window.removeEventListener('scroll', sc);
  }, []);
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 96,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 64px)', transition: 'all var(--dur-slow) var(--ease)',
        background: solid ? 'color-mix(in srgb, var(--de-bg-surface) 88%, transparent)' : 'transparent',
        backdropFilter: solid ? 'blur(14px)' : 'none', WebkitBackdropFilter: solid ? 'blur(14px)' : 'none',
        borderBottom: solid ? '1px solid var(--de-border)' : '1px solid transparent',
      }}
    >
      <Logo size={30} markSize={74} light={!solid} sub={false} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px,2vw,28px)' }}>
        {['ฟีเจอร์', 'วิธีการทำงาน', 'เกี่ยวกับ'].map((t, i) => (
          <a key={t} href={'#sec' + i} className="de-navlink de-hide-sm" style={{ fontSize: 14.5, fontWeight: 500, color: solid ? 'var(--de-text-secondary)' : 'rgba(255,255,255,0.85)' }}>{t}</a>
        ))}
        <button onClick={onToggleTheme} aria-label="สลับธีม" style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', border: 'none', display: 'grid', placeItems: 'center', background: solid ? 'var(--de-bg-subtle)' : 'rgba(255,255,255,0.15)', color: solid ? 'var(--de-text-primary)' : '#fff' }}>
          <DeIcon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
        </button>
        <Button variant={solid ? 'primary' : 'gradient'} iconRight="arrowRight" onClick={onLogin}>เข้าสู่ระบบ</Button>
      </div>
    </nav>
  );
}

function HeroPreview() {
  return (
    <div style={{ position: 'relative', perspective: 1400 }}>
      <div
        style={{
          background: 'var(--de-bg-surface)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--sh-2xl)',
          border: '1px solid var(--de-border)', padding: 24, transform: 'rotateY(-9deg) rotateX(4deg)',
          animation: 'de-float 6s ease-in-out infinite',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--de-text-tertiary)' }}>ภาพรวมคุณภาพ</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>โรงเรียนบ้านดอยตุง</div>
          </div>
          <Badge tone="success" dot>92% ดีเยี่ยม</Badge>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ flex: '0 0 180px' }}>
            <SpiderChart data={PREVIEW_DIMS} size={180} max={5} />
          </div>
          <div style={{ flex: 1, display: 'grid', gap: 12 }}>
            {([['คะแนนเฉลี่ย', '4.05', 'var(--de-purple-600)'], ['ตัวชี้วัดผ่าน', '38/47', 'var(--de-blue-600)'], ['ครูประเมินแล้ว', '24/24', 'var(--de-success)']] as const).map(([l, v, c]) => (
              <div key={l} style={{ background: 'var(--de-bg-subtle)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--de-text-secondary)' }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: -22, left: -28, background: 'var(--de-bg-surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', border: '1px solid var(--de-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, animation: 'de-float 5s ease-in-out infinite 0.5s' }}>
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--de-success-soft)', color: 'var(--de-success)', display: 'grid', placeItems: 'center' }}>
          <DeIcon name="trendUp" size={18} />
        </span>
        <div>
          <div style={{ fontSize: 12, color: 'var(--de-text-secondary)' }}>พัฒนาขึ้น</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>+12%</div>
        </div>
      </div>
    </div>
  );
}

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <header style={{ position: 'relative', minHeight: '100vh', background: 'var(--de-gradient-hero)', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: 96 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '34px 34px', opacity: 0.06 }} />
      <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.45), transparent 70%)', top: -120, right: -80, filter: 'blur(20px)' }} />
      <img src="/brand/p20.png" alt="" aria-hidden className="de-hero-person" style={{ position: 'absolute', bottom: 0, right: 'clamp(0px,1vw,28px)', width: 'clamp(300px,29vw,440px)', zIndex: 6, pointerEvents: 'none', filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.35))' }} />
      <div className="de-hero-grid" style={{ position: 'relative', zIndex: 3, maxWidth: 1280, margin: '0 auto', padding: '60px clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 56, alignItems: 'center', width: '100%' }}>
        <div className="de-slide-up">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 13.5, fontWeight: 500, marginBottom: 24 }}>
            <DeIcon name="sparkles" size={15} /> รองรับ Q-Model · THAI P.1–3 · DERS
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 5.4vw, 68px)', fontWeight: 700, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.025em', textWrap: 'balance' }}>
            ระบบประเมินและพัฒนา<br />
            <span style={{ background: 'linear-gradient(90deg,#C4B5FD,#93C5FD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>คุณภาพโรงเรียน</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px,1.4vw,19px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, marginTop: 22, maxWidth: 540 }}>
            แพลตฟอร์มครบวงจรสำหรับมูลนิธิแม่ฟ้าหลวง ตั้งแต่การประเมินตามตัวชี้วัด การวิเคราะห์ SAR ด้วย AI ไปจนถึงรายงานและแดชบอร์ดแบบเรียลไทม์
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 34, flexWrap: 'wrap' }}>
            <Button size="lg" variant="gradient" iconRight="arrowRight" onClick={onLogin} style={{ background: '#fff', color: 'var(--de-purple-700)' }}>เริ่มต้นใช้งาน</Button>
            <a href="#sec1"><Button size="lg" variant="ghost" icon="play" style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>ดูการสาธิต</Button></a>
          </div>
        </div>
        <div className="de-hero-preview"><HeroPreview /></div>
      </div>
    </header>
  );
}

function StatsBar() {
  const stats = [['47+', 'โรงเรียนในเครือข่าย'], ['320+', 'ครูที่ร่วมประเมิน'], ['3', 'รอบการประเมิน/ปี'], ['3', 'เครื่องมือมาตรฐาน']];
  return (
    <section style={{ background: 'var(--de-bg-surface)', borderTop: '1px solid var(--de-border)', borderBottom: '1px solid var(--de-border)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '44px clamp(20px,5vw,64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 24 }}>
        {stats.map(([v, l], i) => (
          <div key={i} style={{ textAlign: 'center', borderLeft: i ? '1px solid var(--de-border)' : 'none' }}>
            <div style={{ fontSize: 'clamp(34px,4vw,46px)', fontWeight: 700, background: 'var(--de-gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>{v}</div>
            <div style={{ fontSize: 14.5, color: 'var(--de-text-secondary)', marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const feats: [Parameters<typeof DeIcon>[0]['name'], string, string, 'purple' | 'blue'][] = [
    ['checkCircle', 'Q-Model Assessment', 'ประเมิน 47 ตัวชี้วัด 4 มิติ ด้วยมาตรวัด Likert 1–5 พร้อม rubric กำกับทุกข้อ', 'purple'],
    ['users', 'THAI P.1–3 Dual Review', 'ประเมินร่วมกันระหว่างครูและผู้อำนวยการแบบ Teacher-Pair ลดอคติเชิงเดี่ยว', 'blue'],
    ['activity', 'Live Dashboard', 'แดชบอร์ดสดรีเฟรชทุก 5 วินาที พร้อม Spider chart เปรียบเทียบเป้าหมาย', 'purple'],
    ['fileText', 'SAR + AI Analysis', 'อัปโหลดเอกสาร SAR แล้วให้ AI วิเคราะห์ SOAR และสรุปจุดเด่นจุดพัฒนาอัตโนมัติ', 'blue'],
    ['layout', 'Sticky Brainstorm', 'กระดาน Post-it ออนไลน์ พร้อม Iceberg Model สำหรับวิเคราะห์รากของปัญหา', 'purple'],
    ['shieldCheck', 'Multi-Role Access', 'จัดการสิทธิ์แยกตามบทบาท ADMIN · ผอ. · ครู · ศึกษานิเทศก์ อย่างปลอดภัย', 'blue'],
  ];
  return (
    <section id="sec0" style={{ background: 'var(--de-bg-canvas)', padding: '100px clamp(20px,5vw,64px)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 56px' }}>
          <Badge tone="brand">ฟีเจอร์หลัก</Badge>
          <h2 style={{ fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 16, lineHeight: 1.15 }}>ออกแบบมาเพื่อโรงเรียนโดยเฉพาะ</h2>
          <p style={{ fontSize: 17, color: 'var(--de-text-secondary)', marginTop: 14 }}>ทุกเครื่องมือที่จำเป็นสำหรับการประเมินและพัฒนาคุณภาพการศึกษา ในที่เดียว</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 22 }}>
          {feats.map(([icon, title, desc, tone], i) => (
            <Card key={i} hover className="de-slide-up" style={{ padding: 28, animationDelay: i * 60 + 'ms' }}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: tone === 'purple' ? 'linear-gradient(135deg,var(--de-purple-100),var(--de-blue-100))' : 'linear-gradient(135deg,var(--de-blue-100),var(--de-purple-100))', color: tone === 'purple' ? 'var(--de-purple-600)' : 'var(--de-blue-600)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
                <DeIcon name={icon} size={26} />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 15, color: 'var(--de-text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: [string, string, Parameters<typeof DeIcon>[0]['name']][] = [
    ['สร้างรอบการประเมิน', 'ผู้ดูแลหรือผู้อำนวยการเปิด session การประเมิน เลือกเครื่องมือและกำหนดช่วงเวลา', 'calendar'],
    ['ครูทำแบบประเมิน', 'ครูกรอกแบบประเมินตามตัวชี้วัด ระบบบันทึกอัตโนมัติทุกการเปลี่ยนแปลง', 'clipboard'],
    ['ดูรายงานและแดชบอร์ด', 'ผลสรุปเป็น Spider chart, สรุปด้วย AI และส่งออกเป็น PDF ได้ทันที', 'chart'],
  ];
  return (
    <section id="sec1" style={{ background: 'var(--de-bg-surface)', padding: '100px clamp(20px,5vw,64px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Badge tone="blue">ขั้นตอนการใช้งาน</Badge>
          <h2 style={{ fontSize: 'clamp(30px,3.4vw,44px)', fontWeight: 700, letterSpacing: '-0.02em', marginTop: 16 }}>ใช้งานง่ายใน 3 ขั้นตอน</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 32, position: 'relative' }}>
          {steps.map(([title, desc, icon], i) => (
            <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--de-gradient-brand)', color: '#fff', display: 'grid', placeItems: 'center', margin: '0 auto 20px', boxShadow: 'var(--sh-lg)', position: 'relative' }}>
                <DeIcon name={icon} size={30} />
                <span style={{ position: 'absolute', top: -6, right: -6, width: 28, height: 28, borderRadius: '50%', background: 'var(--de-bg-surface)', color: 'var(--de-primary)', border: '2px solid var(--de-primary)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>{i + 1}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 15, color: 'var(--de-text-secondary)', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="sec2" style={{ padding: '40px clamp(20px,5vw,64px) 100px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', borderRadius: 'var(--r-xl)', background: 'var(--de-gradient-hero)', padding: 'clamp(40px,6vw,72px)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.07 }} />
        <img src="/brand/p38.png" alt="" aria-hidden className="de-cta-person" style={{ position: 'absolute', left: 'clamp(0px,1vw,24px)', bottom: 0, width: 'clamp(200px,19vw,290px)', zIndex: 4, pointerEvents: 'none', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.3))' }} />
        <div style={{ position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px,3.4vw,42px)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>พร้อมเริ่มต้นแล้วหรือยัง?</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.82)', marginTop: 14, marginBottom: 32 }}>ระบบพร้อมใช้งาน เข้าสู่ระบบด้วยบัญชีของคุณได้เลย</p>
          <Button size="lg" iconRight="arrowRight" onClick={onLogin} style={{ background: '#fff', color: 'var(--de-purple-700)' }}>เข้าสู่ระบบ</Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, string[]][] = [
    ['เมนูหลัก', ['หน้าหลัก', 'รายการประเมิน', 'รายงาน', 'เอกสาร SAR']],
    ['เครื่องมือ', ['Q-Model', 'THAI P.1–3', 'DERS', 'Live Dashboard']],
    ['ติดต่อ', ['มูลนิธิแม่ฟ้าหลวง', 'อ.แม่ฟ้าหลวง จ.เชียงราย', 'support@de.doitung.org']],
  ];
  return (
    <footer style={{ background: 'var(--de-slate-900)', color: 'rgba(255,255,255,0.7)', padding: '64px clamp(20px,5vw,64px) 32px' }}>
      <div className="de-footer-grid" style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(220px,1.4fr) repeat(3,minmax(140px,1fr))', gap: 40 }}>
        <div>
          <Logo size={30} markSize={66} light sub={false} />
          <p style={{ fontSize: 14, marginTop: 16, lineHeight: 1.6, maxWidth: 280, color: 'rgba(255,255,255,0.6)' }}>แพลตฟอร์มประเมินและพัฒนาคุณภาพโรงเรียน ภายใต้มูลนิธิแม่ฟ้าหลวง ในพระบรมราชูปถัมภ์</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>{title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {links.map((l) => <a key={l} href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{l}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth: 1180, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
        © 2025–2026 Doitung CNPPAI · มูลนิธิแม่ฟ้าหลวง ในพระบรมราชูปถัมภ์ · สงวนลิขสิทธิ์
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const onLogin = () => router.push('/login');
  return (
    <div style={{ overflowX: 'hidden', background: 'var(--de-bg-canvas)' }}>
      <NavBar onLogin={onLogin} theme={theme} onToggleTheme={toggleTheme} />
      <Hero onLogin={onLogin} />
      <StatsBar />
      <Features />
      <HowItWorks />
      <CTA onLogin={onLogin} />
      <Footer />
    </div>
  );
}
