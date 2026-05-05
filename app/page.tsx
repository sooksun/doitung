// app/page.tsx
// Home page / Dashboard

'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      fontFamily: 'Kanit, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            Doitung School Quality Dashboard
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            ระบบประเมินและพัฒนาคุณภาพโรงเรียนด้วยเครื่องมือ DERS, Thai P.1-3, และ Q-Model
          </p>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <Card
            title="เข้าสู่ระบบ"
            description="Login เพื่อเข้าสู่ระบบ"
            href="/login"
            icon="🔐"
          />
          <Card
            title="Dashboard"
            description="ดูภาพรวมและสถิติ"
            href="/dashboard"
            icon="📊"
          />
          <Card
            title="เครื่องมือประเมิน"
            description="จัดการ Instruments (DERS, Thai P.1-3, Q-Model)"
            href="/instruments"
            icon="📋"
          />
          <Card
            title="การประเมิน"
            description="จัดการ Evaluation Sessions"
            href="/evaluations"
            icon="✅"
          />
          <Card
            title="รายงาน"
            description="ดูรายงานและสถิติ"
            href="/reports"
            icon="📈"
          />
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          padding: '2rem',
          borderRadius: '1rem',
          marginTop: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            🚀 API Status
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatusItem label="Server" value="Running" status="success" />
            <StatusItem label="Database" value="Connected" status="success" />
            <StatusItem label="Port" value="3001" status="info" />
            <StatusItem label="API Endpoints" value="9/9" status="success" />
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem'
        }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📚 Quick Links</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/api/instruments" style={{ color: '#fff', textDecoration: 'underline' }}>
                🔗 /api/instruments
              </Link>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <Link href="/api/dashboard/summary" style={{ color: '#fff', textDecoration: 'underline' }}>
                🔗 /api/dashboard/summary
              </Link>
            </li>
          </ul>
        </div>

        <footer style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          opacity: 0.8
        }}>
          <p>Doitung School Quality Dashboard © 2024</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Next.js 14 | Prisma | MySQL | TypeScript
          </p>
        </footer>
      </div>
    </div>
  );
}

function Card({ title, description, href, icon }: { 
  title: string; 
  description: string; 
  href: string; 
  icon: string;
}) {
  return (
    <Link 
      href={href}
      style={{
        display: 'block',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '1.5rem',
        borderRadius: '1rem',
        textDecoration: 'none',
        color: 'white',
        transition: 'transform 0.2s, background 0.2s',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>
        {description}
      </p>
    </Link>
  );
}

function StatusItem({ label, value, status }: { 
  label: string; 
  value: string; 
  status: 'success' | 'error' | 'info';
}) {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6'
  };

  return (
    <div>
      <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.25rem' }}>
        {label}
      </div>
      <div style={{ 
        fontSize: '1.1rem', 
        fontWeight: 'bold',
        color: colors[status]
      }}>
        {value}
      </div>
    </div>
  );
}

