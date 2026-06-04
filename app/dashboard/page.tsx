// app/dashboard/page.tsx
// Dashboard page - Overview and statistics with real-time polling (5s).
// UI redesigned to the TSQMn DE kit; data fetching / polling / auth unchanged.

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type SpiderChartDataPoint } from './components/SpiderChart';
import {
  PageHeader, StatCard, Card, SpiderChart, Donut, ProgressBar, Button, DeIcon,
  trafficColor, type DeIconName, type SpiderDatum,
} from '@/app/components/de';

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

const KPI_ICONS: DeIconName[] = ['school', 'checkCircle', 'clock', 'alert', 'target', 'chart'];
const statusAccent = (s?: string): 'purple' | 'blue' | 'success' | 'warning' =>
  s === 'green' ? 'success' : s === 'yellow' ? 'warning' : s === 'red' ? 'warning' : 'purple';
const barTone = (s: string): 'success' | 'warning' | 'danger' | 'brand' =>
  s === 'green' ? 'success' : s === 'yellow' ? 'warning' : s === 'red' ? 'danger' : 'brand';

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
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', gap: 16 }}>
        <span style={{ width: 34, height: 34, border: '3px solid var(--de-border-strong)', borderTopColor: 'var(--de-primary)', borderRadius: '50%', animation: 'de-spin 0.7s linear infinite' }} />
        <p style={{ color: 'var(--de-text-secondary)' }}>กำลังโหลดข้อมูล…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: 32, textAlign: 'center', maxWidth: 460, margin: '40px auto' }}>
        <div style={{ display: 'grid', placeItems: 'center', color: 'var(--de-danger)', marginBottom: 12 }}>
          <DeIcon name="alert" size={36} />
        </div>
        <p style={{ color: 'var(--de-text-secondary)' }}>{error}</p>
        <div style={{ marginTop: 18 }}>
          <Button variant="primary" icon="refresh" onClick={() => token && fetchDashboardData(token, true)}>ลองอีกครั้ง</Button>
        </div>
      </Card>
    );
  }

  const dims = qModel?.dimensionProgress ?? [];
  const spider: SpiderDatum[] = spiderData.map((p) => ({ axis: p.groupName, current: p.currentState || 0, target: p.targetDesiredState || 0 }));
  const cnt = (s: string) => dims.filter((d) => d.status === s).length;
  const breakdown: [string, string, number][] = [
    ['ดีเยี่ยม', 'green', cnt('green')],
    ['พอใช้', 'yellow', cnt('yellow')],
    ['ต้องปรับปรุง', 'red', cnt('red')],
  ];

  return (
    <div>
      <PageHeader
        title="ภาพรวมคุณภาพการศึกษา"
        subtitle="สรุปผลการประเมินคุณภาพการศึกษาแบบเรียลไทม์"
        actions={
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: paused ? 'var(--de-text-tertiary)' : 'var(--de-success)', background: paused ? 'var(--de-bg-subtle)' : 'var(--de-success-soft)', padding: '6px 12px', borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: paused ? 'var(--de-text-tertiary)' : 'var(--de-success)', animation: paused ? 'none' : 'de-pulse 1.5s infinite' }} />
              {paused ? 'หยุดชั่วคราว' : 'กำลังถ่ายทอดสด'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--de-text-tertiary)' }}>อัปเดต {secondsAgo}s ที่แล้ว</span>
            <Button variant={paused ? 'primary' : 'outline'} icon={paused ? 'play' : 'pause'} onClick={() => setPaused((p) => !p)}>
              {paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
            </Button>
          </>
        }
      />

      {summary && summary.kpiCards?.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginBottom: 24 }}>
          {summary.kpiCards.map((k, i) => (
            <StatCard key={i} icon={KPI_ICONS[i % KPI_ICONS.length]} value={`${k.value}${k.unit || ''}`} label={k.label} accent={statusAccent(k.status)} delay={i * 60} />
          ))}
        </div>
      ) : null}

      <div className="de-dash-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 18, marginBottom: 24 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>คุณภาพรายมิติ (Q-Model)</h2>
            <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--de-purple-400)' }} />สภาพที่เป็นอยู่</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 3, background: 'var(--de-blue-400)' }} />เป้าหมาย</span>
            </div>
          </div>
          <div className="de-spider-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,320px) 1fr', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              {spider.length ? (
                <SpiderChart data={spider} size={320} max={5} />
              ) : (
                <div style={{ color: 'var(--de-text-tertiary)', fontSize: 14, padding: 40 }}>ยังไม่มีข้อมูลกราฟ</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dims.map((d, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5, gap: 8 }}>
                    <span style={{ color: 'var(--de-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{d.labelTh}</span>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{d.current.toFixed(1)}<span style={{ color: 'var(--de-text-tertiary)', fontWeight: 400 }}> / {d.target.toFixed(1)}</span></span>
                  </div>
                  <ProgressBar value={d.progress} tone={barTone(d.status)} height={7} />
                </div>
              ))}
            </div>
          </div>
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
