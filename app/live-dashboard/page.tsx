// app/live-dashboard/page.tsx
// Live Real-Time Display Dashboard
// สำหรับฉายบนจอโปรเจคเตอร์/TV ขณะครูกำลังประเมินพร้อมกัน

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LiveSpiderChart from './components/LiveSpiderChart';
import LiveIndicator from './components/LiveIndicator';
import AnimatedNumber from './components/AnimatedNumber';
import ScopeSelector from './components/ScopeSelector';

const POLL_INTERVAL = 5000; // 5 seconds

interface LiveData {
  lastUpdated: string;
  scopeLabel: string;
  participatingSchools: number;
  totalSessions: number;
  totalResponses: number;
  activeEvaluators: number;
  completionRate: number;
  overallQualityIndex: number;
  spiderData: Array<{ dimension: string; labelTh: string; current: number; target: number }>;
  dimensionScores: Array<{
    dimension: string;
    labelTh: string;
    percent: number;
    status: 'green' | 'yellow' | 'red';
    avgScore: number;
    maxScore: number;
  }>;
  indicatorHealth: Array<{
    code: string | null;
    nameTh: string;
    score: number | null;
    max: number;
    progress: number | null;
    sectionKey: string;
    sectionLabelTh: string;
  }>;
}

interface School { id: number; nameTh: string; }
interface Network { id: number; name: string; }
interface AcademicYear { id: number; year: string; }
interface Term { id: number; termNumber: number; academicYearId: number; }

export default function LiveDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // Filter state
  const [scope, setScope] = useState<'school' | 'network' | 'district'>('district');
  const [schoolId, setSchoolId] = useState<number | undefined>();
  const [networkId, setNetworkId] = useState<number | undefined>();
  const [academicYearId, setAcademicYearId] = useState<number | undefined>();
  const [termId, setTermId] = useState<number | undefined>();

  // Reference data
  const [schools, setSchools] = useState<School[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // Live data
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [prevDimScores, setPrevDimScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [activeIndicatorTab, setActiveIndicatorTab] = useState<'Q-Leadership' | 'Q-PLC' | 'Q-Learning' | 'Q-Students'>('Q-Leadership');
  const lastFetchTime = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auth check
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
  }, [router]);

  // Load reference data once
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/schools', { headers }).then((r) => r.json()),
      fetch('/api/networks', { headers }).then((r) => r.json()),
      fetch('/api/academic-years', { headers }).then((r) => r.json()),
      fetch('/api/terms', { headers }).then((r) => r.json()),
    ]).then(([schoolsRes, networksRes, yearsRes, termsRes]) => {
      if (schoolsRes.success) setSchools(schoolsRes.data?.schools || schoolsRes.data || []);
      if (networksRes.success) setNetworks(networksRes.data?.networks || networksRes.data || []);
      if (yearsRes.success) setAcademicYears(yearsRes.data?.academicYears || yearsRes.data || []);
      if (termsRes.success) setTerms(termsRes.data?.terms || termsRes.data || []);
    }).catch(() => {});
  }, [token]);

  // Fetch live data
  const fetchLiveData = useCallback(async (authToken: string) => {
    try {
      const params = new URLSearchParams({ scope });
      if (scope === 'school' && schoolId) params.set('schoolId', String(schoolId));
      if (scope === 'network' && networkId) params.set('networkId', String(networkId));
      if (academicYearId) params.set('academicYearId', String(academicYearId));
      if (termId) params.set('termId', String(termId));

      const res = await fetch(`/api/live-dashboard?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      const json = await res.json();
      if (json.success) {
        setLiveData((prev) => {
          // Save previous dimension scores for delta calculation
          if (prev) {
            const prevScores: Record<string, number> = {};
            prev.dimensionScores.forEach((d) => { prevScores[d.dimension] = d.percent; });
            setPrevDimScores(prevScores);
          }
          return json.data;
        });
        lastFetchTime.current = Date.now();
        setSecondsAgo(0);
      }
    } catch {
      // silently fail — keep showing last data
    } finally {
      setLoading(false);
    }
  }, [scope, schoolId, networkId, academicYearId, termId, router]);

  // Set up polling
  useEffect(() => {
    if (!token) return;

    fetchLiveData(token);

    if (!paused) {
      intervalRef.current = setInterval(() => fetchLiveData(token), POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, paused, fetchLiveData]);

  // "Seconds ago" ticker
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchTime.current) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        color: '#e2e8f0',
        fontFamily: 'Kanit, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href="/dashboard"
              style={{
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                fontSize: '0.85rem',
              }}
            >
              ← Dashboard
            </Link>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.2 }}>
                {liveData?.scopeLabel || 'กำลังโหลด...'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                Educational Assessment — Live Display
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* LIVE indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: paused ? '#fbbf24' : '#f87171',
                  display: 'inline-block',
                  boxShadow: paused ? 'none' : '0 0 8px #f87171',
                  animation: paused ? 'none' : 'pulse 1.5s infinite',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: paused ? '#fbbf24' : '#f87171' }}>
                {paused ? 'PAUSED' : 'LIVE'}
              </span>
            </div>

            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              อัปเดต {secondsAgo}s ที่แล้ว
            </span>

            <button
              onClick={() => setPaused((p) => !p)}
              style={{
                padding: '0.3rem 0.7rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.35rem',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button
              onClick={toggleFullscreen}
              style={{
                padding: '0.3rem 0.7rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '0.35rem',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ⛶ Fullscreen
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <ScopeSelector
          scope={scope}
          schoolId={schoolId}
          networkId={networkId}
          academicYearId={academicYearId}
          termId={termId}
          schools={schools}
          networks={networks}
          academicYears={academicYears}
          terms={terms}
          onScopeChange={(s) => { setScope(s); setSchoolId(undefined); setNetworkId(undefined); }}
          onSchoolChange={setSchoolId}
          onNetworkChange={setNetworkId}
          onYearChange={setAcademicYearId}
          onTermChange={setTermId}
        />
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
            <div>กำลังโหลดข้อมูล...</div>
          </div>
        </div>
      ) : (
        <>
          {/* ===== MAIN 3-COLUMN AREA ===== */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '220px 1fr 240px',
              gap: '1rem',
              padding: '1rem 1.5rem 0.5rem',
            }}
          >
            {/* LEFT PANEL — KPI stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <KpiCard
                label="อัตราความสำเร็จ"
                icon="✅"
                color="#34d399"
              >
                <AnimatedNumber
                  value={liveData?.completionRate ?? 0}
                  suffix="%"
                  style={{ fontSize: '2.5rem', fontWeight: 700, color: '#34d399', lineHeight: 1 }}
                />
              </KpiCard>

              <KpiCard label="ดัชนีคุณภาพโดยรวม" icon="🏆" color="#818cf8">
                <AnimatedNumber
                  value={liveData?.overallQualityIndex ?? 0}
                  suffix="%"
                  style={{ fontSize: '2.5rem', fontWeight: 700, color: '#818cf8', lineHeight: 1 }}
                />
              </KpiCard>

              <KpiCard label="ครูที่กำลังประเมิน (ชั่วโมงนี้)" icon="👩‍🏫" color="#fbbf24">
                <AnimatedNumber
                  value={liveData?.activeEvaluators ?? 0}
                  suffix=" คน"
                  style={{ fontSize: '2rem', fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}
                />
              </KpiCard>

              <KpiCard label="โรงเรียนที่เข้าร่วม" icon="🏫" color="#38bdf8">
                <AnimatedNumber
                  value={liveData?.participatingSchools ?? 0}
                  suffix=" แห่ง"
                  style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', lineHeight: 1 }}
                />
              </KpiCard>

              <KpiCard label="รายการประเมินทั้งหมด" icon="📋" color="#a78bfa">
                <AnimatedNumber
                  value={liveData?.totalResponses ?? 0}
                  style={{ fontSize: '1.8rem', fontWeight: 700, color: '#a78bfa', lineHeight: 1 }}
                />
              </KpiCard>
            </div>

            {/* CENTER — Dimension progress bars + Spider Chart */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
              }}
            >
              {/* Per-dimension progress bars (moved from the bottom of the page) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem 1.25rem',
                  marginBottom: '0.85rem',
                  paddingBottom: '0.85rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {(liveData?.dimensionScores ?? []).map((dim) => (
                  <LiveIndicator
                    key={dim.dimension}
                    nameTh={dim.labelTh}
                    percent={dim.percent}
                    status={dim.status}
                    prevPercent={prevDimScores[dim.dimension]}
                    avgScore={dim.avgScore}
                    maxScore={dim.maxScore}
                  />
                ))}
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem', textAlign: 'center' }}>
                Assessment Pillars Comparison — 4 Main Dimensions
              </div>
              <LiveSpiderChart data={liveData?.spiderData ?? []} height={420} />
            </div>

            {/* RIGHT PANEL — Indicator Health (4 tabs, scrollable list per tab) */}
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '1rem',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '1rem 0.75rem 1rem 1rem',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {(() => {
                const TABS: Array<{ key: 'Q-Leadership' | 'Q-PLC' | 'Q-Learning' | 'Q-Students'; label: string; tooltip: string }> = [
                  { key: 'Q-Leadership', label: 'LH',  tooltip: 'Q-Leadership ผู้บริหาร' },
                  { key: 'Q-PLC',        label: 'PLC', tooltip: 'Q-PLC ชุมชนแห่งการเรียนรู้' },
                  { key: 'Q-Learning',   label: 'LN',  tooltip: 'Q-Learning การจัดการเรียนรู้' },
                  { key: 'Q-Students',   label: 'STD', tooltip: 'Q-Students ด้านนักเรียน' },
                ];
                const all = liveData?.indicatorHealth ?? [];
                const counts = TABS.reduce((acc, t) => {
                  acc[t.key] = all.filter((i) => i.sectionKey === t.key).length;
                  return acc;
                }, {} as Record<string, number>);
                const filtered = all.filter((i) => i.sectionKey === activeIndicatorTab);
                const activeMeta = TABS.find((t) => t.key === activeIndicatorTab);

                return (
                  <>
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem', flexShrink: 0 }}>
                      {TABS.map((t) => {
                        const isActive = t.key === activeIndicatorTab;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setActiveIndicatorTab(t.key)}
                            title={t.tooltip}
                            style={{
                              flex: 1,
                              padding: '0.4rem 0.25rem',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              border: '1px solid',
                              borderColor: isActive ? '#818cf8' : 'rgba(255,255,255,0.1)',
                              background: isActive ? 'rgba(129,140,248,0.18)' : 'transparent',
                              color: isActive ? '#c7d2fe' : 'rgba(255,255,255,0.55)',
                              borderRadius: '0.4rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '0.05rem',
                              lineHeight: 1.1,
                            }}
                          >
                            <span>{t.label}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: 0.7 }}>
                              {counts[t.key] || 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'rgba(165,180,252,0.7)',
                        textAlign: 'center',
                        marginBottom: '0.5rem',
                        flexShrink: 0,
                      }}
                    >
                      {activeMeta?.tooltip}
                    </div>

                    <div
                      key={activeIndicatorTab}
                      className="indicator-scroll"
                      style={{
                        overflowY: 'auto',
                        paddingRight: '0.35rem',
                        flex: 1,
                        minHeight: 0,
                      }}
                    >
                      {filtered.length === 0 ? (
                        <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
                          ไม่มีตัวชี้วัดในมิตินี้
                        </div>
                      ) : (
                        filtered.map((ind, idx) => {
                          const hasData = ind.score !== null && ind.progress !== null;
                          return (
                            <div key={`${ind.sectionKey}-${ind.code ?? idx}`} style={{ marginBottom: '0.65rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.35, flex: 1 }}>
                                  {ind.code && (
                                    <span style={{ fontWeight: 700, color: '#818cf8', marginRight: '0.35rem' }}>
                                      {ind.code}
                                    </span>
                                  )}
                                  {ind.nameTh}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: hasData ? '#818cf8' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                                  {hasData ? `${ind.score}/${ind.max}` : '—'}
                                </span>
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: 'rgba(255,255,255,0.08)',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}
                              >
                                {hasData && (
                                  <div
                                    style={{
                                      width: `${ind.progress}%`,
                                      height: '100%',
                                      background: 'linear-gradient(90deg, #818cf899, #818cf8)',
                                      borderRadius: '3px',
                                      transition: 'width 0.7s ease-out',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

        </>
      )}

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .indicator-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .indicator-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 3px;
        }
        .indicator-scroll::-webkit-scrollbar-thumb {
          background: rgba(129,140,248,0.4);
          border-radius: 3px;
        }
        .indicator-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(129,140,248,0.6);
        }
      `}</style>
    </div>
  );
}

// Small KPI card helper
function KpiCard({
  label,
  icon,
  color,
  children,
}: {
  label: string;
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}30`,
        borderLeft: `3px solid ${color}`,
        borderRadius: '0.6rem',
        padding: '0.75rem',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>
        {icon} {label}
      </div>
      {children}
    </div>
  );
}
