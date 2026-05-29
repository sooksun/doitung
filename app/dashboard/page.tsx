// app/dashboard/page.tsx
// Dashboard page - Overview and statistics with real-time polling (5s)

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SpiderChart, { SpiderChartDataPoint } from './components/SpiderChart';

const POLL_INTERVAL = 5000;

interface DashboardSummary {
  completionRate: number;
  overallQualityIndex: number;
  kpiCards: Array<{
    label: string;
    value: number;
    unit?: string;
    status?: 'green' | 'yellow' | 'red';
  }>;
}

interface QModelProgress {
  dimensionProgress: Array<{
    dimension: string;
    labelTh: string;
    current: number;
    target: number;
    progress: number;
    status: 'green' | 'yellow' | 'red';
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [qModel, setQModel] = useState<QModelProgress | null>(null);
  const [spiderData, setSpiderData] = useState<SpiderChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastFetchRef = useRef<number>(Date.now());
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDashboardData = useCallback(async (authToken: string, isInitial = false) => {
    try {
      const [summaryRes, qModelRes, spiderRes] = await Promise.all([
        fetch('/api/dashboard/summary', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/dashboard/q-model', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/dashboard/spider-graph', { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      if (summaryRes.status === 401 || qModelRes.status === 401 || spiderRes.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (!summaryRes.ok || !qModelRes.ok || !spiderRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const summaryData = await summaryRes.json();
      const qModelData = await qModelRes.json();
      const spiderJson = await spiderRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (qModelData.success) setQModel(qModelData.data);
      if (spiderJson.success) setSpiderData(spiderJson.data.dataPoints || []);

      lastFetchRef.current = Date.now();
      setSecondsAgo(0);
      if (isInitial) setError('');
    } catch (err) {
      if (isInitial) setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      // silent on poll — keep showing last good data
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [router]);

  // Auth + initial fetch
  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      router.push('/login');
      return;
    }
    setToken(stored);
    fetchDashboardData(stored, true);
  }, [router, fetchDashboardData]);

  // Polling
  useEffect(() => {
    if (!token || paused) return;
    pollRef.current = setInterval(() => fetchDashboardData(token), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, paused, fetchDashboardData]);

  // "X seconds ago" ticker
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchRef.current) / 1000));
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
                📊 Dashboard
              </h1>
              <p style={{ color: '#666' }}>ภาพรวมและสถิติระบบ — อัปเดตแบบเรียลไทม์</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* LIVE indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: paused ? '#fbbf24' : '#ef4444',
                    boxShadow: paused ? 'none' : '0 0 8px #ef4444',
                    display: 'inline-block',
                    animation: paused ? 'none' : 'pulse 1.5s infinite',
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: paused ? '#fbbf24' : '#ef4444' }}>
                  {paused ? 'PAUSED' : 'LIVE'}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                อัปเดต {secondsAgo}s ที่แล้ว
              </span>
              <button
                onClick={() => setPaused((p) => !p)}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.4rem',
                  color: '#333',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <Link
                href="/"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#667eea',
                  color: 'white',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                }}
              >
                หน้าหลัก
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  router.push('/login');
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {summary && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {summary.kpiCards.map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  {kpi.label}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
                  {kpi.value}{kpi.unit || ''}
                </div>
                {kpi.status && (
                  <div style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    height: '4px',
                    background: kpi.status === 'green' ? '#10b981' : kpi.status === 'yellow' ? '#f59e0b' : '#ef4444',
                    borderRadius: '2px'
                  }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Spider Graph */}
        {spiderData.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <SpiderChart data={spiderData} height={450} />
          </div>
        )}

        {/* Q-Model Progress */}
        {qModel && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#333' }}>
              📈 Q-Model Progress
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {qModel.dimensionProgress.map((dim, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '500', color: '#333' }}>{dim.labelTh}</span>
                    <span style={{ color: '#666' }}>
                      {dim.current} / {dim.target} ({dim.progress}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '24px',
                    background: '#e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div
                      style={{
                        width: `${Math.min(dim.progress, 100)}%`,
                        height: '100%',
                        background: dim.status === 'green' ? '#10b981' : dim.status === 'yellow' ? '#f59e0b' : '#ef4444',
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <Link
            href="/instruments"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            📋 เครื่องมือประเมิน
          </Link>
          <Link
            href="/evaluations"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            ✅ การประเมิน
          </Link>
          <Link
            href="/reports"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            📈 รายงาน
          </Link>
          <Link
            href="/users"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            👥 จัดการผู้ใช้
          </Link>
          <Link
            href="/admin/sar"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            📚 คลังข้อมูลการระดมสมอง
          </Link>
          <Link
            href="/admin/settings/feature-flags"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            🚦 Feature Flags
          </Link>
          <Link
            href="/admin/schools"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            🏫 ตั้งค่าโรงเรียน
          </Link>
          <Link
            href="/admin/networks"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            🌐 จัดการกลุ่มโรงเรียน
          </Link>
          <Link
            href="/admin/evaluations"
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: '#333',
              textAlign: 'center'
            }}
          >
            🔄 Reset/ยกเลิกการประเมิน
          </Link>
          <Link
            href="/live-dashboard"
            style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 8px rgba(129,140,248,0.4)',
              textDecoration: 'none',
              color: 'white',
              textAlign: 'center',
              fontWeight: 600,
              border: '1px solid rgba(129,140,248,0.5)',
            }}
          >
            📡 Live Dashboard
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
