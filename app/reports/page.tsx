// app/reports/page.tsx
// Reports page. UI redesigned to the TSQMn DE kit; data fetching / auth and the
// export placeholders are unchanged. Only renders metrics the API actually returns.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toastInfo } from '@/lib/toast';
import {
  PageHeader, StatCard, Card, Donut, ProgressBar, Button, DeIcon,
  trafficColor, type DeIconName,
} from '@/app/components/de';

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

const KPI_ICONS: DeIconName[] = ['chart', 'checkCircle', 'target', 'fileText', 'barChart', 'school'];
const statusAccent = (s?: string): 'purple' | 'blue' | 'success' | 'warning' =>
  s === 'green' ? 'success' : s === 'yellow' ? 'warning' : s === 'red' ? 'warning' : 'blue';
const barTone = (s: string): 'success' | 'warning' | 'danger' | 'brand' =>
  s === 'green' ? 'success' : s === 'yellow' ? 'warning' : s === 'red' ? 'danger' : 'brand';

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
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ width: 34, height: 34, border: '3px solid var(--de-border-strong)', borderTopColor: 'var(--de-primary)', borderRadius: '50%', animation: 'de-spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--de-text-secondary)' }}>กำลังโหลดข้อมูล…</p>
      </div>
    );
  }

  const dims = qModel?.dimensionProgress ?? [];
  const cnt = (s: string) => dims.filter((d) => d.status === s).length;
  const breakdown: [string, string, number][] = [
    ['ดีเยี่ยม', 'green', cnt('green')],
    ['พอใช้', 'yellow', cnt('yellow')],
    ['ต้องปรับปรุง', 'red', cnt('red')],
  ];

  return (
    <div>
      <PageHeader
        title="รายงานสรุป"
        subtitle="รายงานคุณภาพการศึกษาในระบบ"
        actions={
          <>
            <Button variant="outline" icon="download" onClick={() => toastInfo('Export PDF — กำลังพัฒนา')}>Export PDF</Button>
            <Button variant="primary" icon="download" onClick={() => toastInfo('Export Excel — กำลังพัฒนา')}>Export Excel</Button>
          </>
        }
      />

      {error ? (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeIcon name="alert" size={16} /> {error}
        </div>
      ) : null}

      {summary && summary.kpiCards?.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginBottom: 24 }}>
          {summary.kpiCards.map((k, i) => (
            <StatCard key={i} icon={KPI_ICONS[i % KPI_ICONS.length]} value={`${k.value}${k.unit || ''}`} label={k.label} accent={statusAccent(k.status)} delay={i * 60} />
          ))}
        </div>
      ) : null}

      <div className="de-dash-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18 }}>
        <Card style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>รายงานคุณภาพรายมิติ (Q-Model)</h2>
          {dims.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {dims.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6, gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{d.labelTh}</span>
                    <span style={{ fontWeight: 600 }}>{d.current.toFixed(1)}<span style={{ color: 'var(--de-text-tertiary)', fontWeight: 400 }}> / {d.target.toFixed(1)} ({d.progress}%)</span></span>
                  </div>
                  <ProgressBar value={d.progress} tone={barTone(d.status)} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--de-text-tertiary)', fontSize: 14, padding: 24 }}>ยังไม่มีข้อมูลรายมิติ</div>
          )}
        </Card>

        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>ดัชนีคุณภาพรวม</h2>
          <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0 16px' }}>
            <Donut value={Math.round(summary?.overallQualityIndex ?? 0)} label={`ประเมินครบ ${Math.round(summary?.completionRate ?? 0)}%`} size={168} stroke={16} color="var(--de-purple-500)" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 'auto' }}>
            {breakdown.map(([l, s, n]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--de-bg-subtle)', borderRadius: 'var(--r-md)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: trafficColor(s) }} />
                <div>
                  <div style={{ fontSize: 19, fontWeight: 700 }}>{n}</div>
                  <div style={{ fontSize: 12, color: 'var(--de-text-secondary)' }}>{l}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
