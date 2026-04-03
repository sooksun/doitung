// app/reports/page.tsx
// Reports page

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function ReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [qModel, setQModel] = useState<QModelProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    fetchReportsData(storedToken);
  }, [router]);

  const fetchReportsData = async (authToken: string) => {
    try {
      const [summaryRes, qModelRes] = await Promise.all([
        fetch('/api/dashboard/summary', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
        fetch('/api/dashboard/q-model', {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }),
      ]);

      if (!summaryRes.ok || !qModelRes.ok) {
        if (summaryRes.status === 401 || qModelRes.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch reports data');
      }

      const summaryData = await summaryRes.json();
      const qModelData = await qModelRes.json();

      if (summaryData.success) setSummary(summaryData.data);
      if (qModelData.success) setQModel(qModelData.data);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
              📈 รายงาน
            </h1>
            <p style={{ color: '#666' }}>รายงานและสถิติระบบ</p>
          </div>
          <div>
            <Link
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none'
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee',
            color: '#c33',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Summary Cards */}
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

        {/* Q-Model Report */}
        {qModel && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#333' }}>
              📊 Q-Model Progress Report
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

        {/* Export Options */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
            📥 Export Reports
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <button
              style={{
                padding: '1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onClick={() => alert('Export PDF - Coming soon!')}
            >
              📄 Export PDF
            </button>
            <button
              style={{
                padding: '1rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              onClick={() => alert('Export Excel - Coming soon!')}
            >
              📊 Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

